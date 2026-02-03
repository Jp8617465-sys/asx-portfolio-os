"""
jobs/build_extended_feature_set.py
Builds unified feature dataset combining technical, fundamental, macro, and sentiment features.
Ready for use in Model A ML and multi-asset models.
"""

import os
import sys
import pandas as pd
import numpy as np
import psycopg2
import requests
from dotenv import load_dotenv
from datetime import datetime, timedelta

# Import logger for structured logging
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core import logger

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
    except psycopg2.Error as e:
        logger.error(f"SQL fetch failed: {e}")
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

    # Daily returns
    px["ret1"] = px.groupby("symbol")["close"].pct_change()
    px["ret_1d"] = px["ret1"]  # Alias for consistency

    # Multiple timeframe momentum (NEW!)
    px["mom_1"] = px.groupby("symbol")["close"].transform(lambda x: x.pct_change(21))
    px["mom_3"] = px.groupby("symbol")["close"].transform(lambda x: x.pct_change(63))
    px["mom_6"] = px.groupby("symbol")["close"].transform(lambda x: x.pct_change(126))
    px["mom_12_1"] = px.groupby("symbol")["close"].transform(lambda x: x.pct_change(252))

    # SMAs
    px["sma_50"] = px.groupby("symbol")["close"].transform(lambda x: x.rolling(50).mean())
    px["sma_200"] = px.groupby("symbol")["close"].transform(lambda x: x.rolling(200).mean())
    px["sma_ratio"] = px["sma_50"] / px["sma_200"]
    px["trend_200"] = (px["close"] > px["sma_200"]).astype(int)

    # Multiple timeframe volatility (NEW!)
    px["vol_30"] = px.groupby("symbol")["ret1"].transform(lambda x: x.rolling(30).std())
    px["vol_60"] = px.groupby("symbol")["ret1"].transform(lambda x: x.rolling(60).std())
    px["vol_90"] = px.groupby("symbol")["ret1"].transform(lambda x: x.rolling(90).std())
    px["vol_ratio_30_90"] = px["vol_30"] / px["vol_90"]  # NEW!

    # Volume features
    px["adv_20"] = px.groupby("symbol")["volume"].transform(lambda x: x.rolling(20).median()) * px["close"]
    px["adv_20_median"] = px["adv_20"]  # Alias for consistency
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
    SELECT DISTINCT ON (symbol)
        symbol, pe_ratio, pb_ratio, eps, roe, debt_to_equity, market_cap, div_yield, sector, industry, period_end,
        -- V2 additions for Model B
        revenue_growth_yoy, profit_margin, current_ratio, quick_ratio, eps_growth, free_cash_flow
    FROM fundamentals
    WHERE pe_ratio IS NOT NULL OR market_cap IS NOT NULL
    ORDER BY symbol, updated_at DESC
    """
    return _safe_read_sql(q)

def load_fundamental_features():
    q = """
    select symbol, as_of, roe_z, pe_inverse, valuation_score, quality_score
    from features_fundamental
    """
    df = _safe_read_sql(q)
    if df.empty:
        return df
    df["date"] = pd.to_datetime(df["as_of"]).dt.date
    return df.drop(columns=["as_of"])

def load_fundamental_trends():
    q = """
    select symbol, metric, window_size, mean_value, pct_change, slope, volatility, as_of
    from features_fundamental_trends
    """
    df = _safe_read_sql(q)
    if df.empty:
        return df
    df["date"] = pd.to_datetime(df["as_of"]).dt.date
    window = int(os.getenv("FUNDAMENTALS_TREND_WINDOW", "0") or 0)
    if window:
        df = df[df["window_size"] == window]
    return df

def _pivot_trends(df: pd.DataFrame, value_col: str, suffix: str) -> pd.DataFrame:
    wide = df.pivot_table(index=["symbol", "date"], columns="metric", values=value_col)
    wide.columns = [f"fund_trend_{suffix}_{c}" for c in wide.columns]
    wide = wide.reset_index()
    return wide

def load_risk_snapshot():
    q = """
    select symbol, as_of, sector, factor_vol, beta_market
    from risk_exposure_snapshot
    where as_of = (select max(as_of) from risk_exposure_snapshot)
    """
    df = _safe_read_sql(q)
    if df.empty:
        return df
    df["date"] = pd.to_datetime(df["as_of"]).dt.date
    return df.drop(columns=["as_of"])

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

# --- ASX announcements NLP signals ---
def load_asx_announcements():
    q = """
    select dt as date, code, sentiment, event_type, confidence, stance, relevance_score
    from nlp_announcements
    """
    df = _safe_read_sql(q)
    if df.empty:
        return df

    df["symbol"] = df["code"].astype(str).str.strip() + ".AU"
    df["sentiment"] = df["sentiment"].astype(str).str.lower()
    df["stance"] = df["stance"].astype(str).str.lower()
    df["confidence"] = pd.to_numeric(df["confidence"], errors="coerce").fillna(0)
    df["relevance_score"] = pd.to_numeric(df["relevance_score"], errors="coerce").fillna(0)
    sentiment_map = {"positive": 1, "negative": -1, "neutral": 0}
    df["sentiment_score"] = df["sentiment"].map(sentiment_map).fillna(0) * df["confidence"]
    df["announcement_count"] = 1
    for event in ("guidance", "dividend", "acquisition", "earnings"):
        df[f"event_{event}"] = (df["event_type"] == event).astype(int)
    for stance in ("bullish", "bearish", "neutral"):
        df[f"stance_{stance}"] = (df["stance"] == stance).astype(int)

    agg = (
        df.groupby(["date", "symbol"], as_index=False)
        .agg(
            asx_sentiment_score=("sentiment_score", "mean"),
            asx_sentiment_confidence=("confidence", "mean"),
            asx_announcement_count=("announcement_count", "sum"),
            asx_event_guidance=("event_guidance", "sum"),
            asx_event_dividend=("event_dividend", "sum"),
            asx_event_acquisition=("event_acquisition", "sum"),
            asx_event_earnings=("event_earnings", "sum"),
            asx_stance_bullish=("stance_bullish", "sum"),
            asx_stance_bearish=("stance_bearish", "sum"),
            asx_stance_neutral=("stance_neutral", "sum"),
            asx_relevance_score=("relevance_score", "mean"),
        )
    )
    return agg

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
    fund_features = load_fundamental_features()
    fund_trends = load_fundamental_trends()
    macro = load_macro_features()
    sent = load_sentiment()
    announcements = load_asx_announcements()
    etf = load_etf_features()
    risk_snapshot = load_risk_snapshot()

    df = tech
    if not fund.empty and "symbol" in fund.columns:
        df = df.merge(fund, on="symbol", how="left")
    if not fund_features.empty and {"symbol", "date"}.issubset(fund_features.columns):
        df = df.merge(fund_features, on=["symbol", "date"], how="left")
    if not fund_trends.empty and {"symbol", "date", "metric"}.issubset(fund_trends.columns):
        mean_wide = _pivot_trends(fund_trends, "mean_value", "mean")
        pct_wide = _pivot_trends(fund_trends, "pct_change", "pct")
        slope_wide = _pivot_trends(fund_trends, "slope", "slope")
        vol_wide = _pivot_trends(fund_trends, "volatility", "vol")
        df = df.merge(mean_wide, on=["symbol", "date"], how="left")
        df = df.merge(pct_wide, on=["symbol", "date"], how="left")
        df = df.merge(slope_wide, on=["symbol", "date"], how="left")
        df = df.merge(vol_wide, on=["symbol", "date"], how="left")
    if not sent.empty and {"symbol", "date"}.issubset(sent.columns):
        df = df.merge(sent, on=["symbol", "date"], how="left")
    if not announcements.empty and {"symbol", "date"}.issubset(announcements.columns):
        df = df.merge(announcements, on=["symbol", "date"], how="left")
    if not macro.empty and "date" in macro.columns:
        df = df.merge(macro, on="date", how="left")
    if not etf.empty and {"symbol", "sector"}.issubset(etf.columns):
        df = df.merge(etf[["symbol", "sector"]], on="symbol", how="left")
    if not risk_snapshot.empty and "symbol" in risk_snapshot.columns:
        df = df.merge(
            risk_snapshot[["symbol", "factor_vol", "beta_market"]],
            on="symbol",
            how="left",
        )

    # Valuation z-scores (cross-sectional)
    if "pe_ratio" in df.columns:
        df["pe_ratio_zscore"] = df.groupby("date")["pe_ratio"].transform(lambda x: (x - x.mean()) / x.std())
    if "pb_ratio" in df.columns:
        df["pb_ratio_zscore"] = df.groupby("date")["pb_ratio"].transform(lambda x: (x - x.mean()) / x.std())
    if "roe" in df.columns:
        df["roe_ratio"] = df["roe"]
    if "debt_to_equity" in df.columns:
        df["debt_to_equity_ratio"] = df["debt_to_equity"]

    # V2 Model B fundamental features
    if "pe_ratio" in df.columns and "pe_ratio" in df.columns:
        df["pe_inverse"] = 1 / df["pe_ratio"].replace(0, np.nan)
        df["pe_inverse_zscore"] = df.groupby("date")["pe_inverse"].transform(lambda x: (x - x.mean()) / x.std())

    # Financial health score (combines profitability, liquidity, leverage)
    if all(c in df.columns for c in ["roe", "current_ratio", "debt_to_equity"]):
        # Normalize each component (handle missing values)
        roe_norm = df.groupby("date")["roe"].transform(lambda x: (x - x.mean()) / x.std()).fillna(0)
        current_norm = df.groupby("date")["current_ratio"].transform(lambda x: (x - x.mean()) / x.std()).fillna(0)
        debt_norm = df.groupby("date")["debt_to_equity"].transform(lambda x: (x.mean() - x) / x.std()).fillna(0)  # Inverted (lower is better)
        df["financial_health_score"] = (roe_norm + current_norm + debt_norm) / 3

    # Value score (combines P/E, P/B, ROE)
    if all(c in df.columns for c in ["pe_inverse", "pb_ratio", "roe"]):
        pe_inv_rank = df.groupby("date")["pe_inverse"].rank(pct=True)
        pb_inv_rank = df.groupby("date")["pb_ratio"].transform(lambda x: 1 - x.rank(pct=True))  # Lower P/B is better
        roe_rank = df.groupby("date")["roe"].rank(pct=True)
        df["value_score"] = (pe_inv_rank + pb_inv_rank + roe_rank) / 3

    # Quality score (profitability + growth)
    if all(c in df.columns for c in ["roe", "profit_margin", "revenue_growth_yoy"]):
        roe_rank = df.groupby("date")["roe"].rank(pct=True)
        margin_rank = df.groupby("date")["profit_margin"].rank(pct=True)
        growth_rank = df.groupby("date")["revenue_growth_yoy"].rank(pct=True)
        df["quality_score_v2"] = (roe_rank + margin_rank + growth_rank) / 3

    # Macro deltas
    for col in ("cpi", "yield_curve_slope", "yield_10y"):
        if col in df.columns:
            df[f"delta_{col}"] = df.groupby("symbol")[col].transform(lambda x: x.diff())
    if "rba_cash_rate" in df.columns:
        df["delta_rba_rate"] = df.groupby("symbol")["rba_cash_rate"].transform(lambda x: x.diff())

    # SMA200 slope (NEW!)
    if "sma_200" in df.columns:
        def slope(series):
            if series.isna().sum() > 0 or len(series) < 2:
                return np.nan
            y = series.values
            x = np.arange(len(y))
            try:
                a, b = np.polyfit(x, y, 1)
                return a
            except (ValueError, TypeError, np.linalg.LinAlgError):
                return np.nan

        df["sma200_slope"] = df.groupby("symbol")["sma_200"].transform(
            lambda x: x.rolling(20).apply(slope, raw=False)
        )
        df["sma200_slope_pos"] = (df["sma200_slope"] > 0).astype(int)

    # Forward returns (TARGET) (NEW!)
    df["return_1m_fwd"] = df.groupby("symbol")["close"].shift(-21) / df["close"] - 1
    df["return_1m_fwd_sign"] = (df["return_1m_fwd"] > 0).astype(int)

    # Sentiment composite
    sentiment_cols = [c for c in ["finbert_mean", "news_polarity", "sentiment_score", "asx_sentiment_score"] if c in df.columns]
    if sentiment_cols:
        df["sentiment_composite"] = df[sentiment_cols].mean(axis=1)

    # Ensure NLP columns exist even if announcements are empty
    nlp_cols = [
        "asx_sentiment_score",
        "asx_sentiment_confidence",
        "asx_announcement_count",
        "asx_event_guidance",
        "asx_event_dividend",
        "asx_event_acquisition",
        "asx_event_earnings",
        "asx_stance_bullish",
        "asx_stance_bearish",
        "asx_stance_neutral",
        "asx_relevance_score",
    ]
    for col in nlp_cols:
        if col not in df.columns:
            df[col] = np.nan

    # ETF sector spread (if benchmark provided)
    if "return_1m" in df.columns and "asx200_return_1m" in df.columns:
        df["sector_spread_1m"] = df["return_1m"] - df["asx200_return_1m"]
    df.dropna(subset=["close"], inplace=True)

    # Save to parquet files (backup)
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

    # PERFORMANCE OPTIMIZATION: Write to database for fast API access
    try:
        logger.info(f"Writing {len(df)} feature rows to database...")
        with db() as con:
            # Write to model_a_features_extended table
            # This allows API to read pre-computed features instead of computing on-demand
            df.to_sql(
                "model_a_features_extended",
                con,
                if_exists="replace",  # Replace existing data
                index=False,
                method="multi",  # Batch insert for performance
                chunksize=1000
            )
            con.commit()
        logger.info("✅ Features successfully written to database")
        print("✅ Features written to database: model_a_features_extended")
    except Exception as e:
        logger.error(f"Failed to write features to database: {e}")
        print(f"⚠️ Database write failed (features still in parquet): {e}")

    print(f"✅ Extended features saved: {len(df)} rows.")
    print(f"📦 Dated parquet: {dated_path}")
    print(f"📌 Latest parquet: {latest_path}")
    print("💾 Database table: model_a_features_extended")
    return df

if __name__ == "__main__":
    end = datetime.utcnow().date()
    start = end - timedelta(days=760)
    build_features(start, end)
