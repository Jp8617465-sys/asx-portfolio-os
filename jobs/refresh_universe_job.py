"""
jobs/refresh_universe_job.py
Standalone job to refresh the ASX stock universe from EODHD API.
Can be run directly without requiring the API server to be running.

Usage:
    python jobs/refresh_universe_job.py
"""

import io
import os
import sys
from datetime import datetime, timezone

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


def refresh_universe():
    """Refresh the ASX universe list from EODHD API."""
    print("🚀 Starting universe refresh from EODHD...")

    url = f"https://eodhd.com/api/exchange-symbol-list/AU?api_token={EODHD_API_KEY}&fmt=csv"
    r = requests.get(url, timeout=60)

    if r.status_code != 200:
        snippet = (r.text or "")[:300].replace("\n", " ")
        raise RuntimeError(f"EODHD universe error {r.status_code}: {snippet}")

    if not r.text or not r.text.strip():
        raise RuntimeError("EODHD universe returned empty payload")

    try:
        df = pd.read_csv(io.StringIO(r.text))
    except pd.errors.EmptyDataError:
        raise RuntimeError("EODHD universe returned empty CSV")

    print(f"📊 Received {len(df)} symbols from EODHD")

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
        "updated_at": datetime.now(timezone.utc),
    }).dropna(subset=["symbol"])

    if out.empty:
        raise RuntimeError("EODHD universe returned no usable rows")

    rows = [
        tuple(x) for x in out[["symbol", "name", "exchange", "type", "currency", "updated_at"]].itertuples(index=False, name=None)
    ]

    with psycopg2.connect(DATABASE_URL) as con, con.cursor() as cur:
        # Ensure table exists
        cur.execute("""
            CREATE TABLE IF NOT EXISTS universe (
                symbol VARCHAR(50) PRIMARY KEY,
                name VARCHAR(255),
                exchange VARCHAR(10),
                type VARCHAR(50),
                currency VARCHAR(10),
                sector VARCHAR(100),
                market_cap NUMERIC,
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)

        cur.execute("DELETE FROM universe WHERE exchange='AU'")
        execute_values(
            cur,
            """
            INSERT INTO universe (symbol, name, exchange, type, currency, updated_at)
            VALUES %s
            ON CONFLICT (symbol) DO UPDATE SET
              name=excluded.name,
              exchange=excluded.exchange,
              type=excluded.type,
              currency=excluded.currency,
              updated_at=excluded.updated_at
            """,
            rows
        )
        con.commit()
        cur.execute("SELECT COUNT(*) FROM universe WHERE exchange='AU'")
        n = cur.fetchone()[0]

    print(f"✅ Universe refresh complete: {n} symbols")
    return n


if __name__ == "__main__":
    try:
        count = refresh_universe()
        print(f"✅ Successfully refreshed {count} ASX symbols")
    except Exception as e:
        print(f"❌ Universe refresh failed: {e}")
        sys.exit(1)
