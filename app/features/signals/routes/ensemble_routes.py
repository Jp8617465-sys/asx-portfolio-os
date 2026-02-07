"""
app/features/signals/routes/ensemble_routes.py
Feature-based API routes for ensemble signals.

Thin controller layer -- delegates business logic to EnsembleService
and direct DB queries via psycopg2 RealDictCursor.
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Query
from psycopg2.extras import RealDictCursor

from app.core import db_context, require_key, logger
from app.contracts.types import EnsembleGenerateRequest

router = APIRouter()


# ---------------------------------------------------------------------------
# Lazy-loaded EnsembleService to avoid importing heavy ML deps at import time
# (lightgbm etc. pulled in through model plugins).
# Tests patch this module-level attribute directly.
# ---------------------------------------------------------------------------

class _LazyEnsembleService:
    """Proxy that creates the real EnsembleService on first access."""

    _instance = None

    def __getattr__(self, name):
        if _LazyEnsembleService._instance is None:
            from app.features.models.services.ensemble_service import EnsembleService
            _LazyEnsembleService._instance = EnsembleService()
        return getattr(_LazyEnsembleService._instance, name)


ensemble_service = _LazyEnsembleService()


# ===========================================================================
# GET /signals/ensemble/latest
# ===========================================================================

@router.get("/signals/ensemble/latest")
def get_ensemble_signals_latest(
    limit: int = 500,
    signal_filter: Optional[str] = None,
    agreement_only: bool = False,
    no_conflict: bool = False,
    x_api_key: Optional[str] = Header(default=None),
):
    """
    Get latest ensemble signals combining Model A and Model B.

    Query params:
        signal_filter -- filter by signal type (e.g. BUY, SELL)
        agreement_only -- only return signals where models agree
        no_conflict -- exclude conflicting signals
        limit -- max rows (default 500)
    """
    require_key(x_api_key)

    try:
        with db_context() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)

            conditions = ["as_of = (SELECT MAX(as_of) FROM ensemble_signals)"]
            params: list = []

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
                    symbol, as_of, signal, ensemble_score, confidence,
                    model_a_signal, model_b_signal,
                    model_a_confidence, model_b_confidence,
                    conflict, conflict_reason, signals_agree, rank
                FROM ensemble_signals
                WHERE {where_clause}
                ORDER BY rank ASC
                LIMIT %s
            """
            params.append(limit)

            cur.execute(query, tuple(params))
            rows = cur.fetchall()

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to fetch ensemble signals: %s", e)
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    if not rows:
        return {
            "status": "ok",
            "count": 0,
            "as_of": None,
            "signals": [],
        }

    as_of = str(rows[0]["as_of"])

    signals = [
        {
            "symbol": r["symbol"],
            "signal": r["signal"],
            "ensemble_score": float(r["ensemble_score"]) if r.get("ensemble_score") is not None else None,
            "confidence": float(r["confidence"]) if r.get("confidence") is not None else None,
            "model_a_signal": r.get("model_a_signal"),
            "model_b_signal": r.get("model_b_signal"),
            "model_a_confidence": float(r["model_a_confidence"]) if r.get("model_a_confidence") is not None else None,
            "model_b_confidence": float(r["model_b_confidence"]) if r.get("model_b_confidence") is not None else None,
            "conflict": bool(r["conflict"]),
            "conflict_reason": r.get("conflict_reason"),
            "signals_agree": bool(r["signals_agree"]),
            "rank": int(r["rank"]) if r.get("rank") is not None else None,
            "as_of": str(r["as_of"]) if r.get("as_of") is not None else None,
        }
        for r in rows
    ]

    return {
        "status": "ok",
        "count": len(signals),
        "as_of": as_of,
        "signals": signals,
    }


# ===========================================================================
# GET /signals/ensemble/{ticker}
# ===========================================================================

@router.get("/signals/ensemble/{ticker}")
def get_ensemble_signal_for_ticker(
    ticker: str,
    x_api_key: Optional[str] = Header(default=None),
):
    """Get the latest ensemble signal for a specific ticker."""
    require_key(x_api_key)

    # Normalize ticker
    if not ticker.endswith(".AX"):
        ticker = f"{ticker}.AX"

    try:
        with db_context() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)

            cur.execute(
                """
                SELECT
                    symbol, as_of, signal, ensemble_score, confidence,
                    model_a_signal, model_b_signal,
                    model_a_confidence, model_b_confidence,
                    conflict, conflict_reason, signals_agree, rank
                FROM ensemble_signals
                WHERE symbol = %s
                ORDER BY as_of DESC
                LIMIT 1
                """,
                (ticker,),
            )
            row = cur.fetchone()

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to fetch ensemble signal for %s: %s", ticker, e)
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    if row is None:
        raise HTTPException(
            status_code=404,
            detail=f"No ensemble signal found for {ticker}",
        )

    return {
        "symbol": row["symbol"],
        "signal": row["signal"],
        "ensemble_score": float(row["ensemble_score"]) if row.get("ensemble_score") is not None else None,
        "confidence": float(row["confidence"]) if row.get("confidence") is not None else None,
        "model_a_signal": row.get("model_a_signal"),
        "model_b_signal": row.get("model_b_signal"),
        "model_a_confidence": float(row["model_a_confidence"]) if row.get("model_a_confidence") is not None else None,
        "model_b_confidence": float(row["model_b_confidence"]) if row.get("model_b_confidence") is not None else None,
        "conflict": bool(row["conflict"]),
        "conflict_reason": row.get("conflict_reason"),
        "signals_agree": bool(row["signals_agree"]),
        "rank": int(row["rank"]) if row.get("rank") is not None else None,
        "as_of": str(row["as_of"]) if row.get("as_of") is not None else None,
    }


# ===========================================================================
# POST /signals/ensemble/generate
# ===========================================================================

@router.post("/signals/ensemble/generate")
async def generate_ensemble_signals(
    req: EnsembleGenerateRequest,
    x_api_key: Optional[str] = Header(default=None),
):
    """
    Trigger ensemble signal generation.

    Accepts optional ``symbols`` list and ``as_of`` date string in body.
    Delegates to EnsembleService.
    """
    require_key(x_api_key)

    as_of_date = date.fromisoformat(req.as_of) if req.as_of else date.today()
    symbols = req.symbols or []

    try:
        results = await ensemble_service.generate_ensemble_signals(
            symbols=symbols,
            as_of=as_of_date,
        )
    except Exception as e:
        logger.error("Ensemble generation failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Generation error: {e}")

    return {
        "status": "ok",
        "message": f"Generated {len(results)} ensemble signals",
        "signals_generated": len(results),
        "as_of": str(as_of_date),
    }


# ===========================================================================
# GET /signals/compare
# ===========================================================================

@router.get("/signals/compare")
def compare_all_models(
    ticker: str = Query(..., description="Stock ticker to compare (e.g. 'CBA')"),
    x_api_key: Optional[str] = Header(default=None),
):
    """
    Compare signals from Model A, Model B, and Ensemble side-by-side.

    Returns availability flags indicating which models have data.
    """
    require_key(x_api_key)

    # Normalize ticker
    if not ticker.endswith(".AX"):
        ticker = f"{ticker}.AX"

    try:
        with db_context() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)

            # Model A
            cur.execute(
                """
                SELECT symbol, as_of, ml_prob AS confidence,
                       ml_expected_return, rank
                FROM model_a_ml_signals
                WHERE symbol = %s
                ORDER BY as_of DESC
                LIMIT 1
                """,
                (ticker,),
            )
            row_a = cur.fetchone()

            # Model B
            cur.execute(
                """
                SELECT symbol, as_of, signal, quality_score,
                       confidence, ml_expected_return, rank
                FROM model_b_ml_signals
                WHERE symbol = %s
                ORDER BY as_of DESC
                LIMIT 1
                """,
                (ticker,),
            )
            row_b = cur.fetchone()

            # Ensemble
            cur.execute(
                """
                SELECT symbol, as_of, signal, ensemble_score, confidence,
                       model_a_signal, model_b_signal,
                       conflict, signals_agree, rank
                FROM ensemble_signals
                WHERE symbol = %s
                ORDER BY as_of DESC
                LIMIT 1
                """,
                (ticker,),
            )
            row_e = cur.fetchone()

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to compare signals for %s: %s", ticker, e)
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    # Build response
    result: dict = {
        "symbol": ticker,
        "model_a": None,
        "model_b": None,
        "ensemble": None,
        "availability": {
            "model_a": row_a is not None,
            "model_b": row_b is not None,
            "ensemble": row_e is not None,
        },
    }

    # Model A
    if row_a is not None:
        confidence = float(row_a["confidence"]) if row_a.get("confidence") is not None else 0.5
        expected_return = float(row_a["ml_expected_return"]) if row_a.get("ml_expected_return") is not None else 0

        if confidence >= 0.65 and expected_return > 0.05:
            signal_a = "STRONG_BUY"
        elif confidence >= 0.55 and expected_return > 0:
            signal_a = "BUY"
        elif confidence <= 0.35 or expected_return < -0.05:
            signal_a = "STRONG_SELL"
        elif confidence <= 0.45 or expected_return < 0:
            signal_a = "SELL"
        else:
            signal_a = "HOLD"

        result["model_a"] = {
            "as_of": str(row_a["as_of"]),
            "signal": signal_a,
            "confidence": confidence,
            "expected_return": expected_return,
            "rank": int(row_a["rank"]) if row_a.get("rank") is not None else None,
        }

    # Model B
    if row_b is not None:
        result["model_b"] = {
            "as_of": str(row_b["as_of"]),
            "signal": row_b["signal"],
            "quality_score": row_b["quality_score"],
            "confidence": float(row_b["confidence"]) if row_b.get("confidence") is not None else None,
            "expected_return": float(row_b["ml_expected_return"]) if row_b.get("ml_expected_return") is not None else None,
            "rank": int(row_b["rank"]) if row_b.get("rank") is not None else None,
        }

    # Ensemble
    if row_e is not None:
        result["ensemble"] = {
            "as_of": str(row_e["as_of"]),
            "signal": row_e["signal"],
            "ensemble_score": float(row_e["ensemble_score"]) if row_e.get("ensemble_score") is not None else None,
            "confidence": float(row_e["confidence"]) if row_e.get("confidence") is not None else None,
            "rank": int(row_e["rank"]) if row_e.get("rank") is not None else None,
            "conflict": bool(row_e["conflict"]),
            "signals_agree": bool(row_e["signals_agree"]),
        }

    return result
