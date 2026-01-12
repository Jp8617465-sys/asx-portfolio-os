"""
jobs/derive_fundamentals_features.py
Derive fundamental feature scores and persist to Postgres.
"""

import os

import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine

load_dotenv(dotenv_path=".env", override=True)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise EnvironmentError("DATABASE_URL not set")

engine = create_engine(DATABASE_URL)


def derive_features() -> None:
    df = pd.read_sql("select * from fundamentals", engine)
    if df.empty:
        print("⚠️ No fundamentals available for feature derivation.")
        return

    df["roe"] = pd.to_numeric(df["roe"], errors="coerce")
    df["pe_ratio"] = pd.to_numeric(df["pe_ratio"], errors="coerce")
    df["debt_to_equity"] = pd.to_numeric(df["debt_to_equity"], errors="coerce")

    df["roe_z"] = (df["roe"] - df["roe"].mean()) / df["roe"].std()
    df["pe_inverse"] = 1 / df["pe_ratio"].replace(0, pd.NA)
    df["valuation_score"] = df["roe_z"] + df["pe_inverse"].rank(pct=True)
    df["quality_score"] = df["roe"].rank(pct=True) + (1 - df["debt_to_equity"].rank(pct=True))

    df["as_of"] = pd.to_datetime(df["updated_at"]).dt.date
    out = df[[
        "symbol",
        "as_of",
        "roe_z",
        "pe_inverse",
        "valuation_score",
        "quality_score",
        "updated_at",
    ]].copy()

    out.to_sql("features_fundamental", engine, if_exists="replace", index=False)
    print("✅ Derived fundamental features persisted.")


if __name__ == "__main__":
    derive_features()
