"""
jobs/load_fundamentals_pipeline.py
Fetch fundamentals from yfinance (free) or EODHD (paid) and persist to Postgres.

Environment Variables:
    FUNDAMENTALS_DATA_SOURCE: 'yfinance' (default, free) or 'eodhd' (paid)
    EODHD_API_KEY: Required if using eodhd
    FUNDAMENTALS_MODE: 'sample' or 'full'
"""

import os
import time
from typing import List, Optional

import pandas as pd
import requests
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

# Import logger for structured logging
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core import logger

load_dotenv(dotenv_path=".env", override=True)

# Data source configuration
DATA_SOURCE = os.getenv("FUNDAMENTALS_DATA_SOURCE", "yfinance").lower()  # 'yfinance' or 'eodhd'
API_KEY = os.getenv("EODHD_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")
TICKERS = os.getenv("FUNDAMENTALS_TICKERS", "BHP,CBA,CSL,WES,FMG,WBC")
MODE = os.getenv("FUNDAMENTALS_MODE", "sample").lower()
SOURCE = os.getenv("FUNDAMENTALS_SOURCE", "universe" if MODE == "full" else "env").lower()
MAX_TICKERS = int(os.getenv("FUNDAMENTALS_MAX_TICKERS", "0") or 0)
THROTTLE_S = float(os.getenv("EODHD_FUNDAMENTALS_SLEEP", "2.0"))  # Increased for yfinance
BATCH_SIZE = int(os.getenv("FUNDAMENTALS_BATCH_SIZE", "100"))
BATCH_SLEEP_S = float(os.getenv("FUNDAMENTALS_BATCH_SLEEP", "0.0"))
EODHD_SUFFIX = os.getenv("EODHD_FUNDAMENTALS_SUFFIX", "AU")
HISTORY_MODE = os.getenv("FUNDAMENTALS_HISTORY_MODE", "0") == "1"
USE_PREFECT = os.getenv("USE_PREFECT", "0") == "1"

# Import yfinance client if using yfinance
if DATA_SOURCE == "yfinance":
    from api_clients.yfinance_client import fetch_fundamentals_yfinance
    print(f"ℹ️ Using yfinance (free) for fundamentals data")
elif DATA_SOURCE == "eodhd":
    if not API_KEY:
        raise EnvironmentError("EODHD_API_KEY not set but DATA_SOURCE=eodhd")
    print(f"ℹ️ Using EODHD (paid) for fundamentals data")
else:
    raise ValueError(f"Invalid DATA_SOURCE: {DATA_SOURCE}. Must be 'yfinance' or 'eodhd'")

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

if not DATABASE_URL:
    raise EnvironmentError("DATABASE_URL not set")
if not DATABASE_URL:
    raise EnvironmentError("DATABASE_URL not set")

def _parse_as_of(payload: dict) -> pd.Timestamp:
    meta = payload.get("General", {})
    raw = (
        meta.get("MostRecentQuarter")
        or meta.get("LastUpdated")
        or meta.get("UpdatedAt")
        or meta.get("Date")
    )
    if raw:
        try:
            return pd.to_datetime(raw).normalize()
        except (TypeError, ValueError) as e:
            logger.warning(f"Failed to parse date '{raw}': {e}. Using current date.")
            pass
    return pd.Timestamp.utcnow().normalize()


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
        "as_of": _parse_as_of(payload),
    }])

def _normalize_ticker(raw: str) -> str:
    ticker = raw.strip().upper()
    if ticker.endswith(".AU"):
        ticker = ticker[:-3]
    return ticker

def _load_universe_tickers() -> List[str]:
    with psycopg2.connect(DATABASE_URL) as con, con.cursor() as cur:
        cur.execute("select symbol from universe where exchange = 'AU'")
        rows = cur.fetchall()
    tickers = [_normalize_ticker(r[0]) for r in rows if r and r[0]]
    return sorted(set(tickers))


@task(retries=3, retry_delay_seconds=10)
def fetch_fundamentals(ticker: str) -> pd.DataFrame:
    """Fetch fundamentals using configured data source (yfinance or eodhd)."""
    if DATA_SOURCE == "yfinance":
        # Use yfinance client
        data = fetch_fundamentals_yfinance(ticker, throttle_s=THROTTLE_S)
        if not data:
            raise RuntimeError(f"Failed to fetch {ticker} from yfinance")
        # Convert dict to DataFrame
        df = pd.DataFrame([data])
        print(f"✅ Pulled fundamentals for {ticker} (yfinance)")
        return df
    else:
        # Use EODHD (original implementation)
        symbol = f"{ticker}.{EODHD_SUFFIX}" if EODHD_SUFFIX else ticker
        url = f"https://eodhd.com/api/fundamentals/{symbol}?api_token={API_KEY}&fmt=json"
        resp = requests.get(url, timeout=30)
        if resp.status_code != 200:
            raise RuntimeError(f"Failed for {ticker}: {resp.text[:200]}")
        df = _parse_fundamentals(ticker, resp.json())
        print(f"✅ Pulled fundamentals for {ticker} (eodhd)")
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
            d.get("revenue_growth_yoy"),
            d.get("profit_margin"),
            d.get("current_ratio"),
            d.get("quick_ratio"),
            d.get("eps_growth"),
            d.get("free_cash_flow"),
        ))

    sql = """
    insert into fundamentals (
        symbol, sector, industry, pe_ratio, pb_ratio, eps, roe, debt_to_equity,
        market_cap, div_yield, updated_at, revenue_growth_yoy, profit_margin,
        current_ratio, quick_ratio, eps_growth, free_cash_flow
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
      div_yield = excluded.div_yield,
      revenue_growth_yoy = excluded.revenue_growth_yoy,
      profit_margin = excluded.profit_margin,
      current_ratio = excluded.current_ratio,
      quick_ratio = excluded.quick_ratio,
      eps_growth = excluded.eps_growth,
      free_cash_flow = excluded.free_cash_flow
    """

    with psycopg2.connect(DATABASE_URL) as con, con.cursor() as cur:
        execute_values(cur, sql, rows)
        if HISTORY_MODE:
            history_rows = _build_history_rows(df)
            if history_rows:
                _persist_history(cur, history_rows)
        con.commit()
    print(f"✅ Persisted fundamentals rows: {len(rows)}")


def _build_history_rows(df: pd.DataFrame) -> List[tuple]:
    history_rows: List[tuple] = []
    metrics = [
        "pe_ratio",
        "pb_ratio",
        "eps",
        "roe",
        "debt_to_equity",
        "market_cap",
        "div_yield",
    ]
    for r in df.itertuples(index=False):
        d = r._asdict()
        symbol = d.get("symbol")
        as_of = d.get("as_of")
        if not symbol or as_of is None:
            continue
        as_of_date = pd.to_datetime(as_of).date()
        for metric in metrics:
            value = d.get(metric)
            if value is None:
                continue
            history_rows.append((symbol, as_of_date, metric, value, "eodhd"))
    return history_rows


def _persist_history(cur, rows: List[tuple]) -> None:
    sql = """
    insert into fundamentals_history (symbol, as_of, metric, value, source)
    values %s
    on conflict (symbol, as_of, metric) do update set
      value = excluded.value,
      source = excluded.source
    """
    execute_values(cur, sql, rows)
    print(f"✅ Persisted fundamentals_history rows: {len(rows)}")


def get_ticker_list(
    mode: Optional[str] = None,
    source: Optional[str] = None,
    max_tickers: Optional[int] = None,
) -> List[str]:
    resolved_mode = (mode or MODE).lower()
    resolved_source = (source or SOURCE).lower()
    resolved_max = MAX_TICKERS if max_tickers is None else max_tickers

    if resolved_source == "universe":
        tickers = _load_universe_tickers()
    else:
        tickers = [_normalize_ticker(t) for t in TICKERS.split(",") if t.strip()]

    if resolved_max and resolved_max > 0:
        tickers = tickers[:resolved_max]

    if resolved_mode == "full":
        print("ℹ️ FUNDAMENTALS_MODE=full enabled.")
    else:
        print("ℹ️ FUNDAMENTALS_MODE=sample (set FUNDAMENTALS_MODE=full for universe ingestion).")

    return tickers


@flow
def fundamentals_pipeline(tickers: List[str]) -> None:
    total = len(tickers)
    if total == 0:
        print("⚠️ No tickers provided.")
        return

    print(f"🚀 Fundamentals run: {total} tickers | batch={BATCH_SIZE} | throttle={THROTTLE_S}s")

    for start in range(0, total, BATCH_SIZE):
        batch = tickers[start:start + BATCH_SIZE]
        collected = []

        for ticker in batch:
            try:
                collected.append(fetch_fundamentals(ticker))
                time.sleep(THROTTLE_S)
            except Exception as exc:
                logger.error(f"Failed to fetch fundamentals for {ticker}: {exc}")
                # Continue with other tickers instead of silently failing

        if collected:
            persist_to_db(pd.concat(collected, ignore_index=True))

        done = min(start + BATCH_SIZE, total)
        print(f"✅ Batch complete: {done}/{total}")
        if BATCH_SLEEP_S:
            time.sleep(BATCH_SLEEP_S)


if __name__ == "__main__":
    fundamentals_pipeline(get_ticker_list())
