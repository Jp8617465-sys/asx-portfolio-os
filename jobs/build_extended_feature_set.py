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
    select dt as date, symbol, open, high, low, close, volume
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
    px["adv_20"] = px.groupby("symbol")["volume"].transform(lambda x: x.rolling(20).median()) * px["close"]
    px["adv_zscore"] = px.groupby("symbol")["adv_20"].transform(lambda x: (x - x.rolling(252).mean()) / x.rolling(252).std())

    prev_close = px.groupby("symbol")["close"].shift(1)
    tr = pd.concat(
        [
            (px["high"] - px["low"]).abs(),
            (px["high"] - prev_close).abs(),
            (px["low"] - prev_close).abs(),
        ],
        axis=1,
    ).max(axis=1)
    px["atr_14"] = tr.groupby(px["symbol"]).transform(lambda x: x.rolling(14).mean())
    px["atr_pct"] = px["atr_14"] / px["close"]
    px["volume_skew_60"] = px.groupby("symbol")["volume"].transform(lambda x: x.rolling(60).skew())
    return px

# --- Load fundamentals (from your DB or external API) ---
def load_fundamentals():
    q = """
    select symbol, pe_ratio, pb_ratio, eps, roe, debt_to_equity, market_cap, period_end, updated_at
    from fundamentals
    where updated_at = (select max(updated_at) from fundamentals)
    """
    return _safe_read_sql(q)

# --- Macro data (FRED or RBA API) ---
def load_macro_features():
    q = """
    select dt as date, rba_cash_rate, cpi, unemployment, yield_2y, yield_10y, yield_curve_slope
    from macro_data
    order by dt
    """
    macro_db = _safe_read_sql(q)
    if not macro_db.empty:
        return macro_db

    macro = []
    if MACRO_API:
        try:
            series = {
                "IRSTCI01AUM156N": "rba_cash_rate",
                "CPIAUCSL": "cpi",
                "UNRATE": "unemployment",
                "DGS2": "yield_2y",
                "DGS10": "yield_10y",
            }
            for fred_id, name in series.items():
                r = requests.get(
                    "https://api.stlouisfed.org/fred/series/observations",
                    params={"series_id": fred_id, "api_key": MACRO_API, "file_type": "json"},
                    timeout=30,
                )
                data = pd.DataFrame(r.json()["observations"])[["date", "value"]]
                data["date"] = pd.to_datetime(data["date"])
                data.rename(columns={"value": name}, inplace=True)
                macro.append(data)
        except Exception as e:
            print("Macro fetch failed:", e)
    if not macro:
        return pd.DataFrame()

    out = macro[0]
    for m in macro[1:]:
        out = pd.merge(out, m, on="date", how="outer")
    out = out.sort_values("date")
    if "yield_10y" in out.columns and "yield_2y" in out.columns:
        out["yield_curve_slope"] = pd.to_numeric(out["yield_10y"], errors="coerce") - pd.to_numeric(out["yield_2y"], errors="coerce")
    return out

# --- Sentiment (placeholder for NLP pipeline) ---
def load_sentiment():
    # Example structure: date, symbol, sentiment_score
    path = "data/sentiment/daily_sentiment.csv"
    df = pd.read_csv(path) if os.path.exists(path) else pd.DataFrame()
    if not df.empty and "dt" in df.columns and "date" not in df.columns:
        df = df.rename(columns={"dt": "date"})
    return df

# --- ETF & sector data (from universe/ETF tables) ---
def load_etf_features():
    q = """
    select symbol, etf_name, sector, nav, return_1w, return_1m, sector_flow_1w, sector_flow_1m, flow_1w, flow_1m
    from etf_data;
    """
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

    # Valuation z-scores (cross-sectional)
    if "pe_ratio" in df.columns:
        df["pe_ratio_zscore"] = df.groupby("date")["pe_ratio"].transform(lambda x: (x - x.mean()) / x.std())
    if "pb_ratio" in df.columns:
        df["pb_ratio_zscore"] = df.groupby("date")["pb_ratio"].transform(lambda x: (x - x.mean()) / x.std())
    if "roe" in df.columns:
        df["roe_ratio"] = df["roe"]
    if "debt_to_equity" in df.columns:
        df["debt_to_equity_ratio"] = df["debt_to_equity"]

    # Macro deltas
    for col in ("cpi", "yield_curve_slope", "yield_10y"):
        if col in df.columns:
            df[f"delta_{col}"] = df.groupby("symbol")[col].transform(lambda x: x.diff())
    if "rba_cash_rate" in df.columns:
        df["delta_rba_rate"] = df.groupby("symbol")["rba_cash_rate"].transform(lambda x: x.diff())

    # Sentiment composite
    sentiment_cols = [c for c in ["finbert_mean", "news_polarity", "sentiment_score"] if c in df.columns]
    if sentiment_cols:
        df["sentiment_composite"] = df[sentiment_cols].mean(axis=1)

    # ETF sector spread (if benchmark provided)
    if "return_1m" in df.columns and "asx200_return_1m" in df.columns:
        df["sector_spread_1m"] = df["return_1m"] - df["asx200_return_1m"]
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
