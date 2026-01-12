import os, io, time
from typing import Optional
from datetime import datetime, timedelta

import pandas as pd
import requests
import psycopg2
from psycopg2.extras import execute_values
from fastapi import FastAPI, Header, HTTPException
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]
EODHD_API_KEY = os.environ["EODHD_API_KEY"]
OS_API_KEY = os.environ["OS_API_KEY"]

app = FastAPI(title="ASX Portfolio OS", version="0.1.0")


def require_key(x_api_key: Optional[str]):
    if x_api_key != OS_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")


def db():
    return psycopg2.connect(DATABASE_URL)


def ensure_schema():
    # Robustness: app boots even if tables aren't created yet.
    with db() as con, con.cursor() as cur:
        cur.execute("""
        create table if not exists universe (
          symbol text primary key,
          name text,
          exchange text,
          type text,
          currency text,
          updated_at timestamptz default now()
        );
        """)
        cur.execute("""
        create table if not exists prices (
          dt date not null,
          symbol text not null references universe(symbol),
          open double precision,
          high double precision,
          low double precision,
          close double precision,
          volume double precision,
          primary key (dt, symbol)
        );
        """)
        cur.execute("create index if not exists idx_prices_symbol_dt on prices(symbol, dt);")
        con.commit()


ensure_schema()


@app.get("/health")
def health():
    return {"ok": True, "ts": datetime.utcnow().isoformat()}


@app.post("/refresh/universe")
def refresh_universe(x_api_key: Optional[str] = Header(default=None)):
    require_key(x_api_key)

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

    rows = [
        tuple(x) for x in out[["symbol", "name", "exchange", "type", "currency", "updated_at"]]
        .itertuples(index=False, name=None)
    ]

    with db() as con, con.cursor() as cur:
        cur.execute("delete from universe where exchange='AU'")
        execute_values(
            cur,
            """
            insert into universe (symbol, name, exchange, type, currency, updated_at)
            values %s
            on conflict (symbol) do update set
              name = excluded.name,
              exchange = excluded.exchange,
              type = excluded.type,
              currency = excluded.currency,
              updated_at = excluded.updated_at
            """,
            rows
        )
        con.commit()
        cur.execute("select count(*) from universe where exchange='AU'")
        n = cur.fetchone()[0]

    return {"status": "ok", "universe_count": int(n)}


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
        "low": df[get("low")] if get("low") else None,
        "close": df[get("close")] if get("close") else None,
        "volume": df[get("volume")] if get("volume") else None,
    }).dropna(subset=["dt", "symbol", "close"])

    day = out["dt"].iloc[0]

    # Filter to universe symbols to avoid FK issues
    with db() as con, con.cursor() as cur:
        cur.execute("select symbol from universe where exchange='AU'")
        allowed = set(r[0] for r in cur.fetchall())

    out = out[out["symbol"].isin(allowed)]
    rows = [
        tuple(x) for x in out[["dt", "symbol", "open", "high", "low", "close", "volume"]]
        .itertuples(index=False, name=None)
    ]

    with db() as con, con.cursor() as cur:
        cur.execute("delete from prices where dt = %s", (day,))
        if rows:
            execute_values(
                cur,
                """
                insert into prices (dt, symbol, open, high, low, close, volume)
                values %s
                on conflict (dt, symbol) do update set
                  open = excluded.open,
                  high = excluded.high,
                  low = excluded.low,
                  close = excluded.close,
                  volume = excluded.volume
                """,
                rows
            )
        con.commit()
        cur.execute("select count(*) from prices where dt = %s", (day,))
        n = cur.fetchone()[0]

    return {"status": "ok", "date": str(day), "rows": int(n)}


class BackfillReq(BaseModel):
    from_date: str  # "YYYY-MM-DD"
    to_date: str    # "YYYY-MM-DD"
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

        # Many APIs accept date on this endpoint; if EODHD rejects it, we’ll adjust next.
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
            "low": df[get("low")] if get("low") else None,
            "close": df[get("close")] if get("close") else None,
            "volume": df[get("volume")] if get("volume") else None,
        }).dropna(subset=["dt", "symbol", "close"])

        out = out[out["symbol"].isin(allowed)]
        if out.empty:
            skipped_days += 1
            d += timedelta(days=1)
            time.sleep(req.sleep_seconds)
            continue

        day = out["dt"].iloc[0]
        rows = [
            tuple(x) for x in out[["dt", "symbol", "open", "high", "low", "close", "volume"]]
            .itertuples(index=False, name=None)
        ]

        with db() as con, con.cursor() as cur:
            cur.execute("delete from prices where dt = %s", (day,))
            execute_values(
                cur,
                """
                insert into prices (dt, symbol, open, high, low, close, volume)
                values %s
                on conflict (dt, symbol) do update set
                  open = excluded.open,
                  high = excluded.high,
                  low = excluded.low,
                  close = excluded.close,
                  volume = excluded.volume
                """,
                rows
            )
            con.commit()

        total_rows += len(rows)

        d += timedelta(days=1)
        time.sleep(req.sleep_seconds)

    return {
        "status": "ok",
        "from": start.isoformat(),
        "to": end.isoformat(),
        "total_days_iterated": total_days,
        "skipped_days": skipped_days,
        "rows_inserted": total_rows
    }

# -------------------------
# Model A v1.1 (Monthly, risk-controlled growth)
# -------------------------
import numpy as np


def _zscore(s: pd.Series) -> pd.Series:
    return (s - s.mean()) / (s.std(ddof=0) + 1e-12)


def _cap_weights(w: pd.Series, max_w: float) -> pd.Series:
    w = w.copy()
    for _ in range(10):
        over = w > max_w
        if not over.any():
            break
        excess = (w[over] - max_w).sum()
        w[over] = max_w
        under = ~over
        if under.any():
            w[under] = w[under] + excess * (w[under] / w[under].sum())
        else:
            break
    if w.sum() > 0:
        w = w / w.sum()
    return w


class ModelAV11Req(BaseModel):
    as_of: str  # "YYYY-MM-DD"
    adv_floor: float = 30_000_000.0   # 20D median ADV$ floor
    min_price: float = 5.0            # optional price floor

    n_holdings: int = 80
    max_weight: float = 0.0275        # 2.75% cap
    target_vol_annual: float = 0.09   # 9% annualized

    w_mom_12_1: float = 0.75
    w_mom_6: float = 0.25

    vol_lookback: int = 90
    adv_lookback: int = 20
    sma_lookback: int = 200
    sma_slope_lag: int = 20

    model: str = "model_a_v1_1"


@app.post("/run/model_a_v1_1")
def run_model_a_v1_1(req: ModelAV11Req, x_api_key: Optional[str] = Header(default=None)):
    require_key(x_api_key)
    as_of = datetime.strptime(req.as_of, "%Y-%m-%d").date()

    start = as_of - timedelta(days=520)

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

    if px.empty:
        raise HTTPException(status_code=400, detail="No prices found. Run backfill first.")

    px["ret1"] = px.groupby("symbol")["close"].pct_change()
    g = px.groupby("symbol", group_keys=False)

    dollar_vol = px["close"] * px["volume"]
    px["adv_20_median"] = dollar_vol.groupby(px["symbol"]).rolling(req.adv_lookback).median().reset_index(level=0, drop=True)

    px["vol_90"] = g["ret1"].rolling(req.vol_lookback).std().reset_index(level=0, drop=True)

    sma200 = g["close"].rolling(req.sma_lookback).mean().reset_index(level=0, drop=True)
    sma200_lag = g["close"].rolling(req.sma_lookback).mean().shift(req.sma_slope_lag).reset_index(level=0, drop=True)

    px["trend_200"] = px["close"] > sma200
    px["sma200_slope_pos"] = sma200 > sma200_lag
    px["trend_quality"] = px["trend_200"] & px["sma200_slope_pos"]

    px["mom_6"] = g["close"].pct_change(126)
    close_lag_21 = g["close"].shift(21)
    close_lag_252 = g["close"].shift(252)
    px["mom_12_1"] = (close_lag_21 / close_lag_252) - 1.0

    latest = px.sort_values(["symbol", "dt"]).groupby("symbol").tail(1).copy()

    latest = latest.dropna(subset=["mom_6", "mom_12_1", "vol_90", "adv_20_median", "close", "trend_quality"])
    latest = latest[latest["adv_20_median"] >= req.adv_floor]
    latest = latest[latest["close"] >= req.min_price]
    latest = latest[latest["trend_quality"] == True]

    if latest.empty:
        raise HTTPException(status_code=400, detail="No symbols passed gates. Lower adv_floor/min_price or ensure more history.")

    latest["score"] = req.w_mom_12_1 * _zscore(latest["mom_12_1"]) + req.w_mom_6 * _zscore(latest["mom_6"])

    ranked = latest.sort_values("score", ascending=False).copy()
    ranked["rank"] = range(1, len(ranked) + 1)

    target = ranked.head(req.n_holdings).copy()

    inv = 1.0 / (target["vol_90"] + 1e-12)
    w = inv / inv.sum()
    w = _cap_weights(w, req.max_weight)
    target["weight_raw"] = w

    sel = px[px["symbol"].isin(target["symbol"])].copy()
    rets = sel.pivot(index="dt", columns="symbol", values="ret1").dropna(how="all")
    rets = rets.tail(req.vol_lookback).dropna(axis=1)

    target = target[target["symbol"].isin(rets.columns)].copy()
    if target.empty:
        raise HTTPException(status_code=400, detail="Not enough return history for selected names (vol calc).")

    w_vec = target.set_index("symbol")["weight_raw"].reindex(rets.columns).fillna(0.0).values
    cov = np.cov(rets.values, rowvar=False)
    port_vol_daily = float(np.sqrt(w_vec.T @ cov @ w_vec))
    port_vol_annual = port_vol_daily * np.sqrt(252.0)

    scale = 1.0
    if port_vol_annual > 0:
        scale = min(1.0, req.target_vol_annual / port_vol_annual)

    target["target_weight"] = target["weight_raw"] * scale
    cash_weight = 1.0 - float(target["target_weight"].sum())

    # Write outputs locally (targets + ranked + paper rebalance)
    PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    OUTPUT_DIR = os.path.join(PROJECT_ROOT, "outputs")
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    ranked_path = os.path.join(OUTPUT_DIR, f"ranked_{req.model}_{as_of.isoformat()}.csv")
    targets_path = os.path.join(OUTPUT_DIR, f"targets_{req.model}_{as_of.isoformat()}.csv")
    paper_path = os.path.join(OUTPUT_DIR, f"paper_rebalance_{req.model}_{as_of.isoformat()}.csv")

    ranked.to_csv(ranked_path, index=False)

    out_targets = target[[
        "symbol", "target_weight", "score", "rank",
        "mom_12_1", "mom_6", "trend_200", "sma200_slope_pos",
        "adv_20_median", "vol_90", "close"
    ]].copy()
    out_targets.to_csv(targets_path, index=False)

    paper = out_targets[["symbol", "target_weight"]].copy()
    paper["current_weight"] = 0.0
    paper["delta_weight"] = paper["target_weight"] - paper["current_weight"]
    paper.to_csv(paper_path, index=False)

    return {
        "status": "ok",
        "as_of": as_of.isoformat(),
        "model": req.model,
        "eligible_ranked": int(len(ranked)),
        "n_holdings": int(len(target)),
        "adv_floor": req.adv_floor,
        "min_price": req.min_price,
        "port_vol_annual_est": port_vol_annual,
        "scale": scale,
        "cash_weight": cash_weight,
        "files_written": [ranked_path, targets_path, paper_path],
        "top10": out_targets.head(10).to_dict(orient="records"),
    }
