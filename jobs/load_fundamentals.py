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

def main():
    load_dotenv(dotenv_path=".env", override=True)
    database_url = os.getenv("DATABASE_URL")
    csv_path = os.getenv("FUNDAMENTALS_CSV", "data/fundamentals/fundamentals.csv")

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

    def get(col):
        return df[col] if col in df.columns else None

    df["updated_at"] = pd.to_datetime(get("updated_at") if "updated_at" in df.columns else datetime.utcnow())
    if "period_end" in df.columns:
        df["period_end"] = pd.to_datetime(df["period_end"]).dt.date
    elif "quarter_end" in df.columns:
        df["period_end"] = pd.to_datetime(df["quarter_end"]).dt.date
    else:
        df["period_end"] = pd.NaT

    rows = []
    for r in df.itertuples(index=False):
        d = r._asdict()
        rows.append((
            d.get("symbol"),
            d.get("pe_ratio"),
            d.get("pb_ratio"),
            d.get("eps"),
            d.get("roe"),
            d.get("debt_to_equity"),
            d.get("market_cap"),
            d.get("period_end"),
            d.get("updated_at"),
        ))

    sql = """
    insert into fundamentals (symbol, pe_ratio, pb_ratio, eps, roe, debt_to_equity, market_cap, period_end, updated_at)
    values %s
    on conflict (symbol, updated_at) do update set
      pe_ratio = excluded.pe_ratio,
      pb_ratio = excluded.pb_ratio,
      eps = excluded.eps,
      roe = excluded.roe,
      debt_to_equity = excluded.debt_to_equity,
      market_cap = excluded.market_cap,
      period_end = excluded.period_end
    """

    with psycopg2.connect(database_url) as con, con.cursor() as cur:
        execute_values(cur, sql, rows)
        con.commit()

    print(f"✅ Loaded fundamentals: {len(rows)} rows from {csv_path}")


if __name__ == "__main__":
    main()
