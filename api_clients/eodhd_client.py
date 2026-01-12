"""
api_clients/eodhd_client.py
EODHD price client with batching + throttling.
"""

import json
import os
import time
from typing import Iterable, List

import pandas as pd
import requests

API_BASE = "https://eodhd.com/api"
DEFAULT_TIMEOUT = 30


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
