"""
jobs/load_fundamentals.py
Load fundamentals from CSV into Supabase/Postgres.
"""

import os
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv
from datetime import datetime

load_dotenv(dotenv_path=".env", override=True)
DATABASE_URL = os.getenv("DATABASE_URL")
CSV_PATH = os.getenv("FUNDAMENTALS_CSV", "data/fundamentals/fundamentals.csv")

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

def get(col):
    return df[col] if col in df.columns else None

df["updated_at"] = pd.to_datetime(get("updated_at") if "updated_at" in df.columns else datetime.utcnow())

rows = []
for r in df.itertuples(index=False):
    d = r._asdict()
    rows.append((
        d.get("symbol"),
        d.get("pe_ratio"),
        d.get("eps"),
        d.get("roe"),
        d.get("debt_to_equity"),
        d.get("market_cap"),
        d.get("updated_at"),
    ))

sql = """
insert into fundamentals (symbol, pe_ratio, eps, roe, debt_to_equity, market_cap, updated_at)
values %s
on conflict (symbol, updated_at) do update set
  pe_ratio = excluded.pe_ratio,
  eps = excluded.eps,
  roe = excluded.roe,
  debt_to_equity = excluded.debt_to_equity,
  market_cap = excluded.market_cap
"""

with psycopg2.connect(DATABASE_URL) as con, con.cursor() as cur:
    execute_values(cur, sql, rows)
    con.commit()

print(f"✅ Loaded fundamentals: {len(rows)} rows from {CSV_PATH}")
