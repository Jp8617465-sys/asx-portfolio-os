"""
jobs/apply_schemas.py
Apply SQL schema files via psycopg2 (psql fallback).
"""

import os
from dotenv import load_dotenv
import psycopg2

load_dotenv(dotenv_path=".env", override=True)
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise SystemExit("DATABASE_URL not set")

SCHEMAS = [
    "schemas/fundamentals.sql",
    "schemas/etf_data.sql",
    "schemas/sentiment.sql",
    "schemas/macro.sql",
    "schemas/model_a_backtests.sql",
    "schemas/model_a_features_extended.sql",
    "schemas/model_a_predictions.sql",
]

with psycopg2.connect(DATABASE_URL) as con:
    for path in SCHEMAS:
        if not os.path.exists(path):
            raise SystemExit(f"Missing schema file: {path}")
        with open(path, "r") as f:
            sql = f.read().strip()
        if not sql:
            print(f"⚠️ Empty schema: {path}")
            continue
        with con.cursor() as cur:
            cur.execute(sql)
        con.commit()
        print(f"✅ Applied {path}")
