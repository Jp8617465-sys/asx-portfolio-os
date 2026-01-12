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

load_dotenv(dotenv_path=".env", override=True)
DATABASE_URL = os.getenv("DATABASE_URL")
CSV_PATH = os.getenv("ETF_DATA_CSV", "data/etf/etf_data.csv")

if not DATABASE_URL:
    raise SystemExit("DATABASE_URL not set")
if not os.path.exists(CSV_PATH):
    raise SystemExit(f"Missing CSV: {CSV_PATH}")

df = pd.read_csv(CSV_PATH)
df.columns = [c.strip().lower() for c in df.columns]

required = {"symbol"}
missing = required - set(df.columns)
if missing:
    raise SystemExit(f"Missing required columns: {sorted(missing)}")
if df.empty:
    print(f"⚠️ No rows in {CSV_PATH}; nothing to load.")
    raise SystemExit(0)

df["updated_at"] = pd.to_datetime(df["updated_at"]) if "updated_at" in df.columns else datetime.utcnow()

rows = []
for r in df.itertuples(index=False):
    d = r._asdict()
    rows.append((
        d.get("symbol"),
        d.get("etf_name"),
        d.get("sector"),
        d.get("nav"),
        d.get("flow_1w"),
        d.get("flow_1m"),
        d.get("updated_at"),
    ))

sql = """
insert into etf_data (symbol, etf_name, sector, nav, flow_1w, flow_1m, updated_at)
values %s
on conflict (symbol) do update set
  etf_name = excluded.etf_name,
  sector = excluded.sector,
  nav = excluded.nav,
  flow_1w = excluded.flow_1w,
  flow_1m = excluded.flow_1m,
  updated_at = excluded.updated_at
"""

with psycopg2.connect(DATABASE_URL) as con, con.cursor() as cur:
    execute_values(cur, sql, rows)
    con.commit()

print(f"✅ Loaded ETF data: {len(rows)} rows from {CSV_PATH}")
