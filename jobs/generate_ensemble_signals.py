#!/usr/bin/env python3
"""
Generate ensemble signals combining Model A (momentum) and Model B (fundamentals).
Creates weighted signals with conflict detection.

Weighting:
- Model A (momentum): 60%
- Model B (fundamentals): 40%

Usage:
    python jobs/generate_ensemble_signals.py
"""

import os
import sys
from datetime import datetime
from pathlib import Path
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))
from app.core import logger

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

# Ensemble weights
WEIGHT_MODEL_A = 0.6  # Momentum
WEIGHT_MODEL_B = 0.4  # Fundamentals


def fetch_latest_signals(conn, as_of_date=None):
    """Fetch latest signals from both Model A and Model B."""
    if as_of_date is None:
        as_of_date = datetime.now().date()

    logger.info(f"📊 Fetching signals for {as_of_date}...")

    # Model A signals
    query_a = """
        SELECT
            symbol,
            ml_prob as confidence,
            ml_expected_return,
            rank
        FROM model_a_ml_signals
        WHERE as_of = %s
        ORDER BY symbol
    """

    df_a = pd.read_sql(query_a, conn, params=(as_of_date,))

    # Model B signals
    query_b = """
        SELECT
            symbol,
            signal,
            quality_score,
            confidence,
            ml_prob,
            ml_expected_return,
            rank
        FROM model_b_ml_signals
        WHERE as_of = %s
        ORDER BY symbol
    """

    df_b = pd.read_sql(query_b, conn, params=(as_of_date,))

    logger.info(f"   Model A: {len(df_a)} signals")
    logger.info(f"   Model B: {len(df_b)} signals")

    if df_a.empty or df_b.empty:
        logger.warning("⚠️ Missing signals from one or both models")
        return pd.DataFrame()

    return df_a, df_b


def classify_model_a_signal(row):
    """Convert Model A probability to signal."""
    if row['confidence'] >= 0.65 and row['ml_expected_return'] > 0.05:
        return 'STRONG_BUY'
    elif row['confidence'] >= 0.55 and row['ml_expected_return'] > 0:
        return 'BUY'
    elif row['confidence'] <= 0.35 or row['ml_expected_return'] < -0.05:
        return 'STRONG_SELL'
    elif row['confidence'] <= 0.45 or row['ml_expected_return'] < 0:
        return 'SELL'
    else:
        return 'HOLD'


def create_ensemble_signal(row):
    """
    Create ensemble signal from Model A and Model B.

    Args:
        row: DataFrame row with columns:
            - model_a_signal, model_a_confidence, model_a_rank
            - model_b_signal, model_b_confidence, model_b_rank

    Returns:
        dict with ensemble_signal, ensemble_score, conflict, etc.
    """
    # Weighted ensemble score
    ensemble_score = (
        WEIGHT_MODEL_A * row['model_a_confidence'] +
        WEIGHT_MODEL_B * row['model_b_confidence']
    )

    # Check for conflicts (opposite signals)
    buy_signals = ['BUY', 'STRONG_BUY']
    sell_signals = ['SELL', 'STRONG_SELL']

    model_a_bullish = row['model_a_signal'] in buy_signals
    model_a_bearish = row['model_a_signal'] in sell_signals
    model_b_bullish = row['model_b_signal'] in buy_signals
    model_b_bearish = row['model_b_signal'] in sell_signals

    conflict = (model_a_bullish and model_b_bearish) or (model_a_bearish and model_b_bullish)

    if conflict:
        conflict_reason = f"A={row['model_a_signal']}, B={row['model_b_signal']}"
    else:
        conflict_reason = None

    # Agreement
    signals_agree = (
        (model_a_bullish and model_b_bullish) or
        (model_a_bearish and model_b_bearish) or
        (row['model_a_signal'] == 'HOLD' and row['model_b_signal'] == 'HOLD')
    )

    # Determine final signal
    if conflict:
        # Conservative on conflict
        final_signal = 'HOLD'
    elif model_a_bullish and model_b_bullish:
        # Both bullish
        if row['model_a_signal'] == 'STRONG_BUY' and row['model_b_signal'] in buy_signals:
            final_signal = 'STRONG_BUY'
        else:
            final_signal = 'BUY'
    elif model_a_bearish and model_b_bearish:
        # Both bearish
        if row['model_a_signal'] == 'STRONG_SELL' and row['model_b_signal'] in sell_signals:
            final_signal = 'STRONG_SELL'
        else:
            final_signal = 'SELL'
    else:
        # Use weighted score
        if ensemble_score >= 0.65:
            final_signal = 'BUY'
        elif ensemble_score <= 0.35:
            final_signal = 'SELL'
        else:
            final_signal = 'HOLD'

    # Combined rank (weighted average)
    combined_rank = int(WEIGHT_MODEL_A * row['model_a_rank'] + WEIGHT_MODEL_B * row['model_b_rank'])

    return {
        'signal': final_signal,
        'ensemble_score': ensemble_score,
        'confidence': ensemble_score,
        'conflict': conflict,
        'conflict_reason': conflict_reason,
        'signals_agree': signals_agree,
        'rank': combined_rank
    }


def generate_ensemble_signals(df_a, df_b):
    """Generate ensemble signals."""
    logger.info("\n⚙️  Generating ensemble signals...")

    # Merge signals
    df = pd.merge(
        df_a,
        df_b,
        on='symbol',
        how='inner',
        suffixes=('_a', '_b')
    )

    if df.empty:
        logger.warning("⚠️ No overlapping symbols between Model A and Model B")
        return pd.DataFrame()

    logger.info(f"   ✅ {len(df)} stocks with signals from both models")

    # Classify Model A signals
    df['model_a_signal'] = df.apply(classify_model_a_signal, axis=1)
    df['model_b_signal'] = df['signal']
    df['model_a_confidence'] = df['confidence_a']
    df['model_b_confidence'] = df['confidence_b']
    df['model_a_rank'] = df['rank_a']
    df['model_b_rank'] = df['rank_b']

    # Create ensemble signals
    ensemble_results = df.apply(create_ensemble_signal, axis=1, result_type='expand')
    df = pd.concat([df, ensemble_results], axis=1)

    # Summary statistics
    logger.info("\n   Ensemble signal distribution:")
    logger.info(f"   {df['signal'].value_counts().to_dict()}")
    logger.info(f"\n   Conflicts: {df['conflict'].sum()} ({df['conflict'].mean():.1%})")
    logger.info(f"   Agreement: {df['signals_agree'].sum()} ({df['signals_agree'].mean():.1%})")

    return df


def persist_ensemble_signals(conn, df, as_of_date=None):
    """Persist ensemble signals to database."""
    if df.empty:
        logger.warning("⚠️ No ensemble signals to persist")
        return

    if as_of_date is None:
        as_of_date = datetime.now().date()

    logger.info(f"\n💾 Persisting {len(df)} ensemble signals to database...")

    rows = []
    for _, row in df.iterrows():
        rows.append((
            as_of_date,
            row['symbol'],
            row['signal'],
            float(row['ensemble_score']),
            float(row['confidence']),
            row['model_a_signal'],
            row['model_b_signal'],
            float(row['model_a_confidence']),
            float(row['model_b_confidence']),
            bool(row['conflict']),
            row['conflict_reason'],
            bool(row['signals_agree']),
            int(row['rank']),
            int(row['model_a_rank']),
            int(row['model_b_rank']),
        ))

    sql = """
        INSERT INTO ensemble_signals (
            as_of, symbol, signal, ensemble_score, confidence,
            model_a_signal, model_b_signal, model_a_confidence, model_b_confidence,
            conflict, conflict_reason, signals_agree,
            rank, model_a_rank, model_b_rank
        ) VALUES %s
        ON CONFLICT (as_of, symbol) DO UPDATE SET
            signal = EXCLUDED.signal,
            ensemble_score = EXCLUDED.ensemble_score,
            confidence = EXCLUDED.confidence,
            model_a_signal = EXCLUDED.model_a_signal,
            model_b_signal = EXCLUDED.model_b_signal,
            model_a_confidence = EXCLUDED.model_a_confidence,
            model_b_confidence = EXCLUDED.model_b_confidence,
            conflict = EXCLUDED.conflict,
            conflict_reason = EXCLUDED.conflict_reason,
            signals_agree = EXCLUDED.signals_agree,
            rank = EXCLUDED.rank,
            model_a_rank = EXCLUDED.model_a_rank,
            model_b_rank = EXCLUDED.model_b_rank,
            created_at = NOW()
    """

    with conn.cursor() as cur:
        execute_values(cur, sql, rows)
        conn.commit()

    logger.info(f"   ✅ Persisted {len(rows)} ensemble signals for {as_of_date}")


def main():
    """Main execution."""
    try:
        logger.info("="*70)
        logger.info("🚀 Ensemble Signal Generation")
        logger.info("="*70)
        logger.info(f"Weighting: {WEIGHT_MODEL_A:.0%} Model A + {WEIGHT_MODEL_B:.0%} Model B")

        # Connect to database
        conn = psycopg2.connect(DATABASE_URL)

        try:
            # Fetch signals from both models
            result = fetch_latest_signals(conn)

            if isinstance(result, tuple):
                df_a, df_b = result

                # Generate ensemble signals
                df_ensemble = generate_ensemble_signals(df_a, df_b)

                if not df_ensemble.empty:
                    # Persist to database
                    persist_ensemble_signals(conn, df_ensemble)

                    logger.info("\n" + "="*70)
                    logger.info("✅ Ensemble Signal Generation Complete!")
                    logger.info("="*70)
                    logger.info(f"\nGenerated {len(df_ensemble)} ensemble signals:")
                    logger.info(f"   STRONG_BUY: {(df_ensemble['signal'] == 'STRONG_BUY').sum()}")
                    logger.info(f"   BUY: {(df_ensemble['signal'] == 'BUY').sum()}")
                    logger.info(f"   HOLD: {(df_ensemble['signal'] == 'HOLD').sum()}")
                    logger.info(f"   SELL: {(df_ensemble['signal'] == 'SELL').sum()}")
                    logger.info(f"   STRONG_SELL: {(df_ensemble['signal'] == 'STRONG_SELL').sum()}")

                    logger.info("\nAgreement metrics:")
                    logger.info(f"   Models agree: {df_ensemble['signals_agree'].sum()} ({df_ensemble['signals_agree'].mean():.1%})")
                    logger.info(f"   Conflicts: {df_ensemble['conflict'].sum()} ({df_ensemble['conflict'].mean():.1%})")

                    # Top signals
                    logger.info("\nTop 10 STRONG_BUY/BUY signals (no conflict):")
                    top_signals = df_ensemble[
                        (df_ensemble['signal'].isin(['STRONG_BUY', 'BUY'])) &
                        (~df_ensemble['conflict'])
                    ].sort_values('rank').head(10)

                    for _, s in top_signals.iterrows():
                        logger.info(
                            f"   {s['symbol']:10s} | {s['signal']:12s} | "
                            f"Score: {s['ensemble_score']:.2f} | "
                            f"A: {s['model_a_signal']:10s} | B: {s['model_b_signal']:10s}"
                        )

        finally:
            conn.close()

    except Exception as e:
        logger.error(f"❌ Error generating ensemble signals: {e}", exc_info=True)
        raise


if __name__ == "__main__":
    main()
