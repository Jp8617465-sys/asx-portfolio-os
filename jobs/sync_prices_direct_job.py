"""
jobs/sync_prices_direct_job.py
Standalone job to sync prices directly from EODHD API.
Can be run directly without requiring the API server to be running.

Usage:
    python jobs/sync_prices_direct_job.py
"""

import io
import os
import sys
from datetime import datetime

import pandas as pd
import psycopg2
import requests
from psycopg2.extras import execute_values
from dotenv import load_dotenv

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv(dotenv_path=".env", override=True)

DATABASE_URL = os.getenv("DATABASE_URL")
EODHD_API_KEY = os.getenv("EODHD_API_KEY")

if not DATABASE_URL:
    raise SystemExit("❌ DATABASE_URL not set")
if not EODHD_API_KEY:
    raise SystemExit("❌ EODHD_API_KEY not set")


def ensure_prices_table():
    """Ensure the prices table exists."""
    with psycopg2.connect(DATABASE_URL) as con, con.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS prices (
                dt DATE NOT NULL,
                symbol VARCHAR(50) NOT NULL,
                open NUMERIC,
                high NUMERIC,
                low NUMERIC,
                close NUMERIC,
                volume BIGINT,
                PRIMARY KEY (dt, symbol)
            )
        """)
        # Create index for faster queries
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_prices_symbol_dt 
            ON prices (symbol, dt DESC)
        """)
        con.commit()


def get_allowed_symbols():
    """Get list of symbols from universe."""
    with psycopg2.connect(DATABASE_URL) as con, con.cursor() as cur:
        cur.execute("SELECT symbol FROM universe WHERE exchange='AU'")
        return set(r[0] for r in cur.fetchall())


def sync_last_day_prices():
    """Sync prices for the last trading day from EODHD bulk endpoint."""
    print("🚀 Starting price sync from EODHD bulk endpoint...")

    # Ensure table exists
    ensure_prices_table()

    url = f"https://eodhd.com/api/eod-bulk-last-day/AU?api_token={EODHD_API_KEY}&fmt=csv"
    r = requests.get(url, timeout=180)

    if r.status_code != 200:
        snippet = (r.text or "")[:300].replace("\n", " ")
        raise RuntimeError(f"EODHD bulk error {r.status_code}: {snippet}")

    if not r.text or not r.text.strip():
        raise RuntimeError("EODHD bulk endpoint returned empty payload")

    try:
        df = pd.read_csv(io.StringIO(r.text))
    except pd.errors.EmptyDataError:
        raise RuntimeError("EODHD bulk endpoint returned empty CSV")

    print(f"📊 Received {len(df)} price records from EODHD")

    cols = {c.lower(): c for c in df.columns}
    dt_col = cols.get("date")
    code_col = cols.get("code") or cols.get("symbol")

    if not dt_col or not code_col:
        raise RuntimeError(f"Unexpected bulk columns: {list(df.columns)[:20]}")

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
        raise RuntimeError("EODHD bulk payload had no usable rows")

    # Filter to universe symbols
    allowed = get_allowed_symbols()
    if not allowed:
        print("⚠️ Warning: Universe is empty, inserting all prices anyway")
    else:
        original_count = len(out)
        out = out[out["symbol"].isin(allowed)]
        print(f"📊 Filtered to {len(out)}/{original_count} symbols in universe")

    if out.empty:
        raise RuntimeError("No prices matched universe")

    day = out["dt"].iloc[0]
    rows = [
        tuple(x) for x in out[["dt", "symbol", "open", "high", "low", "close", "volume"]].itertuples(index=False, name=None)
    ]

    with psycopg2.connect(DATABASE_URL) as con, con.cursor() as cur:
        cur.execute("DELETE FROM prices WHERE dt = %s", (day,))
        if rows:
            execute_values(
                cur,
                """
                INSERT INTO prices (dt, symbol, open, high, low, close, volume)
                VALUES %s
                ON CONFLICT (dt, symbol) DO UPDATE SET
                  open=excluded.open, high=excluded.high, low=excluded.low,
                  close=excluded.close, volume=excluded.volume
                """,
                rows
            )
        con.commit()
        cur.execute("SELECT COUNT(*) FROM prices WHERE dt = %s", (day,))
        n = cur.fetchone()[0]

    print(f"✅ Price sync complete: {n} rows for {day}")
    return {"date": str(day), "rows": n}


if __name__ == "__main__":
    try:
        result = sync_last_day_prices()
        print(f"✅ Successfully synced {result['rows']} prices for {result['date']}")
    except Exception as e:
        print(f"❌ Price sync failed: {e}")
        sys.exit(1)
