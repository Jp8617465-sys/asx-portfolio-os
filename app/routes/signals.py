"""
app/routes/signals.py
ML signals, model status, and drift endpoints.
"""

import json
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Header, HTTPException
from psycopg2.extras import execute_values
from pydantic import BaseModel

from app.core import db, require_key, logger, parse_as_of, ENABLE_ASSISTANT

router = APIRouter()


class ModelSignalsPersistReq(BaseModel):
    model: str
    as_of: str
    signals: List[Dict[str, Any]]


class ModelRegistryReq(BaseModel):
    model_name: str
    version: Optional[str] = None
    run_id: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None
    features: Optional[List[str]] = None
    artifacts: Optional[Dict[str, Any]] = None


class DriftAuditReq(BaseModel):
    model: str
    baseline_label: str
    current_label: str
    metrics: Dict[str, Any]


class AssistantChatReq(BaseModel):
    query: str


@router.post("/persist/ml_signals")
def persist_ml_signals(req: ModelSignalsPersistReq, x_api_key: Optional[str] = Header(default=None)):
    """Persist ML model signals to database."""
    require_key(x_api_key)

    rows = []
    for s in req.signals:
        rows.append((
            req.as_of,
            req.model,
            s.get("symbol"),
            int(s.get("rank")) if s.get("rank") is not None else None,
            float(s.get("score")) if s.get("score") is not None else None,
            float(s.get("ml_prob")) if s.get("ml_prob") is not None else None,
            float(s.get("ml_expected_return")) if s.get("ml_expected_return") is not None else None,
        ))

    with db() as con, con.cursor() as cur:
        execute_values(
            cur,
            """
            insert into model_a_ml_signals (as_of, model, symbol, rank, score, ml_prob, ml_expected_return)
            values %s
            on conflict (as_of, model, symbol) do update set
              rank = excluded.rank,
              score = excluded.score,
              ml_prob = excluded.ml_prob,
              ml_expected_return = excluded.ml_expected_return
            """,
            rows
        )
        con.commit()

    return {"status": "ok", "rows": len(rows)}


@router.post("/registry/model_run")
def register_model_run(req: ModelRegistryReq, x_api_key: Optional[str] = Header(default=None)):
    """Register a model run in the registry."""
    require_key(x_api_key)

    with db() as con, con.cursor() as cur:
        cur.execute(
            """
            insert into model_registry (model_name, version, run_id, metrics, features, artifacts)
            values (%s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb)
            returning id
            """,
            (
                req.model_name,
                req.version,
                req.run_id,
                json.dumps(req.metrics or {}),
                json.dumps(req.features or []),
                json.dumps(req.artifacts or {}),
            ),
        )
        new_id = cur.fetchone()[0]
        con.commit()

    return {"status": "ok", "id": int(new_id)}


@router.post("/drift/audit")
def persist_drift_audit(req: DriftAuditReq, x_api_key: Optional[str] = Header(default=None)):
    """Persist drift audit metrics."""
    require_key(x_api_key)

    with db() as con, con.cursor() as cur:
        cur.execute(
            """
            insert into model_a_drift_audit (model, baseline_label, current_label, metrics)
            values (%s, %s, %s, %s::jsonb)
            returning id
            """,
            (req.model, req.baseline_label, req.current_label, json.dumps(req.metrics)),
        )
        new_id = cur.fetchone()[0]
        con.commit()

    return {"status": "ok", "id": int(new_id)}


@router.post("/assistant/chat")
def assistant_chat(req: AssistantChatReq, x_api_key: Optional[str] = Header(default=None)):
    """Chat with the AI assistant."""
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


@router.get("/drift/summary")
def drift_summary(
    model: Optional[str] = None,
    limit: int = 10,
    x_api_key: Optional[str] = Header(default=None),
):
    """Get drift audit summary."""
    require_key(x_api_key)

    with db() as con, con.cursor() as cur:
        if model:
            cur.execute(
                """
                select id, model, baseline_label, current_label, metrics, created_at
                from model_a_drift_audit
                where model = %s
                order by created_at desc
                limit %s
                """,
                (model, limit),
            )
        else:
            cur.execute(
                """
                select id, model, baseline_label, current_label, metrics, created_at
                from model_a_drift_audit
                order by created_at desc
                limit %s
                """,
                (limit,),
            )
        rows = cur.fetchall()

    out = []
    for r in rows:
        out.append({
            "id": int(r[0]),
            "model": r[1],
            "baseline_label": r[2],
            "current_label": r[3],
            "metrics": r[4],
            "created_at": r[5].isoformat() if r[5] else None,
        })

    return {"status": "ok", "count": len(out), "rows": out}


@router.get("/model/status")
def model_status(
    model: str = "model_a_ml",
    x_api_key: Optional[str] = Header(default=None),
):
    """Get model status including registry, signals, and drift."""
    require_key(x_api_key)

    with db() as con, con.cursor() as cur:
        cur.execute(
            """
            select id, model_name, version, metrics, features, artifacts, created_at
            from model_registry
            where model_name = %s
            order by created_at desc
            limit 1
            """,
            (model,),
        )
        reg = cur.fetchone()

        cur.execute(
            """
            select as_of, count(*)
            from model_a_ml_signals
            where model = %s
            group by as_of
            order by as_of desc
            limit 1
            """,
            (model,),
        )
        sig = cur.fetchone()

        cur.execute(
            """
            select id, baseline_label, current_label, metrics, created_at
            from model_a_drift_audit
            where model = %s
            order by created_at desc
            limit 1
            """,
            (model,),
        )
        drift = cur.fetchone()

    out = {"status": "ok", "model": model}
    if reg:
        out["registry"] = {
            "id": int(reg[0]),
            "model_name": reg[1],
            "version": reg[2],
            "metrics": reg[3],
            "features": reg[4],
            "artifacts": reg[5],
            "created_at": reg[6].isoformat() if reg[6] else None,
        }
    if sig:
        out["signals"] = {
            "as_of": sig[0].isoformat() if sig[0] else None,
            "row_count": int(sig[1]),
        }
    if drift:
        out["drift"] = {
            "id": int(drift[0]),
            "baseline_label": drift[1],
            "current_label": drift[2],
            "metrics": drift[3],
            "created_at": drift[4].isoformat() if drift[4] else None,
        }

    return out


@router.get("/model/status/summary")
def model_status_summary(
    model: str = "model_a_ml",
    x_api_key: Optional[str] = Header(default=None),
):
    """Get model status summary."""
    require_key(x_api_key)

    with db() as con, con.cursor() as cur:
        cur.execute(
            """
            select version, metrics, created_at
            from model_registry
            where model_name = %s
            order by created_at desc
            limit 1
            """,
            (model,),
        )
        reg = cur.fetchone()

        cur.execute(
            """
            select as_of, count(*)
            from model_a_ml_signals
            where model = %s
            group by as_of
            order by as_of desc
            limit 1
            """,
            (model,),
        )
        sig = cur.fetchone()

        cur.execute(
            """
            select metrics, created_at
            from model_a_drift_audit
            where model = %s
            order by created_at desc
            limit 1
            """,
            (model,),
        )
        drift = cur.fetchone()

    return {
        "status": "ok",
        "model": model,
        "last_run": {
            "version": reg[0] if reg else None,
            "created_at": reg[2].isoformat() if reg and reg[2] else None,
            "roc_auc_mean": (reg[1].get("roc_auc_mean") if reg and reg[1] else None),
            "rmse_mean": (reg[1].get("rmse_mean") if reg and reg[1] else None),
        },
        "signals": {
            "as_of": sig[0].isoformat() if sig and sig[0] else None,
            "row_count": int(sig[1]) if sig else 0,
        },
        "drift": {
            "psi_mean": (drift[0].get("psi_mean") if drift and drift[0] else None),
            "psi_max": (drift[0].get("psi_max") if drift and drift[0] else None),
            "created_at": drift[1].isoformat() if drift and drift[1] else None,
        },
    }


@router.get("/model/compare")
def model_compare(
    model: str = "model_a_ml",
    left_version: Optional[str] = None,
    right_version: Optional[str] = None,
    x_api_key: Optional[str] = Header(default=None),
):
    """Compare two model versions."""
    require_key(x_api_key)

    with db() as con, con.cursor() as cur:
        if left_version and right_version:
            cur.execute(
                """
                select version, metrics, created_at
                from model_registry
                where model_name = %s and version in (%s, %s)
                order by created_at desc
                """,
                (model, left_version, right_version),
            )
        else:
            cur.execute(
                """
                select version, metrics, created_at
                from model_registry
                where model_name = %s
                order by created_at desc
                limit 2
                """,
                (model,),
            )
        rows = cur.fetchall()

    if len(rows) < 2:
        raise HTTPException(status_code=404, detail="Not enough model runs to compare.")

    right = rows[0]
    left = rows[1]
    left_metrics = left[1] or {}
    right_metrics = right[1] or {}

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
            "version": left[0],
            "created_at": left[2].isoformat() if left[2] else None,
            "metrics": left_metrics,
        },
        "right": {
            "version": right[0],
            "created_at": right[2].isoformat() if right[2] else None,
            "metrics": right_metrics,
        },
        "delta": {
            "roc_auc_mean": delta("roc_auc_mean"),
            "rmse_mean": delta("rmse_mean"),
            "mean_confidence_gap": delta("mean_confidence_gap"),
            "population_stability_index": delta("population_stability_index"),
        },
    }


@router.get("/signals/live")
def signals_live(
    model: str = "model_a_ml",
    as_of: Optional[str] = None,
    limit: int = 20,
    x_api_key: Optional[str] = Header(default=None),
):
    """Get live model signals."""
    require_key(x_api_key)
    if limit < 1 or limit > 200:
        raise HTTPException(status_code=400, detail="limit must be between 1 and 200")

    with db() as con, con.cursor() as cur:
        if as_of:
            as_of_d = parse_as_of(as_of)
        else:
            cur.execute(
                """
                select max(as_of)
                from model_a_ml_signals
                where model = %s
                """,
                (model,),
            )
            row = cur.fetchone()
            if not row or not row[0]:
                raise HTTPException(status_code=404, detail="No signals available.")
            as_of_d = row[0]

        cur.execute(
            """
            select symbol, rank, score, ml_prob, ml_expected_return
            from model_a_ml_signals
            where model = %s and as_of = %s
            order by rank asc
            limit %s
            """,
            (model, as_of_d, limit),
        )
        rows = cur.fetchall()

    signals = [
        {
            "symbol": r[0],
            "rank": int(r[1]) if r[1] is not None else None,
            "score": float(r[2]) if r[2] is not None else None,
            "ml_prob": float(r[3]) if r[3] is not None else None,
            "ml_expected_return": float(r[4]) if r[4] is not None else None,
        }
        for r in rows
    ]

    return {"status": "ok", "model": model, "as_of": as_of_d.isoformat(), "count": len(signals), "signals": signals}


@router.get("/signals/live/{ticker}")
def get_live_signal_for_ticker(
    ticker: str,
    x_api_key: Optional[str] = Header(default=None),
):
    """
    Get the latest signal for a specific ticker.

    **Parameters**:
    - ticker: Stock ticker symbol (e.g., "BHP.AX")

    **Returns**:
    - Latest Model A signal with confidence and expected return
    """
    require_key(x_api_key)

    ticker = ticker.strip().upper()
    if not ticker.endswith('.AX'):
        ticker = f"{ticker}.AX"

    with db() as con, con.cursor() as cur:
        # Get latest signal
        cur.execute(
            """
            SELECT
                as_of,
                signal_label,
                confidence,
                ml_prob,
                ml_expected_return,
                rank
            FROM model_a_ml_signals
            WHERE symbol = %s
            ORDER BY as_of DESC
            LIMIT 1
            """,
            (ticker,)
        )
        row = cur.fetchone()

        if not row:
            raise HTTPException(
                status_code=404,
                detail=f"No signal found for {ticker}"
            )

        return {
            "status": "ok",
            "ticker": ticker,
            "as_of": row[0].isoformat() if row[0] else None,
            "signal": row[1],
            "confidence": float(row[2]) if row[2] else None,
            "ml_prob": float(row[3]) if row[3] else None,
            "ml_expected_return": float(row[4]) if row[4] else None,
            "rank": int(row[5]) if row[5] else None,
        }


@router.get("/signals/{ticker}/reasoning")
def get_signal_reasoning(
    ticker: str,
    x_api_key: Optional[str] = Header(default=None),
):
    """
    Get SHAP-based reasoning for why a stock received its signal.

    **Parameters**:
    - ticker: Stock ticker symbol (e.g., "BHP.AX")

    **Returns**:
    - Feature contributions (SHAP values)
    - Top factors driving the signal
    - Direction of each factor's influence

    **Example Response**:
    ```json
    {
      "ticker": "BHP.AX",
      "signal": "STRONG_BUY",
      "confidence": 0.87,
      "factors": [
        {"feature": "momentum", "contribution": 0.45, "direction": "positive"},
        {"feature": "volume_trend", "contribution": 0.32, "direction": "positive"},
        {"feature": "rsi", "contribution": -0.15, "direction": "negative"},
        {"feature": "ma_cross", "contribution": 0.28, "direction": "positive"}
      ]
    }
    ```
    """
    require_key(x_api_key)

    ticker = ticker.strip().upper()
    if not ticker.endswith('.AX'):
        ticker = f"{ticker}.AX"

    with db() as con, con.cursor() as cur:
        # Get latest signal with SHAP values
        cur.execute(
            """
            SELECT
                signal_label,
                confidence,
                shap_values,
                feature_contributions
            FROM model_a_ml_signals
            WHERE symbol = %s
            ORDER BY as_of DESC
            LIMIT 1
            """,
            (ticker,)
        )
        row = cur.fetchone()

        if not row:
            raise HTTPException(
                status_code=404,
                detail=f"No signal reasoning found for {ticker}"
            )

        signal_label = row[0]
        confidence = float(row[1]) if row[1] else None
        shap_values = row[2]  # JSONB column
        feature_contributions = row[3]  # JSONB column

        # Parse SHAP values if stored as JSON
        factors = []
        if feature_contributions and isinstance(feature_contributions, dict):
            # Sort by absolute contribution value
            sorted_features = sorted(
                feature_contributions.items(),
                key=lambda x: abs(float(x[1])),
                reverse=True
            )

            for feature_name, contribution_value in sorted_features:
                contrib_float = float(contribution_value)
                factors.append({
                    "feature": feature_name,
                    "contribution": abs(contrib_float),
                    "direction": "positive" if contrib_float > 0 else "negative"
                })

        elif shap_values and isinstance(shap_values, dict):
            # Fall back to shap_values if feature_contributions not available
            sorted_features = sorted(
                shap_values.items(),
                key=lambda x: abs(float(x[1])),
                reverse=True
            )

            for feature_name, shap_value in sorted_features:
                shap_float = float(shap_value)
                factors.append({
                    "feature": feature_name,
                    "contribution": abs(shap_float),
                    "direction": "positive" if shap_float > 0 else "negative"
                })

        return {
            "status": "ok",
            "ticker": ticker,
            "signal": signal_label,
            "confidence": confidence,
            "factors": factors[:10],  # Top 10 factors
            "explanation": f"{signal_label} signal driven by {len(factors)} features"
        }


@router.get("/accuracy/{ticker}")
def get_signal_accuracy(
    ticker: str,
    limit: int = 50,
    x_api_key: Optional[str] = Header(default=None),
):
    """
    Get historical signal accuracy for a specific ticker.

    Shows how accurate Model A signals have been for this stock historically.

    **Parameters**:
    - ticker: Stock ticker symbol (e.g., "BHP.AX")
    - limit: Number of historical signals to analyze (default: 50)

    **Returns**:
    - Accuracy by signal type (STRONG_BUY, BUY, HOLD, SELL, STRONG_SELL)
    - Overall win rate
    - Total signals analyzed

    **Example Response**:
    ```json
    {
      "ticker": "BHP.AX",
      "signals_analyzed": 48,
      "overall_accuracy": 0.68,
      "by_signal": {
        "STRONG_BUY": {"accuracy": 0.72, "count": 11, "correct": 8},
        "BUY": {"accuracy": 0.65, "count": 15, "correct": 10},
        "HOLD": {"accuracy": 0.60, "count": 10, "correct": 6},
        "SELL": {"accuracy": 0.70, "count": 8, "correct": 6},
        "STRONG_SELL": {"accuracy": 0.75, "count": 4, "correct": 3}
      }
    }
    ```
    """
    require_key(x_api_key)

    ticker = ticker.strip().upper()
    if not ticker.endswith('.AX'):
        ticker = f"{ticker}.AX"

    with db() as con, con.cursor() as cur:
        # Get historical signals with actual outcomes
        # Note: This is a simplified version. In production, you'd compare
        # the signal prediction with actual price movement over the next N days.
        cur.execute(
            """
            SELECT
                s.signal_label,
                s.confidence,
                s.as_of,
                -- Calculate if signal was correct (simplified):
                -- Compare predicted return with actual return 30 days later
                CASE
                    WHEN s.ml_expected_return > 0
                         AND p_future.close > p_current.close
                    THEN true
                    WHEN s.ml_expected_return < 0
                         AND p_future.close < p_current.close
                    THEN true
                    WHEN s.ml_expected_return = 0
                         AND abs(p_future.close - p_current.close) / p_current.close < 0.02
                    THEN true
                    ELSE false
                END as was_correct
            FROM model_a_ml_signals s
            LEFT JOIN prices p_current ON p_current.ticker = s.symbol
                AND p_current.dt = s.as_of
            LEFT JOIN prices p_future ON p_future.ticker = s.symbol
                AND p_future.dt = s.as_of + INTERVAL '30 days'
            WHERE s.symbol = %s
              AND p_current.close IS NOT NULL
              AND p_future.close IS NOT NULL
            ORDER BY s.as_of DESC
            LIMIT %s
            """,
            (ticker, limit)
        )
        rows = cur.fetchall()

        if not rows:
            # Return default response if no historical data
            return {
                "status": "ok",
                "ticker": ticker,
                "signals_analyzed": 0,
                "overall_accuracy": None,
                "by_signal": {},
                "message": "No historical signals with outcome data available"
            }

        # Calculate accuracy by signal type
        signal_stats = {}
        total_correct = 0
        total_signals = 0

        for signal_label, confidence, as_of, was_correct in rows:
            if signal_label not in signal_stats:
                signal_stats[signal_label] = {
                    "count": 0,
                    "correct": 0
                }

            signal_stats[signal_label]["count"] += 1
            total_signals += 1

            if was_correct:
                signal_stats[signal_label]["correct"] += 1
                total_correct += 1

        # Calculate accuracies
        by_signal = {}
        for signal_label, stats in signal_stats.items():
            accuracy = stats["correct"] / stats["count"] if stats["count"] > 0 else 0
            by_signal[signal_label] = {
                "accuracy": round(accuracy, 2),
                "count": stats["count"],
                "correct": stats["correct"]
            }

        overall_accuracy = total_correct / total_signals if total_signals > 0 else 0

        return {
            "status": "ok",
            "ticker": ticker,
            "signals_analyzed": total_signals,
            "overall_accuracy": round(overall_accuracy, 2),
            "by_signal": by_signal,
            "lookback_days": 30,
            "message": f"Analyzed {total_signals} historical signals"
        }
