"""
api_clients/eodhd_client.py
EODHD price client with batching + throttling.
Also supports fundamentals data fetching.
"""

import json
import os
import time
from datetime import datetime, timezone
from typing import Dict, Iterable, List, Optional

import pandas as pd
import requests

API_BASE = "https://eodhd.com/api"
DEFAULT_TIMEOUT = 30

# Setup logger
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core import logger


def _cache_path(symbol: str, start_date: str, end_date: str, cache_dir: str) -> str:
    safe_symbol = symbol.replace("/", "_")
    return os.path.join(cache_dir, f"eod_{safe_symbol}_{start_date}_{end_date}.json")


def fetch_eod_prices_for_symbol(
    symbol: str,
    api_key: str,
    start_date: str,
    end_date: str,
    throttle_s: float = 1.2,
    cache_dir: str = "data/cache",
) -> pd.DataFrame:
    if not api_key:
        raise ValueError("EODHD API key is required.")

    os.makedirs(cache_dir, exist_ok=True)
    cache_file = _cache_path(symbol, start_date, end_date, cache_dir)
    if os.path.exists(cache_file):
        with open(cache_file, "r") as f:
            data = json.load(f)
    else:
        url = f"{API_BASE}/eod/{symbol}"
        params = {
            "api_token": api_key,
            "fmt": "json",
            "from": start_date,
            "to": end_date,
        }
        res = requests.get(url, params=params, timeout=DEFAULT_TIMEOUT)
        if res.status_code != 200:
            snippet = (res.text or "")[:200].replace("\n", " ")
            raise RuntimeError(f"EODHD error {res.status_code} for {symbol}: {snippet}")
        data = res.json()
        with open(cache_file, "w") as f:
            json.dump(data, f)
        time.sleep(throttle_s)

    if not data:
        return pd.DataFrame()

    if isinstance(data, dict) and data.get("code"):
        return pd.DataFrame()

    df = pd.DataFrame(data)
    if df.empty:
        return df

    df.rename(
        columns={
            "date": "dt",
            "open": "open",
            "high": "high",
            "low": "low",
            "close": "close",
            "volume": "volume",
        },
        inplace=True,
    )
    df["dt"] = pd.to_datetime(df["dt"]).dt.date
    df["symbol"] = symbol
    return df[["dt", "symbol", "open", "high", "low", "close", "volume"]]


def fetch_eod_prices_for_symbols(
    symbols: Iterable[str],
    api_key: str,
    start_date: str,
    end_date: str,
    batch_size: int = 100,
    throttle_s: float = 1.2,
) -> pd.DataFrame:
    all_frames: List[pd.DataFrame] = []
    symbols = list(symbols)
    batches = [symbols[i : i + batch_size] for i in range(0, len(symbols), batch_size)]

    for batch_idx, batch in enumerate(batches, start=1):
        print(f"EODHD batch {batch_idx}/{len(batches)}: {len(batch)} symbols")
        for symbol in batch:
            try:
                frame = fetch_eod_prices_for_symbol(
                    symbol,
                    api_key=api_key,
                    start_date=start_date,
                    end_date=end_date,
                    throttle_s=throttle_s,
                )
                if not frame.empty:
                    all_frames.append(frame)
            except Exception as exc:
                print(f"⚠️ EODHD fetch failed for {symbol}: {exc}")

    if not all_frames:
        return pd.DataFrame()
    return pd.concat(all_frames, ignore_index=True)


def fetch_fundamentals_eodhd(
    ticker: str,
    api_key: str = None,
    throttle_s: float = 2.0
) -> Optional[Dict]:
    """
    Fetch fundamental data from EODHD API.

    Args:
        ticker: Stock symbol (e.g., 'BHP')
        api_key: EODHD API key (defaults to env var)
        throttle_s: Sleep duration after request

    Returns:
        Dict with fundamental metrics or None if error

    Example:
        >>> fund = fetch_fundamentals_eodhd('BHP')
        >>> print(fund['pe_ratio'], fund['sector'])
    """
    api_key = api_key or os.getenv("EODHD_API_KEY")
    if not api_key:
        logger.error("EODHD_API_KEY not set")
        return None

    # Ensure ticker has .AU suffix
    symbol = f"{ticker}.AU" if not ticker.endswith('.AU') else ticker

    url = f"{API_BASE}/fundamentals/{symbol}"
    params = {"api_token": api_key, "fmt": "json"}

    try:
        response = requests.get(url, params=params, timeout=DEFAULT_TIMEOUT)
        response.raise_for_status()
        data = response.json()

        # Parse nested structure from EODHD response
        general = data.get('General', {})
        highlights = data.get('Highlights', {})
        valuation = data.get('Valuation', {})
        financials = data.get('Financials', {})
        balance_sheet = financials.get('Balance_Sheet', {})
        yearly = balance_sheet.get('yearly', {})
        ratios = financials.get('Ratios', {})

        # Extract most recent quarter date
        period_end = general.get('MostRecentQuarter')
        if not period_end:
            period_end = general.get('LastUpdated')

        fundamentals = {
            'symbol': symbol,
            'sector': general.get('Sector'),
            'industry': general.get('Industry'),
            'market_cap': highlights.get('MarketCapitalization'),
            'pe_ratio': valuation.get('TrailingPE'),
            'pb_ratio': valuation.get('PriceBookMRQ'),
            'eps': highlights.get('EarningsShare'),
            'roe': ratios.get('ReturnOnEquityTTM') or yearly.get('ReturnOnEquityTTM'),
            'debt_to_equity': ratios.get('TotalDebtEquityTTM') or yearly.get('TotalDebtEquityTTM'),
            'div_yield': highlights.get('DividendYield'),
            'period_end': period_end,
            'updated_at': datetime.now(timezone.utc)
        }

        time.sleep(throttle_s)
        logger.debug(f"Fetched fundamentals for {ticker}: {fundamentals['sector']}, PE={fundamentals['pe_ratio']}")
        return fundamentals

    except requests.exceptions.HTTPError as e:
        status_code = e.response.status_code if e.response else 'unknown'
        logger.warning(f"EODHD fundamentals HTTP error for {ticker}: {status_code}")
        return None
    except requests.exceptions.RequestException as e:
        logger.warning(f"EODHD fundamentals request failed for {ticker}: {e}")
        return None
    except (KeyError, ValueError, TypeError) as e:
        logger.warning(f"EODHD fundamentals parse error for {ticker}: {e}")
        return None


def fetch_fundamentals_batch(
    tickers: List[str],
    api_key: str = None,
    batch_size: int = 100,
    throttle_s: float = 2.0
) -> List[Dict]:
    """
    Batch fetch fundamentals with throttling.

    Args:
        tickers: List of stock symbols
        api_key: EODHD API key (defaults to env var)
        batch_size: Number of requests before extra sleep
        throttle_s: Sleep duration between requests

    Returns:
        List of fundamental dicts (excludes failures)

    Example:
        >>> funds = fetch_fundamentals_batch(['BHP', 'CBA', 'CSL'])
        >>> print(f"Fetched {len(funds)} stocks")
    """
    results = []
    total = len(tickers)

    for i, ticker in enumerate(tickers):
        logger.info(f"Fetching {ticker} ({i+1}/{total})")
        fund = fetch_fundamentals_eodhd(ticker, api_key, throttle_s)
        if fund:
            results.append(fund)

        # Extra sleep every batch_size requests to avoid rate limits
        if (i + 1) % batch_size == 0:
            logger.info(f"Batch checkpoint: {i+1}/{total} - sleeping 5s")
            time.sleep(5.0)

    logger.info(f"✅ Batch complete: {len(results)}/{total} successful")
    return results
