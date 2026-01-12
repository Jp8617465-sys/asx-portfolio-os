import os
import pandas as pd
import numpy as np
from datetime import timedelta
from dotenv import load_dotenv
import psycopg2

# --- Load environment variables
load_dotenv(dotenv_path=".env", override=True)
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL or DATABASE_URL.strip() in ["...", ""]:
    raise ValueError("DATABASE_URL not set in .env — please fix before running.")

# --- Connect to Supabase/Postgres
con = psycopg2.connect(DATABASE_URL)

# --- Pull last 25 months of data from prices table
query = """
select symbol, dt, close, volume
from prices
where dt >= (current_date - interval '25 months')
order by symbol, dt;
"""
print("📦 Fetching 25 months of price data ...")
df = pd.read_sql(query, con)
con.close()

if df.empty:
    raise ValueError("No price data found — check that 'prices' table is populated.")

print(f"✅ Loaded {len(df):,} rows across {df['symbol'].nunique()} symbols")

# --- Compute features
df["close"] = df["close"].astype(float)
df["volume"] = df["volume"].astype(float)

# Calculate returns and momentum features
df["ret_1d"] = df.groupby("symbol")["close"].pct_change()
df["mom_6"] = df.groupby("symbol")["close"].transform(lambda x: x.pct_change(126))
df["mom_12_1"] = df.groupby("symbol")["close"].transform(lambda x: x.pct_change(252))

# Volatility: rolling 90-day std of daily returns
df["vol_90"] = df.groupby("symbol")["ret_1d"].rolling(90).std().reset_index(0, drop=True)

# ADV: median volume * price over 20 days
df["adv_20_median"] = (
    df.groupby("symbol")["volume"].rolling(20).median().reset_index(0, drop=True)
    * df["close"]
)

# SMA200 & slope
df["sma_200"] = df.groupby("symbol")["close"].transform(lambda x: x.rolling(200).mean())
df["trend_200"] = df["close"] > df["sma_200"]

# Slope of SMA200 (positive or not)
def slope(series):
    if series.isna().sum() > 0:
        return np.nan
    y = series.values
    x = np.arange(len(y))
    a, b = np.polyfit(x, y, 1)
    return a

df["sma200_slope"] = (
    df.groupby("symbol")["sma_200"]
    .transform(lambda x: x.rolling(20).apply(slope, raw=False))
)
df["sma200_slope_pos"] = df["sma200_slope"] > 0

# --- Compute forward 21-day return (target)
df["return_1m_fwd"] = (
    df.groupby("symbol")["close"].shift(-21) / df["close"] - 1
)

# --- Drop incomplete rows
df = df.dropna(subset=["mom_6", "mom_12_1", "vol_90", "adv_20_median", "sma_200", "return_1m_fwd"])

# --- Output
os.makedirs("outputs", exist_ok=True)
out_path = "outputs/model_a_training_dataset.csv"
df.to_csv(out_path, index=False)
print(f"💾 Saved training dataset → {out_path}")
print(f"✅ Final dataset shape: {df.shape}")
print("Sample:")
print(df.head(5))
