"""
jobs/load_fundamentals_pipeline.py
Fetch fundamentals from EODHD and persist to Postgres.
"""

import os
import time
from typing import List

import pandas as pd
import requests
from dotenv import load_dotenv
from sqlalchemy import create_engine
from prefect import flow, task

load_dotenv(dotenv_path=".env", override=True)

API_KEY = os.getenv("EODHD_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")
TICKERS = os.getenv("FUNDAMENTALS_TICKERS", "BHP,CBA,CSL,WES,FMG,WBC")
THROTTLE_S = float(os.getenv("EODHD_FUNDAMENTALS_SLEEP", "1"))
EXCHANGE_PREFIX = os.getenv("EODHD_EXCHANGE_PREFIX", "ASX")

if not API_KEY:
    raise EnvironmentError("EODHD_API_KEY not set")
if not DATABASE_URL:
    raise EnvironmentError("DATABASE_URL not set")

engine = create_engine(DATABASE_URL)


def _parse_fundamentals(ticker: str, payload: dict) -> pd.DataFrame:
    highlights = payload.get("Highlights", {})
    valuation = payload.get("Valuation", {})
    ratios = payload.get("Financials", {}).get("Ratios", {})
    meta = payload.get("General", {})

    return pd.DataFrame([{
        "symbol": f"{ticker}.AU",
        "sector": meta.get("Sector"),
        "industry": meta.get("Industry"),
        "market_cap": highlights.get("MarketCapitalization"),
        "pe_ratio": valuation.get("TrailingPE"),
        "pb_ratio": valuation.get("PriceBookMRQ"),
        "eps": highlights.get("EarningsShare"),
        "roe": ratios.get("ReturnOnEquityTTM"),
        "debt_to_equity": ratios.get("TotalDebtEquityTTM"),
        "div_yield": highlights.get("DividendYield"),
        "updated_at": pd.Timestamp.utcnow(),
    }])


@task(retries=3, retry_delay_seconds=10)
def fetch_fundamentals(ticker: str) -> pd.DataFrame:
    url = f"https://eodhd.com/api/fundamentals/{EXCHANGE_PREFIX}.{ticker}?api_token={API_KEY}&fmt=json"
    resp = requests.get(url, timeout=30)
    if resp.status_code != 200:
        raise RuntimeError(f"Failed for {ticker}: {resp.text[:200]}")
    return _parse_fundamentals(ticker, resp.json())


@task
def persist_to_db(df: pd.DataFrame) -> None:
    if df.empty:
        print("⚠️ No fundamentals to persist.")
        return
    df.to_sql("fundamentals", engine, if_exists="append", index=False)
    print(f"✅ Persisted fundamentals rows: {len(df)}")


@flow
def fundamentals_pipeline(tickers: List[str]) -> None:
    collected = []
    for ticker in tickers:
        try:
            collected.append(fetch_fundamentals(ticker))
            time.sleep(THROTTLE_S)
        except Exception as exc:
            print(f"Error for {ticker}: {exc}")

    if collected:
        persist_to_db(pd.concat(collected, ignore_index=True))


if __name__ == "__main__":
    ticker_list = [t.strip() for t in TICKERS.split(",") if t.strip()]
    fundamentals_pipeline(ticker_list)
