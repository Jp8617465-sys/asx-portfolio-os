"""
jobs/load_sentiment.py
Load sentiment data into Postgres (NewsAPI fallback).
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

from api_clients.news_client import fetch_news_sentiment

def main():
    load_dotenv(dotenv_path=".env", override=True)
    database_url = os.getenv("DATABASE_URL")
    news_api_key = os.getenv("NEWS_API_KEY", "")
    csv_path = os.getenv("SENTIMENT_CSV", "data/sentiment/daily_sentiment.csv")
    news_query = os.getenv("NEWS_QUERY", "ASX OR Australia stock")

    if not database_url:
        raise SystemExit("DATABASE_URL not set")

    os.makedirs(os.path.dirname(csv_path), exist_ok=True)

    if news_api_key:
        df_raw = fetch_news_sentiment(news_api_key, news_query)
    else:
        df_raw = pd.read_csv(csv_path) if os.path.exists(csv_path) else pd.DataFrame()

    if df_raw.empty:
        print("⚠️ No sentiment data available; nothing to load.")
        raise SystemExit(0)

    df_raw.columns = [c.strip().lower() for c in df_raw.columns]
    if "dt" in df_raw.columns:
        df_raw["dt"] = pd.to_datetime(df_raw["dt"]).dt.date
    if "updated_at" not in df_raw.columns:
        df_raw["updated_at"] = datetime.utcnow()

    if "symbol" in df_raw.columns:
        grouped = df_raw.copy()
    elif "sentiment_score" in df_raw.columns:
        grouped = df_raw.groupby(["dt"]).agg(
            sentiment_score=("sentiment_score", "mean"),
            updated_at=("updated_at", "max"),
        ).reset_index()
    else:
        grouped = df_raw[["dt", "updated_at"]].dropna().copy()
        grouped["sentiment_score"] = 0.0

    # Persist CSV snapshot
    if news_api_key:
        grouped.to_csv(csv_path, index=False)

    rows = []
    for r in grouped.itertuples(index=False):
        d = r._asdict()
        rows.append((
            d.get("symbol"),
            d.get("dt"),
            d.get("finbert_mean"),
            d.get("news_polarity"),
            float(d.get("sentiment_score")) if d.get("sentiment_score") is not None else None,
            d.get("source") or ("newsapi" if news_api_key else "csv"),
            d.get("updated_at"),
        ))

    sql = """
    insert into sentiment (symbol, dt, finbert_mean, news_polarity, sentiment_score, source, updated_at)
    values %s
    """

    with psycopg2.connect(database_url) as con, con.cursor() as cur:
        execute_values(cur, sql, rows)
        con.commit()

    print(f"✅ Loaded sentiment data: {len(rows)} rows")


if __name__ == "__main__":
    main()
