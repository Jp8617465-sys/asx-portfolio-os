"""
app/features/signals/routes/signals.py
Refactored thin controller for ML signals, model status, and drift endpoints.
"""

from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.core import require_key, logger, parse_as_of, ENABLE_ASSISTANT
from app.features.signals.services import SignalService


router = APIRouter()

# Initialize service (singleton pattern)
signal_service = SignalService()


# ============================================================================
# Request/Response Models
# ============================================================================

class ModelSignalsPersistReq(BaseModel):
    """Request model for persisting ML signals."""
    model: str
    as_of: str
    signals: List[Dict[str, Any]]


class ModelRegistryReq(BaseModel):
    """Request model for registering a model run."""
    model_name: str
    version: Optional[str] = None
    run_id: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None
    features: Optional[List[str]] = None
    artifacts: Optional[Dict[str, Any]] = None


class DriftAuditReq(BaseModel):
    """Request model for drift audit persistence."""
    model: str
    baseline_label: str
    current_label: str
    metrics: Dict[str, Any]


class AssistantChatReq(BaseModel):
    """Request model for AI assistant chat."""
    query: str


# ============================================================================
# Signal Persistence Endpoints
# ============================================================================

@router.post("/persist/ml_signals")
async def persist_ml_signals(
    req: ModelSignalsPersistReq,
    x_api_key: Optional[str] = Header(default=None)
):
    """
    Persist ML model signals to database.

    Stores signals with bulk insert optimization and publishes SIGNAL_GENERATED event.
    """
    require_key(x_api_key)

    try:
        result = await signal_service.persist_model_run(
            signals=req.signals,
            model=req.model,
            as_of=req.as_of
        )
        return result
    except Exception as e:
        logger.error(f"Error persisting signals: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/registry/model_run")
async def register_model_run(
    req: ModelRegistryReq,
    x_api_key: Optional[str] = Header(default=None)
):
    """
    Register a model run in the registry.

    Stores model metadata, version, metrics, and artifacts.
    """
    require_key(x_api_key)

    try:
        result = await signal_service.register_model_run(
            model_name=req.model_name,
            version=req.version,
            run_id=req.run_id,
            metrics=req.metrics,
            features=req.features,
            artifacts=req.artifacts
        )
        return result
    except Exception as e:
        logger.error(f"Error registering model run: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/drift/audit")
async def persist_drift_audit(
    req: DriftAuditReq,
    x_api_key: Optional[str] = Header(default=None)
):
    """
    Persist drift audit metrics.

    Stores drift detection results and publishes MODEL_DRIFT_DETECTED event
    if significant drift is detected.
    """
    require_key(x_api_key)

    try:
        result = await signal_service.persist_drift_audit(
            model=req.model,
            baseline_label=req.baseline_label,
            current_label=req.current_label,
            metrics=req.metrics
        )
        return result
    except Exception as e:
        logger.error(f"Error persisting drift audit: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Signal Retrieval Endpoints
# ============================================================================

@router.get("/signals/live")
async def signals_live(
    model: str = "model_a_ml",
    as_of: Optional[str] = None,
    limit: int = 20,
    x_api_key: Optional[str] = Header(default=None),
):
    """
    Get live model signals.

    Returns the most recent signals for a given model, ordered by rank.
    """
    require_key(x_api_key)

    if limit < 1 or limit > 200:
        raise HTTPException(status_code=400, detail="limit must be between 1 and 200")

    try:
        # Parse as_of date if provided
        as_of_date = parse_as_of(as_of) if as_of else None

        result = await signal_service.get_live_signals(
            model=model,
            limit=limit,
            as_of=as_of_date
        )
        return result
    except Exception as e:
        if "No signals available" in str(e):
            raise HTTPException(status_code=404, detail=str(e))
        logger.error(f"Error retrieving live signals: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/signals/live/{ticker}")
async def get_live_signal_for_ticker(
    ticker: str,
    x_api_key: Optional[str] = Header(default=None),
):
    """
    Get the latest signal for a specific ticker.

    Parameters:
    - ticker: Stock ticker symbol (e.g., "BHP.AX")

    Returns:
    - Latest Model A signal with confidence and expected return
    """
    require_key(x_api_key)

    try:
        result = await signal_service.get_signal_for_ticker(ticker=ticker)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error retrieving signal for ticker {ticker}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/signals/{ticker}/reasoning")
async def get_signal_reasoning(
    ticker: str,
    x_api_key: Optional[str] = Header(default=None),
):
    """
    Get SHAP-based reasoning for why a stock received its signal.

    Parameters:
    - ticker: Stock ticker symbol (e.g., "BHP.AX")

    Returns:
    - Feature contributions (SHAP values)
    - Top factors driving the signal
    - Direction of each factor's influence

    Example Response:
    ```json
    {
      "ticker": "BHP.AX",
      "signal": "STRONG_BUY",
      "confidence": 0.87,
      "factors": [
        {"feature": "momentum", "contribution": 0.45, "direction": "positive"},
        {"feature": "volume_trend", "contribution": 0.32, "direction": "positive"},
        {"feature": "rsi", "contribution": -0.15, "direction": "negative"}
      ]
    }
    ```
    """
    require_key(x_api_key)

    try:
        result = await signal_service.get_signal_with_reasoning(ticker=ticker)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error retrieving signal reasoning for ticker {ticker}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/accuracy/{ticker}")
async def get_signal_accuracy(
    ticker: str,
    limit: int = 50,
    x_api_key: Optional[str] = Header(default=None),
):
    """
    Get historical signal accuracy for a specific ticker.

    Shows how accurate Model A signals have been for this stock historically.

    Parameters:
    - ticker: Stock ticker symbol (e.g., "BHP.AX")
    - limit: Number of historical signals to analyze (default: 50)

    Returns:
    - Accuracy by signal type (STRONG_BUY, BUY, HOLD, SELL, STRONG_SELL)
    - Overall win rate
    - Total signals analyzed

    Example Response:
    ```json
    {
      "ticker": "BHP.AX",
      "signals_analyzed": 48,
      "overall_accuracy": 0.68,
      "by_signal": {
        "STRONG_BUY": {"accuracy": 0.72, "count": 11, "correct": 8},
        "BUY": {"accuracy": 0.65, "count": 15, "correct": 10}
      }
    }
    ```
    """
    require_key(x_api_key)

    try:
        result = await signal_service.get_accuracy_metrics(ticker=ticker, limit=limit)
        return result
    except Exception as e:
        logger.error(f"Error calculating accuracy for ticker {ticker}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Drift Monitoring Endpoints
# ============================================================================

@router.get("/drift/summary")
async def drift_summary(
    model: Optional[str] = None,
    limit: int = 10,
    x_api_key: Optional[str] = Header(default=None),
):
    """
    Get drift audit summary.

    Returns recent drift audit records for model monitoring.
    """
    require_key(x_api_key)

    try:
        result = await signal_service.get_drift_summary(model=model, limit=limit)
        return result
    except Exception as e:
        logger.error(f"Error retrieving drift summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Model Status Endpoints
# ============================================================================

@router.get("/model/status")
async def model_status(
    model: str = "model_a_ml",
    x_api_key: Optional[str] = Header(default=None),
):
    """
    Get model status including registry, signals, and drift.

    Returns comprehensive status for model monitoring dashboards.
    """
    require_key(x_api_key)

    try:
        result = await signal_service.get_model_status(model=model)
        return result
    except Exception as e:
        logger.error(f"Error retrieving model status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/model/status/summary")
async def model_status_summary(
    model: str = "model_a_ml",
    x_api_key: Optional[str] = Header(default=None),
):
    """
    Get model status summary.

    Returns a condensed view of model health including latest run,
    signal count, and drift metrics.
    """
    require_key(x_api_key)

    try:
        # Get full status
        status = await signal_service.get_model_status(model=model)

        # Extract summary data
        registry = status.get('registry')
        signals = status.get('signals')
        drift = status.get('drift')

        return {
            "status": "ok",
            "model": model,
            "last_run": {
                "version": registry['version'] if registry else None,
                "created_at": registry['created_at'] if registry else None,
                "roc_auc_mean": (registry['metrics'].get('roc_auc_mean') if registry and registry['metrics'] else None),
                "rmse_mean": (registry['metrics'].get('rmse_mean') if registry and registry['metrics'] else None),
            },
            "signals": {
                "as_of": signals['as_of'] if signals else None,
                "row_count": signals['row_count'] if signals else 0,
            },
            "drift": {
                "psi_mean": (drift['metrics'].get('psi_mean') if drift and drift['metrics'] else None),
                "psi_max": (drift['metrics'].get('psi_max') if drift and drift['metrics'] else None),
                "created_at": drift['created_at'] if drift else None,
            },
        }
    except Exception as e:
        logger.error(f"Error retrieving model status summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/model/compare")
async def model_compare(
    model: str = "model_a_ml",
    left_version: Optional[str] = None,
    right_version: Optional[str] = None,
    x_api_key: Optional[str] = Header(default=None),
):
    """
    Compare two model versions.

    Returns metrics comparison and deltas between model versions.
    This endpoint remains as-is since it has complex comparison logic
    that doesn't fit cleanly into the repository pattern.
    """
    require_key(x_api_key)

    from app.core import db_context
    from psycopg2.extras import RealDictCursor

    try:
        with db_context() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)

            if left_version and right_version:
                cur.execute(
                    """
                    SELECT version, metrics, created_at
                    FROM model_registry
                    WHERE model_name = %s AND version IN (%s, %s)
                    ORDER BY created_at DESC
                    """,
                    (model, left_version, right_version),
                )
            else:
                cur.execute(
                    """
                    SELECT version, metrics, created_at
                    FROM model_registry
                    WHERE model_name = %s
                    ORDER BY created_at DESC
                    LIMIT 2
                    """,
                    (model,),
                )

            rows = cur.fetchall()

        if len(rows) < 2:
            raise HTTPException(status_code=404, detail="Not enough model runs to compare.")

        right = rows[0]
        left = rows[1]
        left_metrics = left['metrics'] or {}
        right_metrics = right['metrics'] or {}

        def delta(key: str):
            if key in left_metrics and key in right_metrics:
                try:
                    return float(right_metrics[key]) - float(left_metrics[key])
                except (TypeError, ValueError):
                    return None
            return None

        return {
            "status": "ok",
            "model": model,
            "left": {
                "version": left['version'],
                "created_at": left['created_at'].isoformat() if left['created_at'] else None,
                "metrics": left_metrics,
            },
            "right": {
                "version": right['version'],
                "created_at": right['created_at'].isoformat() if right['created_at'] else None,
                "metrics": right_metrics,
            },
            "delta": {
                "roc_auc_mean": delta("roc_auc_mean"),
                "rmse_mean": delta("rmse_mean"),
                "mean_confidence_gap": delta("mean_confidence_gap"),
                "population_stability_index": delta("population_stability_index"),
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error comparing model versions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Assistant Chat Endpoint
# ============================================================================

@router.post("/assistant/chat")
async def assistant_chat(
    req: AssistantChatReq,
    x_api_key: Optional[str] = Header(default=None)
):
    """
    Chat with the AI assistant.

    This endpoint remains as-is since it's part of a separate assistant feature.
    """
    require_key(x_api_key)

    if not ENABLE_ASSISTANT:
        raise HTTPException(status_code=503, detail="Assistant paused (ENABLE_ASSISTANT=false).")

    try:
        from services.chat_engine import generate_response
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Assistant module import failed: {exc}")

    try:
        reply = generate_response(req.query)
    except Exception as exc:
        logger.exception("Assistant chat failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))

    return {"reply": reply}
