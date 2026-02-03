"""
app/routes/model.py
Model A v1.1 run, persist, and dashboard endpoints.
"""

import os
import json
from datetime import datetime, timedelta
from typing import Optional

import numpy as np
import pandas as pd
from fastapi import APIRouter, Header, HTTPException, Query
from psycopg2.extras import execute_values
from pydantic import BaseModel

from app.core import db, require_key, logger, parse_as_of, OUTPUT_DIR

router = APIRouter()


# --- Helper functions ---
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


# --- Request models ---
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


class PropertyValuationReq(BaseModel):
    region: str = "Sydney"
    horizon_months: int = 12
    persist: bool = False
    train_model: bool = False


@router.post("/run/model_a_v1_1")
def run_model_a_v1_1(req: ModelAV11Req, x_api_key: Optional[str] = Header(default=None)):
    """Run Model A v1.1 - calculate ranked portfolio signals."""
    require_key(x_api_key)
    started = datetime.utcnow()
    as_of = parse_as_of(req.as_of)
    start = as_of - timedelta(days=520)

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

    # Feature calculations
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

    # Latest snapshot
    latest = px.groupby("symbol").tail(1).copy()
    latest = latest[latest["dt"].dt.date == as_of]

    # Filters
    total = len(latest)
    required_cols = ["mom_6", "mom_12_1", "vol_90", "adv_20_median", "close", "trend_quality"]
    mask_notna = latest[required_cols].notna().all(axis=1)
    mask_adv = latest["adv_20_median"] >= req.adv_floor
    mask_price = latest["close"] >= req.min_price
    mask_trend = latest["trend_quality"]  # Boolean column from feature engineering

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

    # Scoring & ranking
    latest["score"] = req.w_mom_12_1 * _zscore(latest["mom_12_1"]) + req.w_mom_6 * _zscore(latest["mom_6"])
    ranked = latest.sort_values("score", ascending=False).copy()
    ranked["rank"] = range(1, len(ranked) + 1)

    # Portfolio targeting
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

    if rets.empty or target.empty:
        raise HTTPException(status_code=400, detail="Not enough valid history for vol targeting.")

    w_vec = target.set_index("symbol")["weight_raw"].reindex(rets.columns).fillna(0.0).values
    cov = np.cov(rets.values, rowvar=False)
    if not np.isfinite(cov).all():
        raise HTTPException(status_code=400, detail="Covariance matrix contains NaNs; check input returns frame.")
    port_vol_daily = float(np.sqrt(w_vec.T @ cov @ w_vec))
    port_vol_annual = port_vol_daily * np.sqrt(252.0)

    scale = 1.0 if port_vol_annual == 0 else min(1.0, req.target_vol_annual / port_vol_annual)
    target["target_weight"] = target["weight_raw"] * scale
    cash_weight = 1.0 - float(target["target_weight"].sum())

    # Diagnostics
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

    target_payload = target[[
        "symbol", "target_weight", "score", "rank", "mom_12_1", "mom_6",
        "trend_200", "sma200_slope_pos", "adv_20_median", "vol_90", "close",
    ]].copy()
    target_payload.rename(columns={"close": "price"}, inplace=True)

    logger.info("✅ Model A v1.1 finished with %d holdings", len(target))

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
        "targets": target_payload.to_dict(orient="records"),
        "summary": summary,
    }


@router.post("/run/model_a_v1_1_persist")
def run_model_a_v1_1_persist(req: ModelAV11Req, x_api_key: Optional[str] = Header(default=None)):
    """Run Model A v1.1 and persist results to database."""
    require_key(x_api_key)
    as_of_date = parse_as_of(req.as_of)
    logger.info("🚀 Starting Model A persist run for %s", as_of_date)

    # Run model
    try:
        data = run_model_a_v1_1(req, x_api_key=x_api_key)
        if not isinstance(data, dict):
            raise HTTPException(status_code=500, detail=f"Model A base call returned empty or invalid data: {type(data)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model A run failed: {e}")

    ranked = pd.DataFrame(data.get("ranked") or [])
    targets = pd.DataFrame(data.get("targets") or [])
    if ranked.empty:
        raise HTTPException(status_code=500, detail="Model A base call returned empty ranked data.")
    if targets.empty:
        raise HTTPException(status_code=500, detail="Model A base call returned empty target data.")

    # Ensure target_weight exists in ranked
    if "target_weight" not in ranked.columns:
        if "target_weight" in targets.columns:
            ranked = ranked.copy()
            ranked["target_weight"] = ranked["symbol"].map(targets.set_index("symbol")["target_weight"])
        else:
            raise HTTPException(status_code=500, detail="Model A targets missing target_weight column.")

    summary = data.get("summary") or {}
    n_holdings = int(data.get("n_holdings", 0) or 0)
    n_replacements = int(data.get("n_replacements", 0) or 0)
    turnover = data.get("turnover_pct", None)
    port_vol = data.get("portfolio_vol", None)
    drawdown = data.get("drawdown", None)
    regime = data.get("risk_regime", "unknown")

    port_vol = float(port_vol) if port_vol is not None else None
    drawdown = float(drawdown) if drawdown is not None else None
    turnover = float(turnover) if turnover is not None else None

    targets = targets.copy()
    if "price" not in targets.columns and "close" in targets.columns:
        targets.rename(columns={"close": "price"}, inplace=True)

    def _to_float(value):
        if value is None or pd.isna(value):
            return None
        return float(value)

    # Store to database
    with db() as con, con.cursor() as cur:
        cur.execute(
            """
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
            """,
            (as_of_date, n_holdings, n_replacements, turnover, port_vol, drawdown, regime),
        )
        run_id = cur.fetchone()[0]

        cur.execute("delete from model_a_ranked where run_id = %s;", (run_id,))

        for _, r in ranked.iterrows():
            cur.execute(
                """
                insert into model_a_ranked (
                    run_id, rank, symbol, momentum_12_1, momentum_6, adv_20d, vol_90d, weight, as_of
                ) values (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """,
                (
                    run_id,
                    int(r.get("rank")) if r.get("rank") is not None else None,
                    r.get("symbol"),
                    _to_float(r.get("mom_12_1")),
                    _to_float(r.get("mom_6")),
                    _to_float(r.get("adv_20_median")),
                    _to_float(r.get("vol_90")),
                    _to_float(r.get("target_weight")),
                    as_of_date,
                ),
            )

        cur.execute("delete from signals where as_of=%s and model=%s", (as_of_date, req.model))
        signal_rows = []
        for r in targets.itertuples(index=False):
            signal_rows.append((
                as_of_date, r.symbol, req.model,
                _to_float(r.score),
                int(r.rank) if r.rank is not None else None,
                _to_float(r.target_weight),
                _to_float(r.mom_12_1), _to_float(r.mom_6),
                bool(r.trend_200) if r.trend_200 is not None else None,
                bool(r.sma200_slope_pos) if r.sma200_slope_pos is not None else None,
                _to_float(r.adv_20_median), _to_float(r.vol_90), _to_float(r.price),
            ))
        execute_values(
            cur,
            """
            insert into signals (
              as_of, symbol, model, score, rank, target_weight,
              mom_12_1, mom_6, trend_200, sma200_slope_pos,
              adv_20_median, vol_90, price
            ) values %s
            """,
            signal_rows,
        )
        con.commit()

    # Write output files
    ranked_path = os.path.join(OUTPUT_DIR, f"ranked_{req.model}_{as_of_date.isoformat()}.csv")
    targets_path = os.path.join(OUTPUT_DIR, f"targets_{req.model}_{as_of_date.isoformat()}.csv")
    meta_path = os.path.join(OUTPUT_DIR, f"dashboard_meta_{req.model}_{as_of_date.isoformat()}.json")

    ranked.to_csv(ranked_path, index=False)
    targets.to_csv(targets_path, index=False)

    meta = {
        "as_of": as_of_date.isoformat(),
        "model": req.model,
        "generated_at_utc": datetime.utcnow().isoformat(),
        "params": req.model_dump(),
        "eligible_ranked": int(len(ranked)),
        "n_holdings": int(len(targets)),
        "port_vol_annual_est": port_vol,
        "scale": summary.get("scale"),
        "cash_weight": summary.get("cash_weight"),
        "files": {"ranked": ranked_path, "targets": targets_path},
        "warnings": summary.get("warnings", []),
    }
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)

    logger.info("✅ Model A persist run completed")
    return {"status": "ok", "as_of": as_of_date.isoformat(), "n_rows": len(ranked)}


@router.get("/dashboard/model_a_v1_1")
def dashboard_model_a_v1_1(
    as_of: str = Query(..., description="YYYY-MM-DD"),
    model: str = Query("model_a_v1_1"),
    include_ranked_preview: bool = Query(True),
    ranked_preview_n: int = Query(200, ge=50, le=2000),
    include_justifications: bool = Query(True),
    x_api_key: Optional[str] = Header(default=None),
):
    """Get detailed dashboard data for Model A v1.1."""
    require_key(x_api_key)
    as_of_d = parse_as_of(as_of)
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
        raise HTTPException(status_code=404, detail="No signals found for this as_of/model.")

    # Distributions
    def q(series):
        return {
            "min": float(series.min()), "p10": float(series.quantile(0.10)),
            "p25": float(series.quantile(0.25)), "median": float(series.quantile(0.50)),
            "p75": float(series.quantile(0.75)), "p90": float(series.quantile(0.90)),
            "max": float(series.max()),
        }

    dist = {
        "mom_12_1": q(sig["mom_12_1"]), "mom_6": q(sig["mom_6"]),
        "adv_20_median": q(sig["adv_20_median"]), "vol_90": q(sig["vol_90"]),
        "target_weight": q(sig["target_weight"]), "score": q(sig["score"]),
    }

    top10_weight = float(sig["target_weight"].head(10).sum())
    top20_weight = float(sig["target_weight"].head(20).sum())
    n_at_cap = int((sig["target_weight"] >= (sig["target_weight"].max() - 1e-9)).sum())

    warnings = []
    if top10_weight > 0.30:
        warnings.append(f"Top 10 concentration is {top10_weight*100:.1f}%.")
    if n_at_cap > 20:
        warnings.append(f"{n_at_cap} names appear near the max weight cap.")

    targets = sig.copy()
    targets["price"] = targets["price"].astype(float)

    adv_floor = float(meta["params"]["adv_floor"]) if meta and "params" in meta else 30_000_000.0
    min_price = float(meta["params"]["min_price"]) if meta and "params" in meta else 5.0

    if include_justifications:
        targets["justification"] = targets.apply(lambda r: _justify_row(r, adv_floor, min_price), axis=1)

    ranked_preview = None
    if include_ranked_preview:
        ranked_path = os.path.join(OUTPUT_DIR, f"ranked_{model}_{as_of}.csv")
        if os.path.exists(ranked_path):
            rp = pd.read_csv(ranked_path).head(ranked_preview_n)
            ranked_preview = rp.to_dict(orient="records")

    return {
        "as_of": as_of, "model": model,
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
    }


@router.post("/property/valuation")
def property_valuation(req: PropertyValuationReq, x_api_key: Optional[str] = Header(default=None)):
    """Property valuation endpoint (placeholder)."""
    require_key(x_api_key)
    try:
        from jobs.property_module_template import (
            fetch_property_data, engineer_property_features,
            train_valuation_model, forecast_property_growth,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Property module import failed: {e}")

    df = fetch_property_data(req.region)
    df = engineer_property_features(df)
    if req.train_model:
        train_valuation_model(df)
    forecast = forecast_property_growth(df, horizon_months=req.horizon_months)
    df.to_csv(os.path.join(OUTPUT_DIR, "property_features_latest.csv"), index=False)

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


@router.get("/stock/{code}/history")
def get_stock_history(
    code: str,
    days: int = Query(default=90, ge=7, le=365, description="Number of days of history"),
    x_api_key: Optional[str] = Header(default=None),
):
    """
    Get historical price data for a stock.

    Returns OHLCV data for the specified number of days.
    Used by stock detail page charts.
    """
    require_key(x_api_key)

    # Normalize stock code (add .AX if not present)
    if not code.endswith('.AX'):
        code = f"{code}.AX"

    try:
        with db() as con:
            query = """
                SELECT
                    date,
                    open,
                    high,
                    low,
                    close,
                    volume
                FROM asx_stock_prices
                WHERE code = %s
                  AND date >= CURRENT_DATE - INTERVAL '%s days'
                ORDER BY date ASC
            """
            df = pd.read_sql(query, con, params=(code, days))
    except Exception as e:
        logger.error("Failed to fetch history for %s: %s", code, e)
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    if df.empty:
        raise HTTPException(
            status_code=404,
            detail=f"No price history found for {code}. Try a different symbol or check if prices are synced."
        )

    # Convert to required format
    df['date'] = df['date'].astype(str)
    history = df.to_dict(orient='records')

    return {
        "code": code,
        "days": days,
        "data_points": len(history),
        "start_date": history[0]['date'] if history else None,
        "end_date": history[-1]['date'] if history else None,
        "history": history
    }
