#!/usr/bin/env python3
"""
Generate signals for all stocks using trained Model B (fundamentals).
This script loads the trained classifier, fetches latest fundamental data,
runs inference, and saves signals to the model_b_ml_signals table.

Usage:
    python jobs/generate_signals_model_b.py
"""

import os
import sys
import json
from datetime import datetime
from pathlib import Path
import pandas as pd
import numpy as np
import psycopg2
from psycopg2.extras import execute_values
import joblib
from dotenv import load_dotenv

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))
from app.core import logger

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
MODEL_VERSION = "v1_0"

def load_model():
    """Load trained Model B classifier and features."""
    model_dir = Path(__file__).parent.parent / "models"

    classifier_path = model_dir / f"model_b_{MODEL_VERSION}_classifier.pkl"
    features_path = model_dir / f"model_b_{MODEL_VERSION}_features.json"

    if not classifier_path.exists():
        raise FileNotFoundError(f"Model B classifier not found: {classifier_path}")
    if not features_path.exists():
        raise FileNotFoundError(f"Model B features not found: {features_path}")

    logger.info("🤖 Loading Model B (fundamentals)...")
    classifier = joblib.load(classifier_path)

    with open(features_path, 'r') as f:
        features_config = json.load(f)
        feature_names = features_config['features']

    logger.info(f"   ✅ Classifier loaded: {MODEL_VERSION}")
    logger.info(f"   ✅ Features: {len(feature_names)}")

    return classifier, feature_names


def fetch_latest_fundamentals(conn):
    """Fetch latest fundamental data for all stocks."""
    logger.info("\n📊 Fetching latest fundamental data...")

    query = """
        SELECT DISTINCT ON (symbol)
            symbol,
            pe_ratio,
            pb_ratio,
            roe,
            debt_to_equity,
            profit_margin,
            revenue_growth_yoy,
            current_ratio,
            quick_ratio,
            eps_growth,
            market_cap,
            div_yield,
            sector,
            industry,
            updated_at
        FROM fundamentals
        WHERE updated_at >= NOW() - INTERVAL '30 days'
        ORDER BY symbol, updated_at DESC
    """

    df = pd.read_sql(query, conn)
    logger.info(f"   ✅ Loaded fundamentals for {len(df)} symbols")

    return df


def compute_derived_features(df):
    """Compute derived fundamental features."""
    logger.info("\n⚙️  Computing derived features...")

    # PE inverse
    df['pe_inverse'] = 1 / df['pe_ratio'].replace(0, np.nan)

    # Cross-sectional z-scores
    if 'pe_ratio' in df.columns:
        df['pe_ratio_zscore'] = (df['pe_ratio'] - df['pe_ratio'].mean()) / df['pe_ratio'].std()
    if 'pb_ratio' in df.columns:
        df['pb_ratio_zscore'] = (df['pb_ratio'] - df['pb_ratio'].mean()) / df['pb_ratio'].std()

    # Financial health score
    if all(c in df.columns for c in ['roe', 'current_ratio', 'debt_to_equity']):
        roe_norm = (df['roe'] - df['roe'].mean()) / df['roe'].std()
        current_norm = (df['current_ratio'] - df['current_ratio'].mean()) / df['current_ratio'].std()
        debt_norm = (df['debt_to_equity'].mean() - df['debt_to_equity']) / df['debt_to_equity'].std()  # Inverted
        df['financial_health_score'] = (roe_norm.fillna(0) + current_norm.fillna(0) + debt_norm.fillna(0)) / 3

    # Value score
    if all(c in df.columns for c in ['pe_inverse', 'pb_ratio', 'roe']):
        pe_inv_rank = df['pe_inverse'].rank(pct=True)
        pb_inv_rank = 1 - df['pb_ratio'].rank(pct=True)
        roe_rank = df['roe'].rank(pct=True)
        df['value_score'] = (pe_inv_rank + pb_inv_rank + roe_rank) / 3

    # Quality score
    if all(c in df.columns for c in ['roe', 'profit_margin', 'revenue_growth_yoy']):
        roe_rank = df['roe'].rank(pct=True)
        margin_rank = df['profit_margin'].rank(pct=True)
        growth_rank = df['revenue_growth_yoy'].rank(pct=True)
        df['quality_score_v2'] = (roe_rank + margin_rank + growth_rank) / 3

    # Additional ratios
    df['roe_ratio'] = df['roe']
    df['debt_to_equity_ratio'] = df['debt_to_equity']

    logger.info("   ✅ Derived features computed")

    return df


def generate_signals(df, classifier, feature_names):
    """Generate Model B signals."""
    logger.info("\n🎯 Generating Model B signals...")

    # Filter to stocks with sufficient data
    required_coverage = 0.8
    df['coverage'] = df[feature_names].notna().sum(axis=1) / len(feature_names)
    df_valid = df[df['coverage'] >= required_coverage].copy()

    logger.info(f"   ✅ Processing {len(df_valid)} symbols with >{required_coverage:.0%} feature coverage")

    if df_valid.empty:
        logger.warning("⚠️ No stocks with sufficient fundamental data")
        return pd.DataFrame()

    # Drop rows with any missing features
    df_valid = df_valid.dropna(subset=feature_names)

    # Prepare features
    X = df_valid[feature_names]

    # Run inference
    prob_high_quality = classifier.predict_proba(X)[:, 1]

    # Assign quality scores (A-F) based on probability quintiles
    quality_quintiles = pd.qcut(
        prob_high_quality,
        q=5,
        labels=['F', 'D', 'C', 'B', 'A'],
        duplicates='drop'
    )

    # Create signals dataframe
    signals = pd.DataFrame({
        'symbol': df_valid['symbol'].values,
        'prob_high_quality': prob_high_quality,
        'quality_score': quality_quintiles,
        'pe_ratio': df_valid['pe_ratio'].values,
        'pb_ratio': df_valid['pb_ratio'].values,
        'roe': df_valid['roe'].values,
        'debt_to_equity': df_valid['debt_to_equity'].values,
        'profit_margin': df_valid['profit_margin'].values,
    })

    # Determine trading signal
    def classify_signal(row):
        """Convert quality score and probability to trading signal."""
        if row['quality_score'] in ['A', 'B'] and row['prob_high_quality'] >= 0.6:
            return 'BUY'
        elif row['quality_score'] in ['D', 'F'] or row['prob_high_quality'] <= 0.4:
            return 'SELL'
        else:
            return 'HOLD'

    signals['signal'] = signals.apply(classify_signal, axis=1)
    signals['confidence'] = signals['prob_high_quality']
    signals['ml_prob'] = signals['prob_high_quality']

    # Rank by probability
    signals['rank'] = signals['prob_high_quality'].rank(ascending=False).astype(int)
    signals['score'] = signals['prob_high_quality']

    # Expected return (placeholder - could be enhanced)
    signals['ml_expected_return'] = (signals['prob_high_quality'] - 0.5) * 0.2  # Simple linear mapping

    logger.info(f"\n   Signal distribution:")
    logger.info(f"   {signals['signal'].value_counts().to_dict()}")
    logger.info(f"\n   Quality score distribution:")
    logger.info(f"   {signals['quality_score'].value_counts().sort_index().to_dict()}")

    return signals


def persist_signals(conn, signals, as_of_date=None):
    """Persist Model B signals to database."""
    if signals.empty:
        logger.warning("⚠️ No signals to persist")
        return

    if as_of_date is None:
        as_of_date = datetime.now().date()

    logger.info(f"\n💾 Persisting {len(signals)} Model B signals to database...")

    rows = []
    for _, row in signals.iterrows():
        rows.append((
            as_of_date,
            f'model_b_{MODEL_VERSION}',
            row['symbol'],
            row['signal'],
            row['quality_score'],
            float(row['confidence']),
            float(row['ml_prob']),
            float(row['ml_expected_return']) if not pd.isna(row['ml_expected_return']) else None,
            float(row['pe_ratio']) if not pd.isna(row['pe_ratio']) else None,
            float(row['pb_ratio']) if not pd.isna(row['pb_ratio']) else None,
            float(row['roe']) if not pd.isna(row['roe']) else None,
            float(row['debt_to_equity']) if not pd.isna(row['debt_to_equity']) else None,
            float(row['profit_margin']) if not pd.isna(row['profit_margin']) else None,
            int(row['rank']),
            float(row['score']),
        ))

    sql = """
        INSERT INTO model_b_ml_signals (
            as_of, model, symbol, signal, quality_score, confidence,
            ml_prob, ml_expected_return, pe_ratio, pb_ratio, roe,
            debt_to_equity, profit_margin, rank, score
        ) VALUES %s
        ON CONFLICT (as_of, model, symbol) DO UPDATE SET
            signal = EXCLUDED.signal,
            quality_score = EXCLUDED.quality_score,
            confidence = EXCLUDED.confidence,
            ml_prob = EXCLUDED.ml_prob,
            ml_expected_return = EXCLUDED.ml_expected_return,
            pe_ratio = EXCLUDED.pe_ratio,
            pb_ratio = EXCLUDED.pb_ratio,
            roe = EXCLUDED.roe,
            debt_to_equity = EXCLUDED.debt_to_equity,
            profit_margin = EXCLUDED.profit_margin,
            rank = EXCLUDED.rank,
            score = EXCLUDED.score,
            created_at = NOW()
    """

    with conn.cursor() as cur:
        execute_values(cur, sql, rows)
        conn.commit()

    logger.info(f"   ✅ Persisted {len(rows)} Model B signals for {as_of_date}")


def main():
    """Main execution."""
    try:
        logger.info("="*70)
        logger.info("🚀 Model B Signal Generation")
        logger.info("="*70)

        # Load model
        classifier, feature_names = load_model()

        # Connect to database
        conn = psycopg2.connect(DATABASE_URL)

        try:
            # Fetch latest fundamentals
            df = fetch_latest_fundamentals(conn)

            if df.empty:
                logger.warning("⚠️ No fundamental data found")
                return

            # Compute derived features
            df = compute_derived_features(df)

            # Generate signals
            signals = generate_signals(df, classifier, feature_names)

            if not signals.empty:
                # Persist to database
                persist_signals(conn, signals)

                logger.info("\n" + "="*70)
                logger.info("✅ Model B Signal Generation Complete!")
                logger.info("="*70)
                logger.info(f"\nGenerated {len(signals)} signals:")
                logger.info(f"   BUY: {(signals['signal'] == 'BUY').sum()}")
                logger.info(f"   HOLD: {(signals['signal'] == 'HOLD').sum()}")
                logger.info(f"   SELL: {(signals['signal'] == 'SELL').sum()}")
                logger.info(f"\nTop 10 BUY signals:")
                buy_signals = signals[signals['signal'] == 'BUY'].sort_values('rank').head(10)
                for _, s in buy_signals.iterrows():
                    logger.info(f"   {s['symbol']:10s} | Quality: {s['quality_score']} | Conf: {s['confidence']:.2f} | P/E: {s['pe_ratio']:.1f}")

        finally:
            conn.close()

    except Exception as e:
        logger.error(f"❌ Error generating Model B signals: {e}", exc_info=True)
        raise


if __name__ == "__main__":
    main()
