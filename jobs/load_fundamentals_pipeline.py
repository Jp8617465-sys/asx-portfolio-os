"""
jobs/load_fundamentals_pipeline.py
Fetch fundamentals from EODHD and persist to Postgres.
"""

import os
import time
from typing import List

import pandas as pd
import requests
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env", override=True)

API_KEY = os.getenv("EODHD_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")
TICKERS = os.getenv("FUNDAMENTALS_TICKERS", "BHP,CBA,CSL,WES,FMG,WBC")
THROTTLE_S = float(os.getenv("EODHD_FUNDAMENTALS_SLEEP", "1"))
EODHD_SUFFIX = os.getenv("EODHD_FUNDAMENTALS_SUFFIX", "AU")
USE_PREFECT = os.getenv("USE_PREFECT", "0") == "1"

if USE_PREFECT:
    from prefect import flow, task
else:
    def task(fn=None, **_kwargs):
        if fn is None:
            def wrapper(inner_fn):
                return inner_fn
            return wrapper
        return fn

    def flow(fn):
        return fn

if not API_KEY:
    raise EnvironmentError("EODHD_API_KEY not set")
if not DATABASE_URL:
    raise EnvironmentError("DATABASE_URL not set")

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
    symbol = f"{ticker}.{EODHD_SUFFIX}" if EODHD_SUFFIX else ticker
    url = f"https://eodhd.com/api/fundamentals/{symbol}?api_token={API_KEY}&fmt=json"
    resp = requests.get(url, timeout=30)
    if resp.status_code != 200:
        raise RuntimeError(f"Failed for {ticker}: {resp.text[:200]}")
    df = _parse_fundamentals(ticker, resp.json())
    print(f"✅ Pulled fundamentals for {ticker}")
    return df


@task
def persist_to_db(df: pd.DataFrame) -> None:
    if df.empty:
        print("⚠️ No fundamentals to persist.")
        return
    rows = []
    for r in df.itertuples(index=False):
        d = r._asdict()
        rows.append((
            d.get("symbol"),
            d.get("sector"),
            d.get("industry"),
            d.get("pe_ratio"),
            d.get("pb_ratio"),
            d.get("eps"),
            d.get("roe"),
            d.get("debt_to_equity"),
            d.get("market_cap"),
            d.get("div_yield"),
            d.get("updated_at"),
        ))

    sql = """
    insert into fundamentals (
        symbol, sector, industry, pe_ratio, pb_ratio, eps, roe, debt_to_equity,
        market_cap, div_yield, updated_at
    ) values %s
    on conflict (symbol, updated_at) do update set
      sector = excluded.sector,
      industry = excluded.industry,
      pe_ratio = excluded.pe_ratio,
      pb_ratio = excluded.pb_ratio,
      eps = excluded.eps,
      roe = excluded.roe,
      debt_to_equity = excluded.debt_to_equity,
      market_cap = excluded.market_cap,
      div_yield = excluded.div_yield
    """

    with psycopg2.connect(DATABASE_URL) as con, con.cursor() as cur:
        execute_values(cur, sql, rows)
        con.commit()
    print(f"✅ Persisted fundamentals rows: {len(rows)}")


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
