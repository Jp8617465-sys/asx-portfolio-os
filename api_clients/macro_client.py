"""
api_clients/macro_client.py
Macro data client (FRED fallback) with lightweight caching.
"""

import json
import os
from datetime import datetime
from typing import Dict, Optional

import pandas as pd
import requests

FRED_URL = "https://api.stlouisfed.org/fred/series/observations"
DEFAULT_SERIES = {
    "IRSTCI01AUM156N": "rba_cash_rate",
    "CPIAUCSL": "cpi",
    "UNRATE": "unemployment",
    "DGS2": "yield_2y",
    "DGS10": "yield_10y",
}


def _cache_path(series_id: str, cache_dir: str) -> str:
    return os.path.join(cache_dir, f"fred_{series_id}.json")


def fetch_fred_series(
    api_key: str,
    series_id: str,
    cache_dir: str = "data/cache",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> pd.DataFrame:
    if not api_key:
        raise ValueError("FRED API key is required.")

    os.makedirs(cache_dir, exist_ok=True)
    cache_file = _cache_path(series_id, cache_dir)

    params = {
        "series_id": series_id,
        "api_key": api_key,
        "file_type": "json",
    }
    if start_date:
        params["observation_start"] = start_date
    if end_date:
        params["observation_end"] = end_date

    data = None
    if os.path.exists(cache_file):
        with open(cache_file, "r") as f:
            data = json.load(f)
    else:
        res = requests.get(FRED_URL, params=params, timeout=30)
        res.raise_for_status()
        data = res.json()
        with open(cache_file, "w") as f:
            json.dump(data, f)

    observations = data.get("observations", [])
    if not observations:
        return pd.DataFrame()

    df = pd.DataFrame(observations)[["date", "value"]].copy()
    df["date"] = pd.to_datetime(df["date"]).dt.date
    df["value"] = pd.to_numeric(df["value"], errors="coerce")
    return df


def fetch_macro_data(
    api_key: str,
    series_map: Optional[Dict[str, str]] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> pd.DataFrame:
    series_map = series_map or DEFAULT_SERIES
    frames = []

    for series_id, name in series_map.items():
        df = fetch_fred_series(api_key, series_id, start_date=start_date, end_date=end_date)
        if df.empty:
            continue
        df = df.rename(columns={"date": "dt", "value": name})
        frames.append(df)

    if not frames:
        return pd.DataFrame()

    out = frames[0]
    for frame in frames[1:]:
        out = out.merge(frame, on="dt", how="outer")

    out = out.sort_values("dt")
    if "yield_10y" in out.columns and "yield_2y" in out.columns:
        out["yield_curve_slope"] = out["yield_10y"] - out["yield_2y"]

    out["updated_at"] = datetime.utcnow()
    return out
