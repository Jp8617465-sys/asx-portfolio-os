import os, io, time, json, glob
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
import requests
import psycopg2
from psycopg2.extras import execute_values
from fastapi import FastAPI, Header, HTTPException, Query, Request
from fastapi.openapi.utils import get_openapi
from dotenv import load_dotenv
from pydantic import BaseModel


load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]
EODHD_API_KEY = os.environ["EODHD_API_KEY"]
OS_API_KEY = os.environ["OS_API_KEY"]

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "outputs")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# --- Logging setup (daily rotation + compression) ---
import logging
from logging.handlers import TimedRotatingFileHandler
import gzip
import shutil

LOG_DIR = os.path.join(PROJECT_ROOT, "logs")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_PATH = os.path.join(LOG_DIR, "model_a.log")

logger = logging.getLogger("asx_portfolio_os")
logger.setLevel(logging.INFO)

# Custom compressor: gzip old logs
class GZipRotator:
    def __call__(self, source, dest):
        with open(source, "rb") as sf, gzip.open(dest + ".gz", "wb") as df:
            shutil.copyfileobj(sf, df)
        os.remove(source)

# Daily rotation (keeps 14 days)
file_handler = TimedRotatingFileHandler(
    LOG_PATH,
    when="midnight",    # Rotate every midnight
    interval=1,
    backupCount=14,     # Keep last 14 days of logs
    encoding="utf-8",
)
file_handler.suffix = "%Y-%m-%d"
file_handler.rotator = GZipRotator()

file_formatter = logging.Formatter(
    "%(asctime)s [%(levelname)s] %(message)s", "%Y-%m-%d %H:%M:%S"
)
file_handler.setFormatter(file_formatter)
logger.addHandler(file_handler)

# Console handler (still print to terminal)
console_handler = logging.StreamHandler()
console_handler.setFormatter(file_formatter)
logger.addHandler(console_handler)

logger.info("🔧 Logging initialized with daily rotation + gzip at %s", LOG_PATH)

app = FastAPI(title="ASX Portfolio OS", version="0.3.0")
@app.get("/")
def home():
    return {"message": "ASX Portfolio OS API is running ✅"}

@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info("➡️ %s %s", request.method, request.url.path)
    try:
        response = await call_next(request)
        logger.info("⬅️ %s %s", response.status_code, request.url.path)
        return response
    except Exception as e:
        logger.exception("💥 Exception during %s %s: %s", request.method, request.url.path, e)
        raise


def require_key(x_api_key: Optional[str]):
    if x_api_key != OS_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")


def db():
    return psycopg2.connect(DATABASE_URL)


@app.get("/health")
def health():
    return {"ok": True, "ts": datetime.utcnow().isoformat()}


@app.get("/debug/db_check")
def debug_db_check(x_api_key: Optional[str] = Header(default=None)):
    require_key(x_api_key)
    try:
        with db() as con, con.cursor() as cur:
            cur.execute("select current_database(), current_user")
            info = cur.fetchone()
            cur.execute("select now()")
            now = cur.fetchone()[0]
        return {
            "status": "ok",
            "database": info[0],
            "user": info[1],
            "now": now.isoformat() if now else None,
        }
    except Exception as e:
        logger.exception("DB check failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


class PropertyValuationReq(BaseModel):
    region: str = "Sydney"
    horizon_months: int = 12
    persist: bool = False
    train_model: bool = False


class LoanSimulateReq(BaseModel):
    principal: float
    annual_rate: float
    years: int
    extra_payment: float = 0.0
    persist: bool = False


@app.post("/property/valuation")
def property_valuation(req: PropertyValuationReq, x_api_key: Optional[str] = Header(default=None)):
    require_key(x_api_key)
    try:
        from jobs.property_module_template import (
            fetch_property_data,
            engineer_property_features,
            train_valuation_model,
            forecast_property_growth,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Property module import failed: {e}")

    df = fetch_property_data(req.region)
    df = engineer_property_features(df)
    if req.train_model:
        train_valuation_model(df)
    forecast = forecast_property_growth(df, horizon_months=req.horizon_months)
    df.to_csv("outputs/property_features_latest.csv", index=False)

    summary = {
        "region": req.region,
        "rows": int(len(df)),
        "avg_price": float(df["price"].mean()) if "price" in df.columns else None,
        "avg_yield": float(df["yield_est"].mean()) if "yield_est" in df.columns else None,
        "forecast_multiplier": float(forecast) if forecast is not None else None,
    }

    if req.persist:
        with db() as con, con.cursor() as cur:
            cur.execute(
                """
                insert into property_assets (region, avg_price, avg_yield, sample_count)
                values (%s, %s, %s, %s)
                """,
                (summary["region"], summary["avg_price"], summary["avg_yield"], summary["rows"]),
            )
            con.commit()

    return {"status": "ok", "summary": summary}


@app.post("/loan/simulate")
def loan_simulate(req: LoanSimulateReq, x_api_key: Optional[str] = Header(default=None)):
    require_key(x_api_key)
    try:
        from jobs.loan_simulator import loan_amortization
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Loan module import failed: {e}")

    schedule = loan_amortization(req.principal, req.annual_rate, req.years, req.extra_payment)
    monthly_payment = schedule["principal_paid"].iloc[0] + schedule["interest"].iloc[0]
    total_interest = float(schedule["interest"].sum())

    if req.persist:
        with db() as con, con.cursor() as cur:
            cur.execute(
                """
                insert into loan_accounts (principal, annual_rate, years, extra_payment, monthly_payment, total_interest)
                values (%s, %s, %s, %s, %s, %s)
                """,
                (
                    float(req.principal),
                    float(req.annual_rate),
                    int(req.years),
                    float(req.extra_payment),
                    float(monthly_payment),
                    float(total_interest),
                ),
            )
            con.commit()

    return {
        "status": "ok",
        "monthly_payment": float(monthly_payment),
        "total_interest": float(total_interest),
        "months": int(len(schedule)),
        "preview": schedule.head(6).to_dict(orient="records"),
    }


# -------------------------
# Refresh universe
# -------------------------
@app.post("/refresh/universe")
def refresh_universe(x_api_key: Optional[str] = Header(default=None)):
    """
    Refresh the ASX universe list from EODHD API and store it in the database.
    """
    require_key(x_api_key)

    logger.info("🚀 Starting universe refresh from EODHD")

    url = f"https://eodhd.com/api/exchange-symbol-list/AU?api_token={EODHD_API_KEY}&fmt=csv"
    r = requests.get(url, timeout=60)

    if r.status_code != 200:
        snippet = (r.text or "")[:300].replace("\n", " ")
        raise HTTPException(status_code=502, detail=f"EODHD universe error {r.status_code}: {snippet}")

    df = pd.read_csv(io.StringIO(r.text))
    cols = {c.lower(): c for c in df.columns}
    code_col = cols.get("code") or cols.get("symbol") or list(df.columns)[0]
    name_col = cols.get("name")
    type_col = cols.get("type")
    ccy_col = cols.get("currency")

    out = pd.DataFrame({
        "symbol": df[code_col].astype(str).str.strip() + ".AU",
        "name": df[name_col] if name_col else None,
        "exchange": "AU",
        "type": df[type_col] if type_col else None,
        "currency": df[ccy_col] if ccy_col else "AUD",
        "updated_at": datetime.utcnow(),
    }).dropna(subset=["symbol"])

    rows = [tuple(x) for x in out[["symbol","name","exchange","type","currency","updated_at"]].itertuples(index=False, name=None)]

    with db() as con, con.cursor() as cur:
        cur.execute("delete from universe where exchange='AU'")
        execute_values(
            cur,
            """
            insert into universe (symbol,name,exchange,type,currency,updated_at)
            values %s
            on conflict (symbol) do update set
              name=excluded.name,
              exchange=excluded.exchange,
              type=excluded.type,
              currency=excluded.currency,
              updated_at=excluded.updated_at
            """,
            rows
        )
        con.commit()
        cur.execute("select count(*) from universe where exchange='AU'")
        n = cur.fetchone()[0]
        return {"status": "ok", "universe_count": int(n)}




# -------------------------
# Refresh last day prices (bulk)
# -------------------------
@app.post("/refresh/prices/last_day")
def refresh_prices_last_day(x_api_key: Optional[str] = Header(default=None)):
    require_key(x_api_key)

    url = f"https://eodhd.com/api/eod-bulk-last-day/AU?api_token={EODHD_API_KEY}&fmt=csv"
    r = requests.get(url, timeout=180)
    if r.status_code != 200:
        snippet = (r.text or "")[:300].replace("\n", " ")
        raise HTTPException(status_code=502, detail=f"EODHD bulk error {r.status_code}: {snippet}")

    df = pd.read_csv(io.StringIO(r.text))
    cols = {c.lower(): c for c in df.columns}
    dt_col = cols.get("date")
    code_col = cols.get("code") or cols.get("symbol")
    if not dt_col or not code_col:
        raise HTTPException(status_code=502, detail=f"Unexpected bulk columns: {list(df.columns)[:20]}")

    def get(name: str):
        return cols.get(name)

    out = pd.DataFrame({
        "dt": pd.to_datetime(df[dt_col]).dt.date,
        "symbol": df[code_col].astype(str).str.strip() + ".AU",
        "open": df[get("open")] if get("open") else None,
        "high": df[get("high")] if get("high") else None,
        "low":  df[get("low")]  if get("low")  else None,
        "close":df[get("close")]if get("close")else None,
        "volume":df[get("volume")]if get("volume")else None,
    }).dropna(subset=["dt","symbol","close"])

    day = out["dt"].iloc[0]

    # Filter to universe symbols (avoids FK issues)
    with db() as con, con.cursor() as cur:
        cur.execute("select symbol from universe where exchange='AU'")
        allowed = set(r[0] for r in cur.fetchall())

    out = out[out["symbol"].isin(allowed)]
    rows = [tuple(x) for x in out[["dt","symbol","open","high","low","close","volume"]].itertuples(index=False, name=None)]

    with db() as con, con.cursor() as cur:
        cur.execute("delete from prices where dt = %s", (day,))
        if rows:
            execute_values(
                cur,
                """
                insert into prices (dt,symbol,open,high,low,close,volume)
                values %s
                on conflict (dt,symbol) do update set
                  open=excluded.open, high=excluded.high, low=excluded.low,
                  close=excluded.close, volume=excluded.volume
                """,
                rows
            )
        con.commit()
        cur.execute("select count(*) from prices where dt = %s", (day,))
        n = cur.fetchone()[0]

    return {"status":"ok", "date": str(day), "rows": int(n)}


@app.post("/refresh/prices/live")
def refresh_prices_live(x_api_key: Optional[str] = Header(default=None)):
    """
    Alias to refresh last-day prices (used by daily sync jobs).
    """
    return refresh_prices_last_day(x_api_key=x_api_key)


@app.post("/refresh/macro/latest")
def refresh_macro_latest(x_api_key: Optional[str] = Header(default=None)):
    require_key(x_api_key)
    try:
        from jobs.load_macro import main as load_macro_main
        load_macro_main()
        return {"status": "ok"}
    except SystemExit as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/refresh/sentiment")
def refresh_sentiment(x_api_key: Optional[str] = Header(default=None)):
    require_key(x_api_key)
    try:
        from jobs.load_sentiment import main as load_sentiment_main
        load_sentiment_main()
        return {"status": "ok"}
    except SystemExit as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/refresh/etfdata")
def refresh_etfdata(x_api_key: Optional[str] = Header(default=None)):
    require_key(x_api_key)
    try:
        from jobs.load_etf_data import main as load_etf_main
        load_etf_main()
        return {"status": "ok"}
    except SystemExit as exc:
        raise HTTPException(status_code=400, detail=str(exc))


# -------------------------
# Backfill prices (bulk-by-date)
# -------------------------
class BackfillReq(BaseModel):
    from_date: str
    to_date: str
    sleep_seconds: float = 0.2

@app.post("/backfill/prices")
def backfill_prices(req: BackfillReq, x_api_key: Optional[str] = Header(default=None)):
    require_key(x_api_key)

    start = datetime.strptime(req.from_date, "%Y-%m-%d").date()
    end = datetime.strptime(req.to_date, "%Y-%m-%d").date()
    if end < start:
        raise HTTPException(status_code=400, detail="to_date must be >= from_date")

    with db() as con, con.cursor() as cur:
        cur.execute("select symbol from universe where exchange='AU'")
        allowed = set(r[0] for r in cur.fetchall())

    total_days = 0
    total_rows = 0
    skipped_days = 0

    d = start
    while d <= end:
        total_days += 1
        url = f"https://eodhd.com/api/eod-bulk-last-day/AU?api_token={EODHD_API_KEY}&fmt=csv&date={d.isoformat()}"
        r = requests.get(url, timeout=180)

        if r.status_code != 200:
            skipped_days += 1
            d += timedelta(days=1)
            time.sleep(req.sleep_seconds)
            continue

        try:
            df = pd.read_csv(io.StringIO(r.text))
        except Exception:
            skipped_days += 1
            d += timedelta(days=1)
            time.sleep(req.sleep_seconds)
            continue

        cols = {c.lower(): c for c in df.columns}
        dt_col = cols.get("date")
        code_col = cols.get("code") or cols.get("symbol")
        if not dt_col or not code_col:
            skipped_days += 1
            d += timedelta(days=1)
            time.sleep(req.sleep_seconds)
            continue

        def get(name: str):
            return cols.get(name)

        out = pd.DataFrame({
            "dt": pd.to_datetime(df[dt_col]).dt.date,
            "symbol": df[code_col].astype(str).str.strip() + ".AU",
            "open": df[get("open")] if get("open") else None,
            "high": df[get("high")] if get("high") else None,
            "low":  df[get("low")]  if get("low")  else None,
            "close":df[get("close")]if get("close")else None,
            "volume":df[get("volume")]if get("volume")else None,
        }).dropna(subset=["dt","symbol","close"])

        out = out[out["symbol"].isin(allowed)]
        if out.empty:
            skipped_days += 1
            d += timedelta(days=1)
            time.sleep(req.sleep_seconds)
            continue

        day = out["dt"].iloc[0]
        rows = [tuple(x) for x in out[["dt","symbol","open","high","low","close","volume"]].itertuples(index=False, name=None)]

        with db() as con, con.cursor() as cur:
            cur.execute("delete from prices where dt = %s", (day,))
            execute_values(
                cur,
                """
                insert into prices (dt,symbol,open,high,low,close,volume)
                values %s
                on conflict (dt,symbol) do update set
                  open=excluded.open, high=excluded.high, low=excluded.low,
                  close=excluded.close, volume=excluded.volume
                """,
                rows
            )
            con.commit()

        total_rows += len(rows)
        d += timedelta(days=1)
        time.sleep(req.sleep_seconds)

    return {
        "status":"ok",
        "from": start.isoformat(),
        "to": end.isoformat(),
        "total_days_iterated": total_days,
        "skipped_days": skipped_days,
        "rows_inserted": total_rows
    }


# -------------------------
# Model A v1.1 helpers
# -------------------------
def _zscore(s: pd.Series) -> pd.Series:
    return (s - s.mean()) / (s.std(ddof=0) + 1e-12)

def _cap_weights(w: pd.Series, max_w: float) -> pd.Series:
    w = w.copy()
    for _ in range(10):
        over = w > max_w
        if not over.any():
            break
        excess = float((w[over] - max_w).sum())
        w[over] = max_w
        under = ~over
        if under.any() and float(w[under].sum()) > 0:
            w[under] = w[under] + excess * (w[under] / w[under].sum())
        else:
            break
    if float(w.sum()) > 0:
        w = w / w.sum()
    return w

def _justify_row(r: pd.Series, adv_floor: float, min_price: float) -> str:
    parts = []
    parts.append(f"Rank {int(r['rank'])}, score {r['score']:.2f}.")
    parts.append(f"Momentum: 12–1 {r['mom_12_1']*100:.1f}%, 6M {r['mom_6']*100:.1f}%.")
    parts.append(f"Trend quality: above 200D MA={bool(r['trend_200'])}, 200D slope positive={bool(r['sma200_slope_pos'])}.")
    parts.append(f"Liquidity: ADV$20 median ${r['adv_20_median']/1e6:.1f}M vs ${adv_floor/1e6:.1f}M floor.")
    parts.append(f"Volatility: 90D daily vol {r['vol_90']*100:.2f}%.")
    parts.append(f"Price ${r['price']:.2f} (min ${min_price:.2f}).")
    parts.append(f"Target weight {r['target_weight']*100:.2f}% (post caps/vol targeting).")
    return " ".join(parts)


class ModelAV11Req(BaseModel):
    as_of: str
    adv_floor: float = 30_000_000.0
    min_price: float = 5.0
    n_holdings: int = 80
    max_weight: float = 0.0275
    target_vol_annual: float = 0.09
    w_mom_12_1: float = 0.75
    w_mom_6: float = 0.25
    vol_lookback: int = 90
    adv_lookback: int = 20
    sma_lookback: int = 200
    sma_slope_lag: int = 20
    model: str = "model_a_v1_1"


class ModelSignalsPersistReq(BaseModel):
    model: str
    as_of: str
    signals: List[Dict[str, Any]]


class ModelRegistryReq(BaseModel):
    model_name: str
    version: Optional[str] = None
    run_id: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None
    features: Optional[List[str]] = None
    artifacts: Optional[Dict[str, Any]] = None


class DriftAuditReq(BaseModel):
    model: str
    baseline_label: str
    current_label: str
    metrics: Dict[str, Any]


@app.post("/run/model_a_v1_1")
def run_model_a_v1_1(req: ModelAV11Req, x_api_key: Optional[str] = Header(default=None)):
    """
    Run Model A v1.1 - calculate ranked portfolio signals.
    Returns JSON output (ranked results, metrics, etc.)
    """
    require_key(x_api_key)
    started = datetime.utcnow()
    as_of = datetime.strptime(req.as_of, "%Y-%m-%d").date()
    start = as_of - timedelta(days=520)  # enough history for 12–1 + SMA200

    logger.info("🟢 Starting Model A v1.1 run for %s", as_of)

    try:
        with db() as con:
            px = pd.read_sql(
                """
                select dt, symbol, close, volume
                from prices
                where dt >= %s and dt <= %s
                order by symbol, dt
                """,
                con,
                params=(start, as_of),
            )
    except Exception as e:
        logger.error("❌ DB query failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    if px.empty:
        raise HTTPException(status_code=400, detail="No prices found. Run backfill first.")

    px["dt"] = pd.to_datetime(px["dt"])
    px = px.sort_values(["symbol", "dt"])
    px["ret1"] = px.groupby("symbol")["close"].pct_change()

    # --- Feature calculations ---
    px["adv_20_median"] = (px["close"] * px["volume"]).groupby(px["symbol"]).rolling(req.adv_lookback).median().reset_index(level=0, drop=True)
    px["vol_90"] = px.groupby("symbol")["ret1"].rolling(req.vol_lookback).std().reset_index(level=0, drop=True)

    sma200 = px.groupby("symbol")["close"].rolling(req.sma_lookback).mean().reset_index(level=0, drop=True)
    sma200_lag = sma200.groupby(px["symbol"]).shift(req.sma_slope_lag)
    px["trend_200"] = px["close"] > sma200
    px["sma200_slope_pos"] = sma200 > sma200_lag
    px["trend_quality"] = px["trend_200"] & px["sma200_slope_pos"]

    px["mom_6"] = px.groupby("symbol")["close"].pct_change(126)
    close_lag_21 = px.groupby("symbol")["close"].shift(21)
    close_lag_252 = px.groupby("symbol")["close"].shift(252)
    px["mom_12_1"] = (close_lag_21 / close_lag_252) - 1.0

    # --- Latest snapshot ---
    latest = px.groupby("symbol").tail(1).copy()
    latest = latest[latest["dt"].dt.date == as_of]

    # --- Filters ---
    total = len(latest)
    required_cols = ["mom_6", "mom_12_1", "vol_90", "adv_20_median", "close", "trend_quality"]
    mask_notna = latest[required_cols].notna().all(axis=1)
    mask_adv = latest["adv_20_median"] >= req.adv_floor
    mask_price = latest["close"] >= req.min_price
    mask_trend = latest["trend_quality"] == True

    latest = latest[mask_notna & mask_adv & mask_price & mask_trend]

    if latest.empty:
        counts = {
            "total": int(total),
            "after_notna": int(mask_notna.sum()),
            "after_adv_floor": int((mask_notna & mask_adv).sum()),
            "after_min_price": int((mask_notna & mask_adv & mask_price).sum()),
            "after_trend_quality": int((mask_notna & mask_adv & mask_price & mask_trend).sum()),
            "adv_floor": float(req.adv_floor),
            "min_price": float(req.min_price),
        }
        logger.info("No symbols passed gates: %s", counts)
        raise HTTPException(status_code=400, detail={"error": "No symbols passed gates", "counts": counts})

    # --- Scoring & ranking ---
    latest["score"] = req.w_mom_12_1 * _zscore(latest["mom_12_1"]) + req.w_mom_6 * _zscore(latest["mom_6"])
    ranked = latest.sort_values("score", ascending=False).copy()
    ranked["rank"] = range(1, len(ranked) + 1)

    # --- Portfolio targeting ---
    target = ranked.head(req.n_holdings).copy()
    inv = 1.0 / (target["vol_90"] + 1e-12)
    w = inv / inv.sum()
    w = _cap_weights(w, req.max_weight)
    target["weight_raw"] = w

    sel = px[px["symbol"].isin(target["symbol"])].copy()
    rets = sel.pivot(index="dt", columns="symbol", values="ret1").tail(req.vol_lookback)
    valid = rets.notna().sum() >= int(0.8 * req.vol_lookback)
    rets = rets.loc[:, valid].dropna()
    target = target[target["symbol"].isin(rets.columns)].copy()

    if target.empty:
        raise HTTPException(status_code=400, detail="Not enough valid history for vol targeting.")

    w_vec = target.set_index("symbol")["weight_raw"].reindex(rets.columns).fillna(0.0).values
    cov = np.cov(rets.values, rowvar=False)
    port_vol_daily = float(np.sqrt(w_vec.T @ cov @ w_vec))
    port_vol_annual = port_vol_daily * np.sqrt(252.0)

    scale = 1.0 if port_vol_annual == 0 else min(1.0, req.target_vol_annual / port_vol_annual)
    target["target_weight"] = target["weight_raw"] * scale
    cash_weight = 1.0 - float(target["target_weight"].sum())

    # --- Diagnostics ---
    summary = {
        "as_of": req.as_of,
        "n_holdings": len(target),
        "eligible": len(ranked),
        "portfolio_vol": port_vol_annual,
        "cash_weight": cash_weight,
        "scale": scale,
        "started_at": started.isoformat(),
        "finished_at": datetime.utcnow().isoformat(),
        "warnings": [],
    }

    if cash_weight > 0.25:
        summary["warnings"].append(f"High cash ({cash_weight*100:.1f}%) due to vol targeting.")
    if len(target) < req.n_holdings:
        summary["warnings"].append(f"Only {len(target)} names passed filters.")

    logger.info("✅ Model A v1.1 finished with %d holdings", len(target))

    # --- Final JSON return ---
    return {
        "status": "ok",
        "as_of": req.as_of,
        "n_holdings": len(target),
        "n_replacements": 0,
        "turnover_pct": None,
        "portfolio_vol": port_vol_annual,
        "drawdown": None,
        "risk_regime": "neutral",
        "ranked": ranked.head(200).to_dict(orient="records"),
        "summary": summary,
    }

@app.post("/run/model_a_v1_1_persist")
def run_model_a_v1_1_persist(
    req: ModelAV11Req, 
    x_api_key: Optional[str] = Header(default=None)
):
    """
    Run Model A v1.1 and persist both summary + ranked outputs into Supabase.
    """
    require_key(x_api_key)
    started = datetime.utcnow()
    logger.info("🚀 Starting Model A persist run for %s", req.as_of)

    # Run the model locally to avoid HTTP/port coupling
    try:
        data = run_model_a_v1_1(req, x_api_key=x_api_key)
        if not isinstance(data, dict):
            raise HTTPException(status_code=500, detail=f"Model A base call returned empty or invalid data: {type(data)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model A run failed: {e}")


    # Parse model outputs
    as_of = req.as_of
    n_holdings = int(data.get("n_holdings", 0) or 0)
    n_replacements = int(data.get("n_replacements", 0) or 0)
    turnover = data.get("turnover_pct", None)
    port_vol = data.get("portfolio_vol", None)
    drawdown = data.get("drawdown", None)
    regime = data.get("risk_regime", "unknown")

    # Normalize numpy scalars to native Python types for psycopg2
    port_vol = float(port_vol) if port_vol is not None else None
    drawdown = float(drawdown) if drawdown is not None else None
    turnover = float(turnover) if turnover is not None else None

    ranked = pd.DataFrame(data.get("ranked", []))

    # Store to Supabase
    with db() as con, con.cursor() as cur:
        # Insert summary row
        cur.execute("""
            insert into model_a_runs (
                as_of, n_holdings, n_replacements, turnover_pct, portfolio_vol, drawdown, risk_regime
            ) values (%s,%s,%s,%s,%s,%s,%s)
            on conflict (as_of) do update set
                n_holdings = excluded.n_holdings,
                n_replacements = excluded.n_replacements,
                turnover_pct = excluded.turnover_pct,
                portfolio_vol = excluded.portfolio_vol,
                drawdown = excluded.drawdown,
                risk_regime = excluded.risk_regime
            returning run_id;
        """, (as_of, n_holdings, n_replacements, turnover, port_vol, drawdown, regime))
        run_id = cur.fetchone()[0]

        # Delete previous ranked results for this run (if any)
        cur.execute("delete from model_a_ranked where run_id = %s;", (run_id,))

        # Insert ranked rows
        for _, r in ranked.iterrows():
            cur.execute("""
                insert into model_a_ranked (
                    run_id, rank, symbol, momentum_12_1, momentum_6, adv_20d, vol_90d, 
                    weight, sector, justification, as_of
                ) values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, (
                run_id,
                int(r.get("rank", 0)),
                r.get("symbol"),
                r.get("momentum_12_1"),
                r.get("momentum_6"),
                r.get("adv_20d"),
                r.get("vol_90d"),
                r.get("weight"),
                r.get("sector"),
                r.get("justification"),
                as_of
            ))
    finished = datetime.utcnow()
    runtime = (finished - started).total_seconds()
    logger.info("✅ Model A persist run completed in %.2f seconds", runtime)
    return {"status": "ok", "as_of": as_of, "n_rows": len(ranked)}

    if px.empty:
        raise HTTPException(status_code=400, detail="No prices found. Run backfill first.")

    px["dt"] = pd.to_datetime(px["dt"])
    px = px.sort_values(["symbol", "dt"])
    px["ret1"] = px.groupby("symbol")["close"].pct_change()

    # ADV$ (20D rolling median)
    dollar_vol = px["close"] * px["volume"]
    px["adv_20_median"] = dollar_vol.groupby(px["symbol"]).rolling(req.adv_lookback).median().reset_index(level=0, drop=True)

    # Vol 90D
    px["vol_90"] = px.groupby("symbol")["ret1"].rolling(req.vol_lookback).std().reset_index(level=0, drop=True)

    # SMA200 and slope
    sma200 = px.groupby("symbol")["close"].rolling(req.sma_lookback).mean().reset_index(level=0, drop=True)
    sma200_lag = sma200.groupby(px["symbol"]).shift(req.sma_slope_lag)

    px["trend_200"] = px["close"] > sma200
    px["sma200_slope_pos"] = sma200 > sma200_lag
    px["trend_quality"] = px["trend_200"] & px["sma200_slope_pos"]

    # Momentum
    px["mom_6"] = px.groupby("symbol")["close"].pct_change(126)
    close_lag_21 = px.groupby("symbol")["close"].shift(21)
    close_lag_252 = px.groupby("symbol")["close"].shift(252)
    px["mom_12_1"] = (close_lag_21 / close_lag_252) - 1.0

    # Latest per symbol, and require it matches as_of
    latest = px.groupby("symbol").tail(1).copy()
    latest = latest[latest["dt"].dt.date == as_of]

    # Gates
    latest = latest.dropna(subset=["mom_6","mom_12_1","vol_90","adv_20_median","close","trend_quality"])
    latest = latest[latest["adv_20_median"] >= req.adv_floor]
    latest = latest[latest["close"] >= req.min_price]
    latest = latest[latest["trend_quality"] == True]

    if latest.empty:
        raise HTTPException(status_code=400, detail="No symbols passed gates. Lower adv_floor/min_price or confirm coverage on as_of date.")

    # Score
    latest["score"] = req.w_mom_12_1 * _zscore(latest["mom_12_1"]) + req.w_mom_6 * _zscore(latest["mom_6"])
    ranked = latest.sort_values("score", ascending=False).copy()
    ranked["rank"] = range(1, len(ranked) + 1)

    # Targets
    target = ranked.head(req.n_holdings).copy()

    # Weights: inverse vol + cap
    inv = 1.0 / (target["vol_90"] + 1e-12)
    w = inv / inv.sum()
    w = _cap_weights(w, req.max_weight)
    target["weight_raw"] = w

    # Vol targeting using covariance from last vol_lookback returns
    sel = px[px["symbol"].isin(target["symbol"])].copy()
    rets = sel.pivot(index="dt", columns="symbol", values="ret1").tail(req.vol_lookback)

    # keep symbols with >=80% data
    valid = rets.notna().sum() >= int(0.8 * req.vol_lookback)
    rets = rets.loc[:, valid].dropna()

    target = target[target["symbol"].isin(rets.columns)].copy()
    if target.empty or rets.shape[1] < 5:
        raise HTTPException(status_code=400, detail="Not enough return history for vol targeting. Try a nearby as_of or verify backfill depth.")

    w_vec = target.set_index("symbol")["weight_raw"].reindex(rets.columns).fillna(0.0).values
    cov = np.cov(rets.values, rowvar=False)
    port_vol_daily = float(np.sqrt(w_vec.T @ cov @ w_vec))
    port_vol_annual = port_vol_daily * np.sqrt(252.0)

    scale = 1.0
    if port_vol_annual > 0:
        scale = min(1.0, req.target_vol_annual / port_vol_annual)

    target["target_weight"] = target["weight_raw"] * scale
    cash_weight = 1.0 - float(target["target_weight"].sum())

    # Persist signals (idempotent)
    # Join universe name for nicer dashboard
    with db() as con, con.cursor() as cur:
        cur.execute("delete from signals where as_of=%s and model=%s", (as_of, req.model))
        rows = []
        for r in target.itertuples(index=False):
            rows.append((
                as_of, r.symbol, req.model,
                float(r.score), int(r.rank), float(r.target_weight),
                float(r.mom_12_1), float(r.mom_6),
                bool(r.trend_200), bool(r.sma200_slope_pos),
                float(r.adv_20_median), float(r.vol_90), float(r.close)
            ))
        execute_values(
            cur,
            """
            insert into signals (
              as_of, symbol, model,
              score, rank, target_weight,
              mom_12_1, mom_6,
              trend_200, sma200_slope_pos,
              adv_20_median, vol_90, price
            ) values %s
            """,
            rows
        )
        con.commit()

    # Write outputs
    ranked_path = os.path.join(OUTPUT_DIR, f"ranked_{req.model}_{as_of.isoformat()}.csv")
    targets_path = os.path.join(OUTPUT_DIR, f"targets_{req.model}_{as_of.isoformat()}.csv")
    paper_path = os.path.join(OUTPUT_DIR, f"paper_rebalance_{req.model}_{as_of.isoformat()}.csv")
    meta_path = os.path.join(OUTPUT_DIR, f"dashboard_meta_{req.model}_{as_of.isoformat()}.json")

    ranked.to_csv(ranked_path, index=False)

    out_targets = target[[
        "symbol","target_weight","score","rank",
        "mom_12_1","mom_6","trend_200","sma200_slope_pos",
        "adv_20_median","vol_90","close"
    ]].copy()
    out_targets.rename(columns={"close":"price"}, inplace=True)
    out_targets.to_csv(targets_path, index=False)

    paper = out_targets[["symbol","target_weight"]].copy()
    paper["current_weight"] = 0.0
    paper["delta_weight"] = paper["target_weight"] - paper["current_weight"]
    paper.to_csv(paper_path, index=False)

    warnings = []
    if cash_weight > 0.25:
        warnings.append(f"High cash weight ({cash_weight*100:.1f}%) due to vol targeting.")
    if len(out_targets) < req.n_holdings:
        warnings.append(f"Only {len(out_targets)} targets produced (filters may be tight).")

    meta = {
        "as_of": as_of.isoformat(),
        "model": req.model,
        "generated_at_utc": datetime.utcnow().isoformat(),
        "params": req.dict(),
        "eligible_ranked": int(len(ranked)),
        "n_holdings": int(len(out_targets)),
        "port_vol_annual_est": port_vol_annual,
        "scale": scale,
        "cash_weight": cash_weight,
        "files": {"ranked": ranked_path, "targets": targets_path, "paper": paper_path},
        "warnings": warnings,
        "started_at_utc": started.isoformat(),
        "finished_at_utc": datetime.utcnow().isoformat(),
    }
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)

    # Audit run
    try:
        with db() as con, con.cursor() as cur:
            cur.execute(
                "insert into runs (run_type, model, as_of, finished_at, status, details) values (%s,%s,%s,now(),%s,%s::jsonb)",
                ("run_model_a_v1_1", req.model, as_of, "ok", json.dumps(meta))
            )
            con.commit()
    except Exception:
        pass

    return meta


# -------------------------
# Dashboard pack endpoint (DETAILED)
# -------------------------
@app.get("/dashboard/model_a_v1_1")
def dashboard_model_a_v1_1(
    as_of: str = Query(..., description="YYYY-MM-DD"),
    model: str = Query("model_a_v1_1"),
    include_ranked_preview: bool = Query(True),
    ranked_preview_n: int = Query(200, ge=50, le=2000),
    include_justifications: bool = Query(True),
    x_api_key: Optional[str] = Header(default=None),
):
    require_key(x_api_key)
    as_of_d = datetime.strptime(as_of, "%Y-%m-%d").date()
    meta_path = os.path.join(OUTPUT_DIR, f"dashboard_meta_{model}_{as_of}.json")
    meta = None
    if os.path.exists(meta_path):
        with open(meta_path, "r") as f:
            meta = json.load(f)

    with db() as con:
        sig = pd.read_sql(
            """
            select s.*, u.name
            from signals s
            left join universe u on u.symbol = s.symbol
            where s.as_of = %s and s.model = %s
            order by s.rank asc
            """,
            con,
            params=(as_of_d, model)
        )

    if sig.empty:
        raise HTTPException(status_code=404, detail="No signals found for this as_of/model. Run /run/model_a_v1_1 first.")

    # Distributions
    def q(series):
        return {
            "min": float(series.min()),
            "p10": float(series.quantile(0.10)),
            "p25": float(series.quantile(0.25)),
            "median": float(series.quantile(0.50)),
            "p75": float(series.quantile(0.75)),
            "p90": float(series.quantile(0.90)),
            "max": float(series.max()),
        }

    dist = {
        "mom_12_1": q(sig["mom_12_1"]),
        "mom_6": q(sig["mom_6"]),
        "adv_20_median": q(sig["adv_20_median"]),
        "vol_90": q(sig["vol_90"]),
        "target_weight": q(sig["target_weight"]),
        "score": q(sig["score"]),
    }

    # Concentration checks
    top10_weight = float(sig["target_weight"].head(10).sum())
    top20_weight = float(sig["target_weight"].head(20).sum())
    n_at_cap = int((sig["target_weight"] >= (sig["target_weight"].max() - 1e-9)).sum())

    warnings = []
    if top10_weight > 0.30:
        warnings.append(f"Top 10 concentration is {top10_weight*100:.1f}% (consider tighter max weight or sector caps once sector data is added).")
    if n_at_cap > 20:
        warnings.append(f"{n_at_cap} names appear near the max weight cap; portfolio may be vol-limited or cap-limited.")

    # Build detailed target list with justifications
    targets = sig.copy()
    targets["price"] = targets["price"].astype(float)

    # Use params from meta if available
    adv_floor = float(meta["params"]["adv_floor"]) if meta and "params" in meta else 30_000_000.0
    min_price = float(meta["params"]["min_price"]) if meta and "params" in meta else 5.0

    if include_justifications:
        targets["justification"] = targets.apply(lambda r: _justify_row(r, adv_floor, min_price), axis=1)

    # Ranked preview: since we only store top N in signals right now, we provide preview from CSV if available
    ranked_preview = None
    if include_ranked_preview:
        ranked_path = os.path.join(OUTPUT_DIR, f"ranked_{model}_{as_of}.csv")
        if os.path.exists(ranked_path):
            rp = pd.read_csv(ranked_path).head(ranked_preview_n)
            ranked_preview = rp.to_dict(orient="records")

    # Optional status payload (registry + signals + drift)
    status = None
    try:
        with db() as con, con.cursor() as cur:
            cur.execute(
                """
                select id, model_name, version, metrics, features, artifacts, created_at
                from model_registry
                where model_name = %s
                order by created_at desc
                limit 1
                """,
                ("model_a_ml",),
            )
            reg = cur.fetchone()
            cur.execute(
                """
                select as_of, count(*)
                from model_a_ml_signals
                where model = %s
                group by as_of
                order by as_of desc
                limit 1
                """,
                ("model_a_ml",),
            )
            sig = cur.fetchone()
            cur.execute(
                """
                select id, baseline_label, current_label, metrics, created_at
                from model_a_drift_audit
                where model = %s
                order by created_at desc
                limit 1
                """,
                ("model_a_ml",),
            )
            drift = cur.fetchone()

        status = {"model": "model_a_ml"}
        if reg:
            status["registry"] = {
                "id": int(reg[0]),
                "version": reg[2],
                "metrics": reg[3],
                "features": reg[4],
                "artifacts": reg[5],
                "created_at": reg[6].isoformat() if reg[6] else None,
            }
        if sig:
            status["signals"] = {
                "as_of": sig[0].isoformat() if sig[0] else None,
                "row_count": int(sig[1]),
            }
        if drift:
            status["drift"] = {
                "id": int(drift[0]),
                "baseline_label": drift[1],
                "current_label": drift[2],
                "metrics": drift[3],
                "created_at": drift[4].isoformat() if drift[4] else None,
            }
    except Exception as e:
        status = {"model": "model_a_ml", "error": str(e)}

    dashboard = {
        "as_of": as_of,
        "model": model,
        "generated_at_utc": datetime.utcnow().isoformat(),
        "run_meta": meta,
        "summary": {
            "n_targets": int(len(sig)),
            "top10_weight": top10_weight,
            "top20_weight": top20_weight,
            "n_at_cap_proxy": n_at_cap,
        },
        "distributions": dist,
        "warnings": (meta["warnings"] if meta and "warnings" in meta else []) + warnings,
        "targets": targets.to_dict(orient="records"),
        "ranked_preview": ranked_preview,
        "status": status,
    }
    return dashboard


@app.get("/openapi-actions.json", include_in_schema=False)
def openapi_actions(request: Request):
    schema = get_openapi(
        title=app.title,
        version=app.version,
        routes=app.routes,
    )

    # Dynamic base URL for Actions (Cloudflare host)
    host = request.headers.get("host")
    if host:
        schema["servers"] = [{"url": f"https://{host}"}]
    else:
        schema["servers"] = [{"url": "http://127.0.0.1:8788"}]

    # Declare API-key auth so the Actions UI knows header + location
    schema.setdefault("components", {}).setdefault("securitySchemes", {})
    schema["components"]["securitySchemes"]["ApiKeyAuth"] = {
        "type": "apiKey",
        "in": "header",
        "name": "x-api-key",
    }

    # OPTIONAL (recommended): only expose safe endpoints to GPT Actions
    allowed_paths = {
        "/health",
        "/dashboard/model_a_v1_1",
        "/model/status/summary",
        "/model/compare",
        "/signals/live",
        "/property/valuation",
        "/loan/simulate",
    }
    schema["paths"] = {p: v for p, v in schema["paths"].items() if p in allowed_paths}

    # Apply security: dashboard needs key, health doesn't
    for path, ops in schema["paths"].items():
        for op in ops.values():
            if path == "/health":
                op["security"] = []
            else:
                op["security"] = [{"ApiKeyAuth": []}]

    return schema


# -------------------------
# Model registry & ML signals persistence
# -------------------------
@app.post("/persist/ml_signals")
def persist_ml_signals(req: ModelSignalsPersistReq, x_api_key: Optional[str] = Header(default=None)):
    require_key(x_api_key)

    rows = []
    for s in req.signals:
        rows.append((
            req.as_of,
            req.model,
            s.get("symbol"),
            int(s.get("rank")) if s.get("rank") is not None else None,
            float(s.get("score")) if s.get("score") is not None else None,
            float(s.get("ml_prob")) if s.get("ml_prob") is not None else None,
            float(s.get("ml_expected_return")) if s.get("ml_expected_return") is not None else None,
        ))

    with db() as con, con.cursor() as cur:
        execute_values(
            cur,
            """
            insert into model_a_ml_signals (as_of, model, symbol, rank, score, ml_prob, ml_expected_return)
            values %s
            on conflict (as_of, model, symbol) do update set
              rank = excluded.rank,
              score = excluded.score,
              ml_prob = excluded.ml_prob,
              ml_expected_return = excluded.ml_expected_return
            """,
            rows
        )
        con.commit()

    return {"status": "ok", "rows": len(rows)}


@app.post("/registry/model_run")
def register_model_run(req: ModelRegistryReq, x_api_key: Optional[str] = Header(default=None)):
    require_key(x_api_key)

    with db() as con, con.cursor() as cur:
        cur.execute(
            """
            insert into model_registry (model_name, version, run_id, metrics, features, artifacts)
            values (%s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb)
            returning id
            """,
            (
                req.model_name,
                req.version,
                req.run_id,
                json.dumps(req.metrics or {}),
                json.dumps(req.features or []),
                json.dumps(req.artifacts or {}),
            ),
        )
        new_id = cur.fetchone()[0]
        con.commit()

    return {"status": "ok", "id": int(new_id)}


@app.post("/drift/audit")
def persist_drift_audit(req: DriftAuditReq, x_api_key: Optional[str] = Header(default=None)):
    require_key(x_api_key)

    with db() as con, con.cursor() as cur:
        cur.execute(
            """
            insert into model_a_drift_audit (model, baseline_label, current_label, metrics)
            values (%s, %s, %s, %s::jsonb)
            returning id
            """,
            (req.model, req.baseline_label, req.current_label, json.dumps(req.metrics)),
        )
        new_id = cur.fetchone()[0]
        con.commit()

    return {"status": "ok", "id": int(new_id)}


@app.get("/drift/summary")
def drift_summary(
    model: Optional[str] = None,
    limit: int = 10,
    x_api_key: Optional[str] = Header(default=None),
):
    require_key(x_api_key)

    with db() as con, con.cursor() as cur:
        if model:
            cur.execute(
                """
                select id, model, baseline_label, current_label, metrics, created_at
                from model_a_drift_audit
                where model = %s
                order by created_at desc
                limit %s
                """,
                (model, limit),
            )
        else:
            cur.execute(
                """
                select id, model, baseline_label, current_label, metrics, created_at
                from model_a_drift_audit
                order by created_at desc
                limit %s
                """,
                (limit,),
            )
        rows = cur.fetchall()

    out = []
    for r in rows:
        out.append(
            {
                "id": int(r[0]),
                "model": r[1],
                "baseline_label": r[2],
                "current_label": r[3],
                "metrics": r[4],
                "created_at": r[5].isoformat() if r[5] else None,
            }
        )

    return {"status": "ok", "count": len(out), "rows": out}


@app.get("/model/status")
def model_status(
    model: str = "model_a_ml",
    x_api_key: Optional[str] = Header(default=None),
):
    require_key(x_api_key)

    with db() as con, con.cursor() as cur:
        cur.execute(
            """
            select id, model_name, version, metrics, features, artifacts, created_at
            from model_registry
            where model_name = %s
            order by created_at desc
            limit 1
            """,
            (model,),
        )
        reg = cur.fetchone()

        cur.execute(
            """
            select as_of, count(*)
            from model_a_ml_signals
            where model = %s
            group by as_of
            order by as_of desc
            limit 1
            """,
            (model,),
        )
        sig = cur.fetchone()

        cur.execute(
            """
            select id, baseline_label, current_label, metrics, created_at
            from model_a_drift_audit
            where model = %s
            order by created_at desc
            limit 1
            """,
            (model,),
        )
        drift = cur.fetchone()

    out = {"status": "ok", "model": model}
    if reg:
        out["registry"] = {
            "id": int(reg[0]),
            "model_name": reg[1],
            "version": reg[2],
            "metrics": reg[3],
            "features": reg[4],
            "artifacts": reg[5],
            "created_at": reg[6].isoformat() if reg[6] else None,
        }
    if sig:
        out["signals"] = {
            "as_of": sig[0].isoformat() if sig[0] else None,
            "row_count": int(sig[1]),
        }
    if drift:
        out["drift"] = {
            "id": int(drift[0]),
            "baseline_label": drift[1],
            "current_label": drift[2],
            "metrics": drift[3],
            "created_at": drift[4].isoformat() if drift[4] else None,
        }

    return out


@app.get("/model/status/summary")
def model_status_summary(
    model: str = "model_a_ml",
    x_api_key: Optional[str] = Header(default=None),
):
    require_key(x_api_key)

    with db() as con, con.cursor() as cur:
        cur.execute(
            """
            select version, metrics, created_at
            from model_registry
            where model_name = %s
            order by created_at desc
            limit 1
            """,
            (model,),
        )
        reg = cur.fetchone()

        cur.execute(
            """
            select as_of, count(*)
            from model_a_ml_signals
            where model = %s
            group by as_of
            order by as_of desc
            limit 1
            """,
            (model,),
        )
        sig = cur.fetchone()

        cur.execute(
            """
            select metrics, created_at
            from model_a_drift_audit
            where model = %s
            order by created_at desc
            limit 1
            """,
            (model,),
        )
        drift = cur.fetchone()

    return {
        "status": "ok",
        "model": model,
        "last_run": {
            "version": reg[0] if reg else None,
            "created_at": reg[2].isoformat() if reg and reg[2] else None,
            "roc_auc_mean": (reg[1].get("roc_auc_mean") if reg and reg[1] else None),
            "rmse_mean": (reg[1].get("rmse_mean") if reg and reg[1] else None),
        },
        "signals": {
            "as_of": sig[0].isoformat() if sig and sig[0] else None,
            "row_count": int(sig[1]) if sig else 0,
        },
        "drift": {
            "psi_mean": (drift[0].get("psi_mean") if drift and drift[0] else None),
            "psi_max": (drift[0].get("psi_max") if drift and drift[0] else None),
            "created_at": drift[1].isoformat() if drift and drift[1] else None,
        },
    }


@app.get("/model/compare")
def model_compare(
    model: str = "model_a_ml",
    left_version: Optional[str] = None,
    right_version: Optional[str] = None,
    x_api_key: Optional[str] = Header(default=None),
):
    require_key(x_api_key)

    with db() as con, con.cursor() as cur:
        if left_version and right_version:
            cur.execute(
                """
                select version, metrics, created_at
                from model_registry
                where model_name = %s and version in (%s, %s)
                order by created_at desc
                """,
                (model, left_version, right_version),
            )
        else:
            cur.execute(
                """
                select version, metrics, created_at
                from model_registry
                where model_name = %s
                order by created_at desc
                limit 2
                """,
                (model,),
            )
        rows = cur.fetchall()

    if len(rows) < 2:
        raise HTTPException(status_code=404, detail="Not enough model runs to compare.")

    right = rows[0]
    left = rows[1]
    left_metrics = left[1] or {}
    right_metrics = right[1] or {}

    def delta(key: str):
        if key in left_metrics and key in right_metrics:
            try:
                return float(right_metrics[key]) - float(left_metrics[key])
            except (TypeError, ValueError):
                return None
        return None

    return {
        "status": "ok",
        "model": model,
        "left": {
            "version": left[0],
            "created_at": left[2].isoformat() if left[2] else None,
            "metrics": left_metrics,
        },
        "right": {
            "version": right[0],
            "created_at": right[2].isoformat() if right[2] else None,
            "metrics": right_metrics,
        },
        "delta": {
            "roc_auc_mean": delta("roc_auc_mean"),
            "rmse_mean": delta("rmse_mean"),
            "mean_confidence_gap": delta("mean_confidence_gap"),
            "population_stability_index": delta("population_stability_index"),
        },
    }


@app.get("/signals/live")
def signals_live(
    model: str = "model_a_ml",
    as_of: Optional[str] = None,
    limit: int = 20,
    x_api_key: Optional[str] = Header(default=None),
):
    require_key(x_api_key)
    if limit < 1 or limit > 200:
        raise HTTPException(status_code=400, detail="limit must be between 1 and 200")

    with db() as con, con.cursor() as cur:
        if as_of:
            as_of_d = datetime.strptime(as_of, "%Y-%m-%d").date()
        else:
            cur.execute(
                """
                select max(as_of)
                from model_a_ml_signals
                where model = %s
                """,
                (model,),
            )
            row = cur.fetchone()
            if not row or not row[0]:
                raise HTTPException(status_code=404, detail="No signals available.")
            as_of_d = row[0]

        cur.execute(
            """
            select symbol, rank, score, ml_prob, ml_expected_return
            from model_a_ml_signals
            where model = %s and as_of = %s
            order by rank asc
            limit %s
            """,
            (model, as_of_d, limit),
        )
        rows = cur.fetchall()

    signals = [
        {
            "symbol": r[0],
            "rank": int(r[1]) if r[1] is not None else None,
            "score": float(r[2]) if r[2] is not None else None,
            "ml_prob": float(r[3]) if r[3] is not None else None,
            "ml_expected_return": float(r[4]) if r[4] is not None else None,
        }
        for r in rows
    ]

    return {"status": "ok", "model": model, "as_of": as_of_d.isoformat(), "count": len(signals), "signals": signals}

def _load_latest_feature_importance():
    summary_paths = sorted(glob.glob(os.path.join("models", "model_a_training_summary_*.txt")))
    if not summary_paths:
        return None

    latest_path = summary_paths[-1]
    features = []
    started = False

    with open(latest_path, "r") as f:
        for line in f:
            if line.strip().startswith("Top Features"):
                started = True
                continue
            if not started:
                continue
            if not line.strip():
                continue
            if "feature" in line and "importance" in line:
                continue

            parts = line.strip().split()
            if len(parts) < 2:
                continue
            importance = parts[-1]
            feature = " ".join(parts[:-1])
            try:
                features.append({"feature": feature, "importance": float(importance)})
            except ValueError:
                continue

    updated_at = datetime.utcfromtimestamp(os.path.getmtime(latest_path)).isoformat()
    return {"path": latest_path, "updated_at": updated_at, "features": features}


@app.get("/insights/feature-importance")
def feature_importance_summary(
    model: str = "model_a_ml",
    limit: int = 10,
    x_api_key: Optional[str] = Header(default=None),
):
    require_key(x_api_key)

    data = _load_latest_feature_importance()
    if not data:
        raise HTTPException(status_code=404, detail="No training summaries found.")

    return {
        "status": "ok",
        "model": model,
        "source": data["path"],
        "updated_at": data["updated_at"],
        "features": data["features"][:limit],
    }
