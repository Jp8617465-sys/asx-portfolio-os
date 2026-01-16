#!/usr/bin/env python3
"""
Generate signals for all stocks using trained Model A.
This script loads the trained classifier and regressor, fetches latest
stock data, runs inference, and saves signals to the database.

Usage:
    python jobs/generate_signals.py
"""

import os
import sys
import json
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
import psycopg2
import joblib
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

def load_models():
    """Load trained Model A classifier and regressor."""
    model_dir = Path(__file__).parent.parent / "models"

    classifier_path = model_dir / "model_a_v1_4_classifier.pkl"
    regressor_path = model_dir / "model_a_v1_4_regressor.pkl"
    features_path = model_dir / "model_a_v1_4_features.json"

    if not classifier_path.exists():
        raise FileNotFoundError(f"Classifier not found: {classifier_path}")
    if not regressor_path.exists():
        raise FileNotFoundError(f"Regressor not found: {regressor_path}")
    if not features_path.exists():
        raise FileNotFoundError(f"Features not found: {features_path}")

    print("🤖 Loading Model A...")
    classifier = joblib.load(classifier_path)
    regressor = joblib.load(regressor_path)

    with open(features_path, 'r') as f:
        features_config = json.load(f)
        feature_names = features_config['features']

    print(f"   ✅ Classifier loaded")
    print(f"   ✅ Regressor loaded")
    print(f"   ✅ Features: {len(feature_names)}")

    return classifier, regressor, feature_names


def fetch_latest_data(conn, lookback_days=400):
    """Fetch latest stock data with features."""
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=lookback_days)

    print(f"\n📊 Fetching data from {start_date} to {end_date}...")

    query = f"""
        SELECT symbol, dt, close, volume
        FROM prices
        WHERE dt >= '{start_date}' AND dt <= '{end_date}'
        ORDER BY symbol, dt
    """

    df = pd.read_sql(query, conn)
    print(f"   ✅ Loaded {len(df):,} rows for {df['symbol'].nunique()} symbols")

    return df


def compute_features(df):
    """Compute technical features for inference."""
    print("\n⚙️  Computing features...")

    df['close'] = df['close'].astype(float)
    df['volume'] = df['volume'].astype(float)

    # Daily returns
    df['ret_1d'] = df.groupby('symbol')['close'].pct_change()

    # Momentum
    df['mom_6'] = df.groupby('symbol')['close'].transform(lambda x: x.pct_change(126))
    df['mom_12_1'] = df.groupby('symbol')['close'].transform(lambda x: x.pct_change(252))

    # Volatility
    df['vol_90'] = df.groupby('symbol')['ret_1d'].rolling(90).std().reset_index(0, drop=True)

    # Dollar volume
    df['adv_20_median'] = (df.groupby('symbol')['volume'].rolling(20).median().reset_index(0, drop=True) * df['close'])

    # Moving averages
    df['sma_200'] = df.groupby('symbol')['close'].transform(lambda x: x.rolling(200).mean())
    df['trend_200'] = (df['close'] > df['sma_200']).astype(int)

    # SMA slope
    def slope(series):
        if series.isna().sum() > 0:
            return np.nan
        y = series.values
        x = np.arange(len(y))
        a, b = np.polyfit(x, y, 1)
        return a

    df['sma200_slope'] = df.groupby('symbol')['sma_200'].transform(
        lambda x: x.rolling(20).apply(slope, raw=False)
    )
    df['sma200_slope_pos'] = (df['sma200_slope'] > 0).astype(int)

    print("   ✅ Features computed")

    return df


def generate_signals(df, classifier, regressor, feature_names):
    """Generate signals for latest data point per symbol."""
    print("\n🎯 Generating signals...")

    # Get latest data point for each symbol
    latest = df.sort_values('dt').groupby('symbol').tail(1).copy()

    # Drop rows with missing features
    latest = latest.dropna(subset=feature_names)

    print(f"   ✅ Processing {len(latest)} symbols with complete data")

    # Prepare features
    X = latest[feature_names]

    # Run inference
    prob_up = classifier.predict_proba(X)[:, 1]
    expected_return = regressor.predict(X)

    # Create signals dataframe
    signals = pd.DataFrame({
        'symbol': latest['symbol'].values,
        'dt': latest['dt'].values,
        'close': latest['close'].values,
        'prob_up': prob_up,
        'expected_return': expected_return,
    })

    # Determine signal based on probability and expected return
    def classify_signal(row):
        if row['prob_up'] >= 0.65 and row['expected_return'] > 0.05:
            return 'STRONG_BUY'
        elif row['prob_up'] >= 0.55 and row['expected_return'] > 0:
            return 'BUY'
        elif row['prob_up'] <= 0.35 and row['expected_return'] < -0.05:
            return 'STRONG_SELL'
        elif row['prob_up'] <= 0.45 and row['expected_return'] < 0:
            return 'SELL'
        else:
            return 'HOLD'

    signals['signal'] = signals.apply(classify_signal, axis=1)
    signals['confidence'] = (abs(signals['prob_up'] - 0.5) * 200).astype(int)

    # Signal distribution
    signal_counts = signals['signal'].value_counts()
    print(f"\n   📊 Signal Distribution:")
    for signal, count in signal_counts.items():
        pct = count / len(signals) * 100
        print(f"      {signal:15s}: {count:4d} ({pct:5.1f}%)")

    return signals


def save_signals(signals, conn):
    """Save signals to database."""
    print(f"\n💾 Saving {len(signals)} signals to database...")

    # Prepare data for insertion
    records = []
    as_of = datetime.now().date()

    for _, row in signals.iterrows():
        records.append((
            row['symbol'],
            as_of,
            row['signal'],
            row['confidence'],
            row['close'],
            row['prob_up'],
            row['expected_return'],
            'model_a_v1_2'
        ))

    # Insert into database (upsert)
    with conn.cursor() as cur:
        # Create temp table
        cur.execute("""
            CREATE TEMP TABLE temp_signals (
                symbol TEXT,
                as_of DATE,
                signal TEXT,
                confidence INT,
                last_price NUMERIC,
                prob_up NUMERIC,
                expected_return NUMERIC,
                model_version TEXT
            )
        """)

        # Insert into temp table
        from psycopg2.extras import execute_values
        execute_values(
            cur,
            """
            INSERT INTO temp_signals VALUES %s
            """,
            records
        )

        # Upsert into signals table
        cur.execute("""
            INSERT INTO signals (symbol, as_of, signal, confidence, last_price, prob_up, expected_return, model_version)
            SELECT symbol, as_of, signal, confidence, last_price, prob_up, expected_return, model_version
            FROM temp_signals
            ON CONFLICT (symbol, as_of)
            DO UPDATE SET
                signal = EXCLUDED.signal,
                confidence = EXCLUDED.confidence,
                last_price = EXCLUDED.last_price,
                prob_up = EXCLUDED.prob_up,
                expected_return = EXCLUDED.expected_return,
                model_version = EXCLUDED.model_version,
                updated_at = NOW()
        """)

        conn.commit()

    print("   ✅ Signals saved successfully")


def main():
    """Main execution."""
    print("="*60)
    print("🚀 ASX Portfolio OS - Signal Generation")
    print("="*60)

    # Get database URL
    DATABASE_URL = os.getenv('DATABASE_URL')
    if not DATABASE_URL:
        raise SystemExit("❌ DATABASE_URL environment variable not set")

    try:
        # Load models
        classifier, regressor, feature_names = load_models()

        # Connect to database
        print("\n🔌 Connecting to database...")
        conn = psycopg2.connect(DATABASE_URL)
        print("   ✅ Connected")

        # Fetch data
        df = fetch_latest_data(conn)

        # Compute features
        df = compute_features(df)

        # Generate signals
        signals = generate_signals(df, classifier, regressor, feature_names)

        # Save to database
        save_signals(signals, conn)

        conn.close()

        print("\n" + "="*60)
        print("✅ Signal Generation Complete!")
        print("="*60)
        print(f"\n📊 Summary:")
        print(f"   Total signals: {len(signals)}")
        print(f"   Date: {datetime.now().date()}")
        print(f"   Model: model_a_v1_2")
        print("\n🚀 Signals are now available via API:")
        print("   curl https://asx-portfolio-os.onrender.com/api/v1/signals/live/CBA.AX")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
