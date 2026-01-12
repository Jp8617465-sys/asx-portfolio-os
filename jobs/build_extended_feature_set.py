"""
jobs/build_extended_feature_set.py
Builds unified feature dataset combining technical, fundamental, macro, and sentiment features.
Ready for use in Model A ML and multi-asset models.
"""

import os
import pandas as pd
import numpy as np
import psycopg2
import requests
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
MACRO_API = os.getenv("FRED_API_KEY", "")
NEWS_API = os.getenv("NEWS_API_KEY", "")

def db():
    return psycopg2.connect(DATABASE_URL)

def _safe_read_sql(query: str, params=None):
    try:
        with db() as con:
            return pd.read_sql(query, con, params=params)
    except Exception as e:
        print("⚠️ SQL fetch failed, returning empty frame:", e)
        return pd.DataFrame()

# --- Load technicals (from prices) ---
def load_technical_features(start_date: str, end_date: str):
    q = """
    select dt as date, symbol, close, volume
    from prices
    where dt between %s and %s
    """
    px = _safe_read_sql(q, params=(start_date, end_date))
    if px.empty:
        return px
    px["ret1"] = px.groupby("symbol")["close"].pct_change()
    px["sma_50"] = px.groupby("symbol")["close"].transform(lambda x: x.rolling(50).mean())
    px["sma_200"] = px.groupby("symbol")["close"].transform(lambda x: x.rolling(200).mean())
    px["sma_ratio"] = px["sma_50"] / px["sma_200"]
    px["vol_90"] = px.groupby("symbol")["ret1"].transform(lambda x: x.rolling(90).std())
    return px

# --- Load fundamentals (from your DB or external API) ---
def load_fundamentals():
    q = """
    select symbol, pe_ratio, eps, roe, debt_to_equity, market_cap, updated_at
    from fundamentals
    where updated_at = (select max(updated_at) from fundamentals)
    """
    return _safe_read_sql(q)

# --- Macro data (FRED or RBA API) ---
def load_macro_features():
    macro = []
    if MACRO_API:
        try:
            # Example: US 10y yield, CPI
            series = {
                "DGS10": "10y_yield",
                "CPIAUCSL": "cpi",
                "UNRATE": "unemployment",
            }
            for fred_id, name in series.items():
                r = requests.get(f"https://api.stlouisfed.org/fred/series/observations",
                                 params={"series_id": fred_id, "api_key": MACRO_API, "file_type": "json"})
                data = pd.DataFrame(r.json()["observations"])[["date", "value"]]
                data["date"] = pd.to_datetime(data["date"])
                data.rename(columns={"value": name}, inplace=True)
                macro.append(data)
        except Exception as e:
            print("Macro fetch failed:", e)
    if macro:
        out = macro[0]
        for m in macro[1:]:
            out = pd.merge(out, m, on="date", how="outer")
        return out.sort_values("date")
    else:
        return pd.DataFrame()

# --- Sentiment (placeholder for NLP pipeline) ---
def load_sentiment():
    # Example structure: date, symbol, sentiment_score
    path = "data/sentiment/daily_sentiment.csv"
    return pd.read_csv(path) if os.path.exists(path) else pd.DataFrame()

# --- ETF & sector data (from universe/ETF tables) ---
def load_etf_features():
    q = "select symbol, etf_name, sector, nav, flow_1w, flow_1m from etf_data;"
    return _safe_read_sql(q)

# --- Merge all sources ---
def build_features(start_date, end_date):
    tech = load_technical_features(start_date, end_date)
    if tech.empty:
        raise ValueError("No technical data loaded; check prices table.")
    fund = load_fundamentals()
    macro = load_macro_features()
    sent = load_sentiment()
    etf = load_etf_features()

    df = tech
    if not fund.empty and "symbol" in fund.columns:
        df = df.merge(fund, on="symbol", how="left")
    if not sent.empty and {"symbol", "date"}.issubset(sent.columns):
        df = df.merge(sent, on=["symbol", "date"], how="left")
    if not macro.empty and "date" in macro.columns:
        df = df.merge(macro, on="date", how="left")
    if not etf.empty and {"symbol", "sector"}.issubset(etf.columns):
        df = df.merge(etf[["symbol", "sector"]], on="symbol", how="left")
    df.dropna(subset=["close"], inplace=True)
    dated_path = f"outputs/featureset_extended_{end_date}.parquet"
    df.to_parquet(dated_path, index=False)
    latest_path = "outputs/featureset_extended_latest.parquet"
    df.to_parquet(latest_path, index=False)
    try:
        link_path = "outputs/featureset_extended_latest.symlink.parquet"
        if os.path.islink(link_path) or os.path.exists(link_path):
            os.remove(link_path)
        os.symlink(os.path.basename(dated_path), link_path)
    except Exception as e:
        print(f"⚠️ Symlink creation failed: {e}")
    print(f"✅ Extended features saved: {len(df)} rows.")
    print(f"📦 Dated parquet: {dated_path}")
    print(f"📌 Latest parquet: {latest_path}")
    return df

if __name__ == "__main__":
    end = datetime.utcnow().date()
    start = end - timedelta(days=760)
    build_features(start, end)
