"""
app/routes/refresh.py
Universe, prices, and data refresh endpoints.
"""

import io
import time
from datetime import datetime, timedelta
from typing import Optional

import pandas as pd
import requests
from fastapi import APIRouter, Header, HTTPException
from psycopg2.extras import execute_values
from pydantic import BaseModel

from app.core import db, require_key, logger, EODHD_API_KEY

router = APIRouter()


@router.post("/refresh/universe")
def refresh_universe(x_api_key: Optional[str] = Header(default=None)):
    """Refresh the ASX universe list from EODHD API."""
    require_key(x_api_key)
    logger.info("🚀 Starting universe refresh from EODHD")

    url = f"https://eodhd.com/api/exchange-symbol-list/AU?api_token={EODHD_API_KEY}&fmt=csv"
    r = requests.get(url, timeout=60)

    if r.status_code != 200:
        snippet = (r.text or "")[:300].replace("\n", " ")
        raise HTTPException(status_code=502, detail=f"EODHD universe error {r.status_code}: {snippet}")

    if not r.text or not r.text.strip():
        logger.warning("EODHD universe returned empty payload; skipping delete.")
        raise HTTPException(status_code=502, detail="EODHD universe empty; existing data preserved.")

    try:
        df = pd.read_csv(io.StringIO(r.text))
    except pd.errors.EmptyDataError:
        logger.warning("EODHD universe returned empty CSV; skipping delete.")
        raise HTTPException(status_code=502, detail="EODHD universe empty; existing data preserved.")

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

    if out.empty:
        logger.warning("EODHD universe returned no usable rows; skipping delete.")
        raise HTTPException(status_code=502, detail="EODHD universe empty; existing data preserved.")

    rows = [tuple(x) for x in out[["symbol", "name", "exchange", "type", "currency", "updated_at"]].itertuples(index=False, name=None)]

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


@router.post("/refresh/prices/last_day")
def refresh_prices_last_day(x_api_key: Optional[str] = Header(default=None)):
    """Refresh prices for the last trading day."""
    require_key(x_api_key)

    url = f"https://eodhd.com/api/eod-bulk-last-day/AU?api_token={EODHD_API_KEY}&fmt=csv"
    r = requests.get(url, timeout=180)
    if r.status_code != 200:
        snippet = (r.text or "")[:300].replace("\n", " ")
        raise HTTPException(status_code=502, detail=f"EODHD bulk error {r.status_code}: {snippet}")

    if not r.text or not r.text.strip():
        logger.warning("EODHD bulk endpoint returned empty payload; skipping delete.")
        raise HTTPException(status_code=502, detail="EODHD bulk data empty; existing prices preserved.")

    try:
        df = pd.read_csv(io.StringIO(r.text))
    except pd.errors.EmptyDataError:
        logger.warning("EODHD bulk endpoint returned empty CSV; skipping delete.")
        raise HTTPException(status_code=502, detail="EODHD bulk data empty; existing prices preserved.")

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

    if out.empty:
        logger.warning("EODHD bulk payload had no usable rows; skipping delete.")
        raise HTTPException(status_code=502, detail="EODHD bulk data empty; existing prices preserved.")

    # Filter to universe symbols
    with db() as con, con.cursor() as cur:
        cur.execute("select symbol from universe where exchange='AU'")
        allowed = set(r[0] for r in cur.fetchall())

    if not allowed:
        logger.warning("Universe is empty; skipping price refresh.")
        raise HTTPException(status_code=409, detail="Universe empty; run /refresh/universe first.")

    out = out[out["symbol"].isin(allowed)]
    if out.empty:
        logger.warning("No bulk rows matched universe; skipping delete.")
        raise HTTPException(status_code=409, detail="No prices matched universe; existing prices preserved.")

    day = out["dt"].iloc[0]
    rows = [tuple(x) for x in out[["dt", "symbol", "open", "high", "low", "close", "volume"]].itertuples(index=False, name=None)]

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

    return {"status": "ok", "date": str(day), "rows": int(n)}


@router.post("/refresh/prices/live")
def refresh_prices_live(x_api_key: Optional[str] = Header(default=None)):
    """Alias to refresh last-day prices."""
    return refresh_prices_last_day(x_api_key=x_api_key)


@router.post("/refresh/macro/latest")
def refresh_macro_latest(x_api_key: Optional[str] = Header(default=None)):
    """Refresh macro data."""
    require_key(x_api_key)
    try:
        from jobs.load_macro import main as load_macro_main
        load_macro_main()
        return {"status": "ok"}
    except SystemExit as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/refresh/sentiment")
def refresh_sentiment(x_api_key: Optional[str] = Header(default=None)):
    """Refresh sentiment data."""
    require_key(x_api_key)
    try:
        from jobs.load_sentiment import main as load_sentiment_main
        load_sentiment_main()
        return {"status": "ok"}
    except SystemExit as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/refresh/etfdata")
def refresh_etfdata(x_api_key: Optional[str] = Header(default=None)):
    """Refresh ETF data."""
    require_key(x_api_key)
    try:
        from jobs.load_etf_data import main as load_etf_main
        load_etf_main()
        return {"status": "ok"}
    except SystemExit as exc:
        raise HTTPException(status_code=400, detail=str(exc))


class BackfillReq(BaseModel):
    from_date: str
    to_date: str
    sleep_seconds: float = 0.2


@router.post("/backfill/prices")
def backfill_prices(req: BackfillReq, x_api_key: Optional[str] = Header(default=None)):
    """Backfill historical prices for a date range."""
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
    skipped_dates = []

    d = start
    while d <= end:
        total_days += 1
        url = f"https://eodhd.com/api/eod-bulk-last-day/AU?api_token={EODHD_API_KEY}&fmt=csv&date={d.isoformat()}"
        r = requests.get(url, timeout=180)

        if r.status_code != 200:
            skipped_days += 1
            skipped_dates.append(d.isoformat())
            d += timedelta(days=1)
            time.sleep(req.sleep_seconds)
            continue

        try:
            df = pd.read_csv(io.StringIO(r.text))
        except Exception:
            skipped_days += 1
            skipped_dates.append(d.isoformat())
            d += timedelta(days=1)
            time.sleep(req.sleep_seconds)
            continue

        cols = {c.lower(): c for c in df.columns}
        dt_col = cols.get("date")
        code_col = cols.get("code") or cols.get("symbol")
        if not dt_col or not code_col:
            skipped_days += 1
            skipped_dates.append(d.isoformat())
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
            skipped_dates.append(d.isoformat())
            d += timedelta(days=1)
            time.sleep(req.sleep_seconds)
            continue

        day = out["dt"].iloc[0]
        rows = [tuple(x) for x in out[["dt", "symbol", "open", "high", "low", "close", "volume"]].itertuples(index=False, name=None)]

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

    if skipped_dates:
        logger.info("Backfill skipped %d days: %s", len(skipped_dates), skipped_dates)

    return {
        "status": "ok",
        "from": start.isoformat(),
        "to": end.isoformat(),
        "total_days_iterated": total_days,
        "skipped_days": skipped_days,
        "rows_inserted": total_rows
    }


@router.get("/refresh/fundamentals/status")
def get_fundamentals_status(x_api_key: Optional[str] = Header(default=None)):
    """Get current fundamentals data status."""
    require_key(x_api_key)
    with db() as con, con.cursor() as cur:
        cur.execute("SELECT COUNT(DISTINCT symbol) FROM fundamentals")
        fundamentals_count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(DISTINCT symbol) FROM universe WHERE exchange = 'AU'")
        universe_count = cur.fetchone()[0]
        cur.execute("SELECT MAX(updated_at) FROM fundamentals")
        last_updated = cur.fetchone()[0]
    return {
        "status": "ok",
        "fundamentals_count": fundamentals_count,
        "universe_count": universe_count,
        "coverage_percent": round(fundamentals_count / universe_count * 100, 1) if universe_count > 0 else 0,
        "missing": universe_count - fundamentals_count,
        "last_updated": str(last_updated) if last_updated else None
    }


@router.post("/refresh/fundamentals")
def refresh_fundamentals(x_api_key: Optional[str] = Header(default=None)):
    """Refresh fundamentals data for all ASX tickers and derive features."""
    require_key(x_api_key)
    try:
        from jobs.load_fundamentals_pipeline import fundamentals_pipeline, get_ticker_list
        from jobs.derive_fundamentals_features import derive_features
        tickers = get_ticker_list()
        fundamentals_pipeline(tickers)
        derive_features()
        return {
            "status": "ok",
            "tickers_processed": len(tickers),
            "message": "Fundamentals refresh and feature derivation complete"
        }
    except Exception as exc:
        logger.error(f"Fundamentals refresh failed: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))
