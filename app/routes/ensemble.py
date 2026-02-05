"""
app/routes/ensemble.py
Ensemble signal endpoints combining Model A (momentum) and Model B (fundamentals).
"""

from typing import Optional

import pandas as pd
from fastapi import APIRouter, Header, HTTPException, Query

from app.core import db, require_key, logger

router = APIRouter()


@router.get("/signals/ensemble/latest")
def get_ensemble_signals_latest(
    limit: int = 500,
    signal_filter: Optional[str] = None,
    agreement_only: bool = False,
    no_conflict: bool = False,
    x_api_key: Optional[str] = Header(default=None),
):
    """
    Get latest ensemble signals combining Model A (momentum) and Model B (fundamentals).

    Ensemble weighting: 60% Model A + 40% Model B
    Conflict detection: Flags when models give opposite signals
    """
    require_key(x_api_key)

    try:
        with db() as con:
            # Build query with filters
            conditions = ["as_of = (SELECT MAX(as_of) FROM ensemble_signals)"]
            params = []

            if signal_filter:
                conditions.append("signal = %s")
                params.append(signal_filter.upper())

            if agreement_only:
                conditions.append("signals_agree = true")

            if no_conflict:
                conditions.append("conflict = false")

            where_clause = " AND ".join(conditions)

            query = f"""
                SELECT
                    symbol,
                    as_of,
                    signal,
                    ensemble_score,
                    confidence,
                    model_a_signal,
                    model_b_signal,
                    model_a_confidence,
                    model_b_confidence,
                    conflict,
                    conflict_reason,
                    signals_agree,
                    rank,
                    model_a_rank,
                    model_b_rank
                FROM ensemble_signals
                WHERE {where_clause}
                ORDER BY rank ASC
                LIMIT %s
            """
            params.append(limit)

            df = pd.read_sql(query, con, params=tuple(params))
    except Exception as e:
        logger.error("Failed to fetch ensemble signals: %s", e)
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    if df.empty:
        return {
            "status": "ok",
            "count": 0,
            "as_of": None,
            "signals": [],
            "message": "No ensemble signals found. Run generate_ensemble_signals.py first."
        }

    as_of = str(df['as_of'].iloc[0])

    # Calculate statistics
    total_signals = len(df)
    agreement_count = int(df['signals_agree'].sum())
    conflict_count = int(df['conflict'].sum())

    signals = []
    for _, row in df.iterrows():
        signals.append({
            "symbol": row['symbol'],
            "signal": row['signal'],
            "ensemble_score": float(row['ensemble_score']) if pd.notna(row['ensemble_score']) else None,
            "confidence": float(row['confidence']) if pd.notna(row['confidence']) else None,
            "rank": int(row['rank']) if pd.notna(row['rank']) else None,
            "component_signals": {
                "model_a": {
                    "signal": row['model_a_signal'],
                    "confidence": float(row['model_a_confidence']) if pd.notna(row['model_a_confidence']) else None,
                    "rank": int(row['model_a_rank']) if pd.notna(row['model_a_rank']) else None,
                },
                "model_b": {
                    "signal": row['model_b_signal'],
                    "confidence": float(row['model_b_confidence']) if pd.notna(row['model_b_confidence']) else None,
                    "rank": int(row['model_b_rank']) if pd.notna(row['model_b_rank']) else None,
                }
            },
            "agreement": {
                "signals_agree": bool(row['signals_agree']),
                "conflict": bool(row['conflict']),
                "conflict_reason": row['conflict_reason'] if pd.notna(row['conflict_reason']) else None,
            }
        })

    return {
        "status": "ok",
        "count": len(signals),
        "as_of": as_of,
        "statistics": {
            "total": total_signals,
            "agreement_rate": agreement_count / total_signals if total_signals > 0 else 0,
            "conflict_rate": conflict_count / total_signals if total_signals > 0 else 0,
        },
        "filters": {
            "signal": signal_filter,
            "agreement_only": agreement_only,
            "no_conflict": no_conflict,
        },
        "signals": signals,
    }


@router.get("/signals/ensemble/{ticker}")
def get_ensemble_signal_for_ticker(
    ticker: str,
    x_api_key: Optional[str] = Header(default=None),
):
    """
    Get ensemble signal for a specific stock.
    """
    require_key(x_api_key)

    # Normalize ticker
    if not ticker.endswith('.AU'):
        ticker = f"{ticker}.AU"

    try:
        with db() as con:
            query = """
                SELECT
                    symbol,
                    as_of,
                    signal,
                    ensemble_score,
                    confidence,
                    model_a_signal,
                    model_b_signal,
                    model_a_confidence,
                    model_b_confidence,
                    conflict,
                    conflict_reason,
                    signals_agree,
                    rank,
                    model_a_rank,
                    model_b_rank,
                    created_at
                FROM ensemble_signals
                WHERE symbol = %s
                ORDER BY as_of DESC
                LIMIT 1
            """
            df = pd.read_sql(query, con, params=(ticker,))
    except Exception as e:
        logger.error("Failed to fetch ensemble signal for %s: %s", ticker, e)
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    if df.empty:
        raise HTTPException(
            status_code=404,
            detail=f"No ensemble signal found for {ticker}"
        )

    row = df.iloc[0]

    return {
        "symbol": row['symbol'],
        "as_of": str(row['as_of']),
        "signal": row['signal'],
        "ensemble_score": float(row['ensemble_score']) if pd.notna(row['ensemble_score']) else None,
        "confidence": float(row['confidence']) if pd.notna(row['confidence']) else None,
        "rank": int(row['rank']) if pd.notna(row['rank']) else None,
        "component_signals": {
            "model_a": {
                "signal": row['model_a_signal'],
                "confidence": float(row['model_a_confidence']) if pd.notna(row['model_a_confidence']) else None,
                "rank": int(row['model_a_rank']) if pd.notna(row['model_a_rank']) else None,
            },
            "model_b": {
                "signal": row['model_b_signal'],
                "confidence": float(row['model_b_confidence']) if pd.notna(row['model_b_confidence']) else None,
                "rank": int(row['model_b_rank']) if pd.notna(row['model_b_rank']) else None,
            }
        },
        "agreement": {
            "signals_agree": bool(row['signals_agree']),
            "conflict": bool(row['conflict']),
            "conflict_reason": row['conflict_reason'] if pd.notna(row['conflict_reason']) else None,
        },
        "created_at": row['created_at'].isoformat() if pd.notna(row['created_at']) else None,
    }


@router.get("/signals/compare")
def compare_all_models(
    ticker: str = Query(..., description="Stock ticker to compare (e.g., 'CBA')"),
    x_api_key: Optional[str] = Header(default=None),
):
    """
    Compare signals from Model A, Model B, and Ensemble for a specific stock.

    Returns all three signals side-by-side for easy comparison.
    """
    require_key(x_api_key)

    # Normalize ticker
    if not ticker.endswith('.AU'):
        ticker = f"{ticker}.AU"

    try:
        with db() as con:
            # Model A signals
            query_a = """
                SELECT
                    symbol,
                    as_of,
                    ml_prob as confidence,
                    ml_expected_return,
                    rank
                FROM model_a_ml_signals
                WHERE symbol = %s
                ORDER BY as_of DESC
                LIMIT 1
            """
            df_a = pd.read_sql(query_a, con, params=(ticker,))

            # Model B signals
            query_b = """
                SELECT
                    symbol,
                    as_of,
                    signal,
                    quality_score,
                    confidence,
                    ml_expected_return,
                    rank
                FROM model_b_ml_signals
                WHERE symbol = %s
                ORDER BY as_of DESC
                LIMIT 1
            """
            df_b = pd.read_sql(query_b, con, params=(ticker,))

            # Ensemble signals
            query_ensemble = """
                SELECT
                    symbol,
                    as_of,
                    signal,
                    ensemble_score,
                    confidence,
                    model_a_signal,
                    model_b_signal,
                    conflict,
                    signals_agree,
                    rank
                FROM ensemble_signals
                WHERE symbol = %s
                ORDER BY as_of DESC
                LIMIT 1
            """
            df_ensemble = pd.read_sql(query_ensemble, con, params=(ticker,))

    except Exception as e:
        logger.error("Failed to compare signals for %s: %s", ticker, e)
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    # Build response
    result = {
        "symbol": ticker,
        "model_a": None,
        "model_b": None,
        "ensemble": None,
        "availability": {
            "model_a": not df_a.empty,
            "model_b": not df_b.empty,
            "ensemble": not df_ensemble.empty,
        }
    }

    # Model A (convert probability to signal)
    if not df_a.empty:
        row_a = df_a.iloc[0]
        confidence = float(row_a['confidence']) if pd.notna(row_a['confidence']) else 0.5
        expected_return = float(row_a['ml_expected_return']) if pd.notna(row_a['ml_expected_return']) else 0

        # Classify Model A signal
        if confidence >= 0.65 and expected_return > 0.05:
            signal_a = 'STRONG_BUY'
        elif confidence >= 0.55 and expected_return > 0:
            signal_a = 'BUY'
        elif confidence <= 0.35 or expected_return < -0.05:
            signal_a = 'STRONG_SELL'
        elif confidence <= 0.45 or expected_return < 0:
            signal_a = 'SELL'
        else:
            signal_a = 'HOLD'

        result['model_a'] = {
            "as_of": str(row_a['as_of']),
            "signal": signal_a,
            "confidence": confidence,
            "expected_return": expected_return,
            "rank": int(row_a['rank']) if pd.notna(row_a['rank']) else None,
        }

    # Model B
    if not df_b.empty:
        row_b = df_b.iloc[0]
        result['model_b'] = {
            "as_of": str(row_b['as_of']),
            "signal": row_b['signal'],
            "quality_score": row_b['quality_score'],
            "confidence": float(row_b['confidence']) if pd.notna(row_b['confidence']) else None,
            "expected_return": float(row_b['ml_expected_return']) if pd.notna(row_b['ml_expected_return']) else None,
            "rank": int(row_b['rank']) if pd.notna(row_b['rank']) else None,
        }

    # Ensemble
    if not df_ensemble.empty:
        row_e = df_ensemble.iloc[0]
        result['ensemble'] = {
            "as_of": str(row_e['as_of']),
            "signal": row_e['signal'],
            "ensemble_score": float(row_e['ensemble_score']) if pd.notna(row_e['ensemble_score']) else None,
            "confidence": float(row_e['confidence']) if pd.notna(row_e['confidence']) else None,
            "rank": int(row_e['rank']) if pd.notna(row_e['rank']) else None,
            "conflict": bool(row_e['conflict']),
            "signals_agree": bool(row_e['signals_agree']),
        }

    # Add comparison summary
    if result['model_a'] and result['model_b']:
        result['comparison'] = {
            "models_agree": result['model_a']['signal'] == result['model_b']['signal'],
            "conflict_detected": (
                (result['model_a']['signal'] in ['BUY', 'STRONG_BUY'] and result['model_b']['signal'] in ['SELL', 'STRONG_SELL']) or
                (result['model_a']['signal'] in ['SELL', 'STRONG_SELL'] and result['model_b']['signal'] in ['BUY', 'STRONG_BUY'])
            ),
            "recommendation": result['ensemble']['signal'] if result['ensemble'] else None,
        }

    return result
