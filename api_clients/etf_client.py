"""
api_clients/etf_client.py
ETF data client with CSV fallback.
"""

import os
from datetime import datetime

import pandas as pd


def fetch_etf_data(csv_path: str = "data/etf/etf_data.csv") -> pd.DataFrame:
    if os.path.exists(csv_path):
        df = pd.read_csv(csv_path)
    else:
        df = pd.DataFrame()

    if df.empty:
        return df

    df.columns = [c.strip().lower() for c in df.columns]
    if "updated_at" not in df.columns:
        df["updated_at"] = datetime.utcnow()

    return df
