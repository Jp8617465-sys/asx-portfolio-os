"""
jobs/apply_schemas.py
Apply SQL schema files via psycopg2 (psql fallback).
"""

import glob
import os
from dotenv import load_dotenv
import psycopg2

load_dotenv(dotenv_path=".env", override=True)
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise SystemExit("DATABASE_URL not set")

schema_files = sorted(glob.glob("schemas/*.sql"))
if not schema_files:
    raise SystemExit("No schema files found in schemas/.")

with psycopg2.connect(DATABASE_URL) as con:
    for path in schema_files:
        with open(path, "r") as f:
            sql = f.read().strip()
        if not sql:
            print(f"⚠️ Empty schema: {path}")
            continue
        with con.cursor() as cur:
            cur.execute(sql)
        con.commit()
        print(f"✅ Applied {path}")
