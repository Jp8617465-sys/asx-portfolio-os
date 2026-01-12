"""
jobs/load_etf_data.py
Load ETF data from CSV into Supabase/Postgres.
"""

import os
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv
from datetime import datetime

def main():
    load_dotenv(dotenv_path=".env", override=True)
    database_url = os.getenv("DATABASE_URL")
    csv_path = os.getenv("ETF_DATA_CSV", "data/etf/etf_data.csv")

    if not database_url:
        raise SystemExit("DATABASE_URL not set")
    if not os.path.exists(csv_path):
        raise SystemExit(f"Missing CSV: {csv_path}")

    df = pd.read_csv(csv_path)
    df.columns = [c.strip().lower() for c in df.columns]

    required = {"symbol"}
    missing = required - set(df.columns)
    if missing:
        raise SystemExit(f"Missing required columns: {sorted(missing)}")
    if df.empty:
        print(f"⚠️ No rows in {csv_path}; nothing to load.")
        raise SystemExit(0)

    # Re-save to enforce normalized columns
    df.to_csv(csv_path, index=False)

    df["updated_at"] = pd.to_datetime(df["updated_at"]) if "updated_at" in df.columns else datetime.utcnow()

    rows = []
    for r in df.itertuples(index=False):
        d = r._asdict()
        rows.append((
            d.get("symbol"),
            d.get("etf_name"),
            d.get("sector"),
            d.get("nav"),
            d.get("return_1w"),
            d.get("return_1m"),
            d.get("sector_flow_1w"),
            d.get("sector_flow_1m"),
            d.get("flow_1w"),
            d.get("flow_1m"),
            d.get("updated_at"),
        ))

    sql = """
    insert into etf_data (symbol, etf_name, sector, nav, return_1w, return_1m, sector_flow_1w, sector_flow_1m, flow_1w, flow_1m, updated_at)
    values %s
    on conflict (symbol) do update set
      etf_name = excluded.etf_name,
      sector = excluded.sector,
      nav = excluded.nav,
      return_1w = excluded.return_1w,
      return_1m = excluded.return_1m,
      sector_flow_1w = excluded.sector_flow_1w,
      sector_flow_1m = excluded.sector_flow_1m,
      flow_1w = excluded.flow_1w,
      flow_1m = excluded.flow_1m,
      updated_at = excluded.updated_at
    """

    with psycopg2.connect(database_url) as con, con.cursor() as cur:
        execute_values(cur, sql, rows)
        con.commit()

    print(f"✅ Loaded ETF data: {len(rows)} rows from {csv_path}")


if __name__ == "__main__":
    main()
