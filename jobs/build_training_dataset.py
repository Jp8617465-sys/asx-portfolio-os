import os
import sys
import time
import pandas as pd
import numpy as np
from datetime import datetime
from dateutil.relativedelta import relativedelta
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import execute_values

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(PROJECT_ROOT)

from api_clients.eodhd_client import fetch_eod_prices_for_symbols

# --- Load environment variables
load_dotenv(dotenv_path=".env", override=True)
DATABASE_URL = os.getenv("DATABASE_URL")
EODHD_API_KEY = os.getenv("EODHD_API_KEY", "")
LOOKBACK_MONTHS = int(os.getenv("LOOKBACK_MONTHS", "36"))
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "100"))
FETCH_EODHD = os.getenv("FETCH_EODHD", "0") == "1"
EODHD_THROTTLE_S = float(os.getenv("EODHD_THROTTLE_S", "1.2"))

if not DATABASE_URL or DATABASE_URL.strip() in ["...", ""]:
    raise ValueError("DATABASE_URL not set in .env — please fix before running.")

start_date = (datetime.utcnow().date() - relativedelta(months=LOOKBACK_MONTHS))
end_date = datetime.utcnow().date()

print(f"📦 Fetching {LOOKBACK_MONTHS} months of price data ...")

def _load_symbols(conn):
    with conn.cursor() as cur:
        cur.execute(
            """
            select distinct symbol
            from prices
            where dt >= %s
            order by symbol
            """,
            (start_date,),
        )
        return [r[0] for r in cur.fetchall()]

def _load_prices_batch(conn, symbols):
    query = """
    select symbol, dt, close, volume
    from prices
    where dt >= %s and dt <= %s and symbol = any(%s)
    order by symbol, dt;
    """
    return pd.read_sql(query, conn, params=(start_date, end_date, symbols))

def _upsert_prices(conn, frame: pd.DataFrame):
    if frame.empty:
        return
    rows = [
        (r.dt, r.symbol, r.open, r.high, r.low, r.close, r.volume)
        for r in frame.itertuples(index=False)
    ]
    with conn.cursor() as cur:
        execute_values(
            cur,
            """
            insert into prices (dt, symbol, open, high, low, close, volume)
            values %s
            on conflict (dt, symbol) do update set
              open = excluded.open,
              high = excluded.high,
              low = excluded.low,
              close = excluded.close,
              volume = excluded.volume
            """,
            rows,
        )
        conn.commit()

with psycopg2.connect(DATABASE_URL) as con:
    symbols = _load_symbols(con)

    if FETCH_EODHD:
        if not EODHD_API_KEY:
            raise ValueError("FETCH_EODHD=1 but EODHD_API_KEY is missing.")
        print("🌐 Backfilling via EODHD before dataset build...")
        eod_df = fetch_eod_prices_for_symbols(
            symbols,
            api_key=EODHD_API_KEY,
            start_date=start_date.isoformat(),
            end_date=end_date.isoformat(),
            batch_size=BATCH_SIZE,
            throttle_s=EODHD_THROTTLE_S,
        )
        if not eod_df.empty:
            _upsert_prices(con, eod_df)
        time.sleep(0.2)

    batches = [symbols[i : i + BATCH_SIZE] for i in range(0, len(symbols), BATCH_SIZE)]
    frames = []
    for idx, batch in enumerate(batches, start=1):
        print(f"  - Batch {idx}/{len(batches)}: {len(batch)} symbols")
        frame = _load_prices_batch(con, batch)
        frames.append(frame)
    df = pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()

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

os.makedirs("outputs", exist_ok=True)
os.makedirs("data/training", exist_ok=True)

csv_out = "outputs/model_a_training_dataset_36m.csv"
parquet_out = "outputs/model_a_training_dataset_36m.parquet"
df.to_csv(csv_out, index=False)
df.to_parquet(parquet_out, index=False)

legacy_out = "outputs/model_a_training_dataset.csv"
df.to_csv(legacy_out, index=False)

data_csv = "data/training/model_a_training_dataset_36m.csv"
data_parquet = "data/training/model_a_training_dataset_36m.parquet"
df.to_csv(data_csv, index=False)
df.to_parquet(data_parquet, index=False)

print(f"💾 Saved training dataset → {csv_out}")
print(f"💾 Saved training parquet → {parquet_out}")
print(f"✅ Final dataset shape: {df.shape}")
print("Sample:")
print(df.head(5))
