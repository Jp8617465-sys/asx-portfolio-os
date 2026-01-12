"""
jobs/load_macro.py
Load macro data into Postgres (FRED/RBA fallback).
"""

import os
import sys
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv
from datetime import datetime

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(PROJECT_ROOT)

from api_clients.macro_client import fetch_macro_data

def main():
    load_dotenv(dotenv_path=".env", override=True)
    database_url = os.getenv("DATABASE_URL")
    fred_api_key = os.getenv("FRED_API_KEY", "")
    csv_path = os.getenv("MACRO_CSV", "data/macro/macro.csv")

    if not database_url:
        raise SystemExit("DATABASE_URL not set")

    os.makedirs(os.path.dirname(csv_path), exist_ok=True)

    if fred_api_key:
        df = fetch_macro_data(fred_api_key)
    else:
        df = pd.read_csv(csv_path) if os.path.exists(csv_path) else pd.DataFrame()

    if df.empty:
        print("⚠️ No macro data available; nothing to load.")
        raise SystemExit(0)

    df.columns = [c.strip().lower() for c in df.columns]
    if "dt" in df.columns:
        df["dt"] = pd.to_datetime(df["dt"]).dt.date
    if "updated_at" not in df.columns:
        df["updated_at"] = datetime.utcnow()

    # Save CSV snapshot
    if fred_api_key:
        df.to_csv(csv_path, index=False)

    rows = []
    for r in df.itertuples(index=False):
        d = r._asdict()
        rows.append((
            d.get("dt"),
            d.get("rba_cash_rate"),
            d.get("cpi"),
            d.get("unemployment"),
            d.get("yield_2y"),
            d.get("yield_10y"),
            d.get("yield_curve_slope"),
            d.get("updated_at"),
        ))

    sql = """
    insert into macro_data (dt, rba_cash_rate, cpi, unemployment, yield_2y, yield_10y, yield_curve_slope, updated_at)
    values %s
    on conflict (dt) do update set
      rba_cash_rate = excluded.rba_cash_rate,
      cpi = excluded.cpi,
      unemployment = excluded.unemployment,
      yield_2y = excluded.yield_2y,
      yield_10y = excluded.yield_10y,
      yield_curve_slope = excluded.yield_curve_slope,
      updated_at = excluded.updated_at
    """

    with psycopg2.connect(database_url) as con, con.cursor() as cur:
        execute_values(cur, sql, rows)
        con.commit()

    print(f"✅ Loaded macro data: {len(rows)} rows")


if __name__ == "__main__":
    main()
