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
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(PROJECT_ROOT)

from api_clients.eodhd_client import fetch_eod_prices_for_symbols

# --- Load environment variables
logger.info("🔧 Loading environment variables...")
load_dotenv(dotenv_path=".env", override=True)
DATABASE_URL = os.getenv("DATABASE_URL")
EODHD_API_KEY = os.getenv("EODHD_API_KEY", "")
LOOKBACK_MONTHS = int(os.getenv("LOOKBACK_MONTHS", "36"))
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "100"))
FETCH_EODHD = os.getenv("FETCH_EODHD", "0") == "1"
EODHD_THROTTLE_S = float(os.getenv("EODHD_THROTTLE_S", "1.2"))

logger.info(f"📋 Configuration:")
logger.info(f"  - LOOKBACK_MONTHS: {LOOKBACK_MONTHS}")
logger.info(f"  - BATCH_SIZE: {BATCH_SIZE}")
logger.info(f"  - FETCH_EODHD: {FETCH_EODHD}")
logger.info(f"  - DATABASE_URL: {'[SET]' if DATABASE_URL else '[NOT SET]'}")
logger.info(f"  - EODHD_API_KEY: {'[SET]' if EODHD_API_KEY else '[NOT SET]'}")

# Log environment info
logger.info("🌍 Environment Information:")
logger.info(f"  - Working Directory: {os.getcwd()}")
logger.info(f"  - Script Location: {os.path.abspath(__file__)}")
logger.info(f"  - Project Root: {PROJECT_ROOT}")
logger.info(f"  - Python Version: {sys.version}")

if not DATABASE_URL or DATABASE_URL.strip() in ["...", ""]:
    logger.error("❌ DATABASE_URL not set in .env — please fix before running.")
    raise ValueError("DATABASE_URL not set in .env — please fix before running.")

start_date = (datetime.utcnow().date() - relativedelta(months=LOOKBACK_MONTHS))
end_date = datetime.utcnow().date()

logger.info(f"📦 Fetching {LOOKBACK_MONTHS} months of price data ({start_date} to {end_date})...")

def _load_symbols(conn):
    logger.info("📊 Loading symbols from database...")
    try:
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
            symbols = [r[0] for r in cur.fetchall()]
            logger.info(f"✅ Loaded {len(symbols)} symbols from database")
            return symbols
    except Exception as e:
        logger.error(f"❌ Failed to load symbols: {e}")
        raise

def _load_prices_batch(conn, symbols):
    logger.debug(f"  Loading prices for {len(symbols)} symbols...")
    query = """
    select symbol, dt, close, volume
    from prices
    where dt >= %s and dt <= %s and symbol = any(%s)
    order by symbol, dt;
    """
    try:
        df = pd.read_sql(query, conn, params=(start_date, end_date, symbols))
        logger.debug(f"  Loaded {len(df)} rows")
        return df
    except Exception as e:
        logger.error(f"❌ Failed to load prices for batch: {e}")
        raise

def _upsert_prices(conn, frame: pd.DataFrame):
    if frame.empty:
        logger.warning("⚠️ No data to upsert (empty DataFrame)")
        return
    logger.info(f"💾 Upserting {len(frame)} price records...")
    rows = [
        (r.dt, r.symbol, r.open, r.high, r.low, r.close, r.volume)
        for r in frame.itertuples(index=False)
    ]
    try:
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
        logger.info(f"✅ Upserted {len(frame)} price records successfully")
    except Exception as e:
        logger.error(f"❌ Failed to upsert prices: {e}")
        raise

logger.info("🔌 Connecting to database...")
try:
    with psycopg2.connect(DATABASE_URL) as con:
        logger.info("✅ Database connection successful")
        
        # Test database connectivity
        with con.cursor() as cur:
            cur.execute("SELECT version()")
            version = cur.fetchone()[0]
            logger.info(f"📊 PostgreSQL Version: {version[:50]}...")
            
            cur.execute("SELECT COUNT(*) FROM prices")
            price_count = cur.fetchone()[0]
            logger.info(f"📊 Existing price records: {price_count:,}")
        
        symbols = _load_symbols(con)

    if FETCH_EODHD:
        if not EODHD_API_KEY:
            logger.error("❌ FETCH_EODHD=1 but EODHD_API_KEY is missing")
            raise ValueError("FETCH_EODHD=1 but EODHD_API_KEY is missing.")
        logger.info("🌐 Backfilling via EODHD before dataset build...")
        try:
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
            else:
                logger.warning("⚠️ No data returned from EODHD")
            time.sleep(0.2)
        except Exception as e:
            logger.error(f"❌ EODHD backfill failed: {e}")
            raise

    logger.info(f"📦 Loading price data in {len(symbols) // BATCH_SIZE + 1} batches...")
    batches = [symbols[i : i + BATCH_SIZE] for i in range(0, len(symbols), BATCH_SIZE)]
    frames = []
    for idx, batch in enumerate(batches, start=1):
        logger.info(f"  - Batch {idx}/{len(batches)}: {len(batch)} symbols")
        frame = _load_prices_batch(con, batch)
        frames.append(frame)
    df = pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()
    
    logger.info(f"✅ Data loading complete: {len(df):,} total rows")

except psycopg2.Error as e:
    logger.error(f"❌ Database error: {e}")
    raise
except Exception as e:
    logger.error(f"❌ Unexpected error during database operations: {e}")
    raise

if df.empty:
    logger.error("❌ No price data found — check that 'prices' table is populated.")
    raise ValueError("No price data found — check that 'prices' table is populated.")

logger.info(f"✅ Loaded {len(df):,} rows across {df['symbol'].nunique()} symbols")

# --- Compute features
logger.info("🔧 Computing features...")
df["close"] = df["close"].astype(float)
df["volume"] = df["volume"].astype(float)

# Calculate returns and momentum features
logger.info("  - Calculating returns and momentum...")
df["ret_1d"] = df.groupby("symbol")["close"].pct_change()
df["mom_6"] = df.groupby("symbol")["close"].transform(lambda x: x.pct_change(126))
df["mom_12_1"] = df.groupby("symbol")["close"].transform(lambda x: x.pct_change(252))

# Volatility: rolling 90-day std of daily returns
logger.info("  - Calculating volatility...")
df["vol_90"] = df.groupby("symbol")["ret_1d"].rolling(90).std().reset_index(0, drop=True)

# ADV: median volume * price over 20 days
logger.info("  - Calculating ADV...")
df["adv_20_median"] = (
    df.groupby("symbol")["volume"].rolling(20).median().reset_index(0, drop=True)
    * df["close"]
)

# SMA200 & slope
logger.info("  - Calculating SMA200 and trend...")
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

logger.info("  - Calculating SMA200 slope...")
df["sma200_slope"] = (
    df.groupby("symbol")["sma_200"]
    .transform(lambda x: x.rolling(20).apply(slope, raw=False))
)
df["sma200_slope_pos"] = df["sma200_slope"] > 0

# --- Compute forward 21-day return (target)
logger.info("  - Computing target variable (forward returns)...")
df["return_1m_fwd"] = (
    df.groupby("symbol")["close"].shift(-21) / df["close"] - 1
)

# --- Drop incomplete rows
logger.info("  - Dropping rows with missing values...")
initial_count = len(df)
df = df.dropna(subset=["mom_6", "mom_12_1", "vol_90", "adv_20_median", "sma_200", "return_1m_fwd"])
logger.info(f"  - Dropped {initial_count - len(df):,} rows with missing values")
logger.info(f"✅ Final dataset shape: {df.shape}")

# --- Create output directories
logger.info("📁 Creating output directories...")
output_dirs = ["outputs", "data/training"]
for dir_path in output_dirs:
    try:
        os.makedirs(dir_path, exist_ok=True)
        logger.info(f"  - Created/verified directory: {dir_path}")
        
        # Check write permissions
        test_file = os.path.join(dir_path, ".write_test")
        try:
            with open(test_file, 'w') as f:
                f.write("test")
            os.remove(test_file)
            logger.info(f"  - Write permissions OK for: {dir_path}")
        except Exception as e:
            logger.error(f"❌ Cannot write to directory {dir_path}: {e}")
            raise
    except Exception as e:
        logger.error(f"❌ Failed to create directory {dir_path}: {e}")
        raise

# --- Save training datasets
logger.info("💾 Saving training datasets...")
output_files = {
    "outputs/model_a_training_dataset_36m.csv": "csv",
    "outputs/model_a_training_dataset_36m.parquet": "parquet",
    "outputs/model_a_training_dataset.csv": "csv",
    "data/training/model_a_training_dataset_36m.csv": "csv",
    "data/training/model_a_training_dataset_36m.parquet": "parquet",
}

for file_path, file_format in output_files.items():
    try:
        logger.info(f"  - Saving {file_path}...")
        if file_format == "csv":
            df.to_csv(file_path, index=False)
        else:
            df.to_parquet(file_path, index=False)
        
        # Verify file was created
        if os.path.exists(file_path):
            file_size = os.path.getsize(file_path)
            logger.info(f"  ✅ Created {file_path} ({file_size:,} bytes)")
        else:
            logger.error(f"  ❌ File not found after write: {file_path}")
            raise FileNotFoundError(f"Failed to create {file_path}")
    except Exception as e:
        logger.error(f"❌ Failed to save {file_path}: {e}")
        raise

logger.info("=" * 70)
logger.info("🎉 TRAINING DATASET GENERATION COMPLETE!")
logger.info("=" * 70)
logger.info(f"📊 Dataset Statistics:")
logger.info(f"  - Total rows: {len(df):,}")
logger.info(f"  - Total symbols: {df['symbol'].nunique()}")
logger.info(f"  - Date range: {df['dt'].min()} to {df['dt'].max()}")
logger.info(f"  - Features: {len(df.columns)}")
logger.info("")
logger.info("📁 Output files:")
for file_path in output_files.keys():
    if os.path.exists(file_path):
        logger.info(f"  ✅ {file_path}")
    else:
        logger.warning(f"  ⚠️ {file_path} (NOT FOUND)")
logger.info("")
logger.info("Sample data:")
print(df.head(5))
logger.info("=" * 70)
