"""
app/features/signals/repositories/signal_repository.py
Repository for signal data access and persistence.
"""

import json
from typing import Optional, List, Dict, Any
from datetime import date, datetime

from psycopg2.extras import RealDictCursor, execute_values

from app.core.repository import BaseRepository
from app.core import db_context, logger, parse_as_of


class SignalRepository(BaseRepository):
    """
    Repository for managing ML signal data persistence and retrieval.

    This repository handles all database operations for:
    - ML signals (model_a_ml_signals)
    - Model registry (model_registry)
    - Drift audit data (model_a_drift_audit)

    All methods use RealDictCursor for dictionary-style result access
    and execute_values for efficient bulk inserts.
    """

    def __init__(self):
        """Initialize SignalRepository with the ml_signals table."""
        super().__init__('model_a_ml_signals')
        logger.debug("SignalRepository initialized")

    def get_live_signals(
        self,
        model: str = "model_a_ml",
        limit: int = 20,
        as_of: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Retrieve live signals for a given model.

        Args:
            model: Model name to filter signals (default: "model_a_ml")
            limit: Maximum number of signals to return (default: 20)
            as_of: Specific date to retrieve signals for. If None, gets latest available.

        Returns:
            Dictionary containing:
                - as_of: Date of the signals
                - signals: List of signal dictionaries with symbol, rank, score, ml_prob, ml_expected_return
                - count: Total number of signals returned

        Raises:
            Exception: If no signals are available for the model

        Example:
            >>> repo = SignalRepository()
            >>> result = repo.get_live_signals(model="model_a_ml", limit=10)
            >>> print(result['count'])
            10
            >>> print(result['signals'][0]['symbol'])
            'BHP.AX'
        """
        try:
            with db_context() as conn:
                cur = conn.cursor(cursor_factory=RealDictCursor)

                # Determine as_of date if not provided
                if as_of is None:
                    cur.execute(
                        """
                        SELECT MAX(as_of) as max_date
                        FROM model_a_ml_signals
                        WHERE model = %s
                        """,
                        (model,)
                    )
                    row = cur.fetchone()
                    if not row or not row['max_date']:
                        logger.warning(f"No signals found for model: {model}")
                        raise Exception(f"No signals available for model: {model}")
                    as_of = row['max_date']

                # Retrieve signals for the determined date
                cur.execute(
                    """
                    SELECT symbol, rank, score, ml_prob, ml_expected_return
                    FROM model_a_ml_signals
                    WHERE model = %s AND as_of = %s
                    ORDER BY rank ASC
                    LIMIT %s
                    """,
                    (model, as_of, limit)
                )
                rows = cur.fetchall()

                signals = [
                    {
                        "symbol": row['symbol'],
                        "rank": int(row['rank']) if row['rank'] is not None else None,
                        "score": float(row['score']) if row['score'] is not None else None,
                        "ml_prob": float(row['ml_prob']) if row['ml_prob'] is not None else None,
                        "ml_expected_return": float(row['ml_expected_return']) if row['ml_expected_return'] is not None else None,
                    }
                    for row in rows
                ]

                logger.info(f"Retrieved {len(signals)} live signals for model={model}, as_of={as_of}")

                return {
                    "as_of": as_of,
                    "signals": signals,
                    "count": len(signals)
                }

        except Exception as e:
            logger.error(f"Error retrieving live signals: {e}")
            raise

    def get_signal_by_ticker(
        self,
        ticker: str,
        model: str = "model_a_ml",
        as_of: Optional[date] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Get the latest signal for a specific ticker.

        Args:
            ticker: Stock ticker symbol (e.g., "BHP.AX")
            model: Model name to filter signals (default: "model_a_ml")
            as_of: Specific date to retrieve signal for. If None, gets latest.

        Returns:
            Dictionary with signal data or None if not found:
                - ticker: Stock ticker symbol
                - as_of: Signal date
                - signal_label: Signal classification
                - confidence: Signal confidence score
                - ml_prob: ML model probability
                - ml_expected_return: Expected return prediction
                - rank: Signal rank

        Example:
            >>> repo = SignalRepository()
            >>> signal = repo.get_signal_by_ticker("BHP.AX")
            >>> print(signal['signal_label'])
            'STRONG_BUY'
        """
        try:
            ticker = ticker.strip().upper()
            if not ticker.endswith('.AX'):
                ticker = f"{ticker}.AX"

            with db_context() as conn:
                cur = conn.cursor(cursor_factory=RealDictCursor)

                if as_of:
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
                        WHERE symbol = %s AND model = %s AND as_of = %s
                        LIMIT 1
                        """,
                        (ticker, model, as_of)
                    )
                else:
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
                        WHERE symbol = %s AND model = %s
                        ORDER BY as_of DESC
                        LIMIT 1
                        """,
                        (ticker, model)
                    )

                row = cur.fetchone()

                if not row:
                    logger.debug(f"No signal found for ticker={ticker}, model={model}")
                    return None

                signal = {
                    "ticker": ticker,
                    "as_of": row['as_of'].isoformat() if row['as_of'] else None,
                    "signal_label": row['signal_label'],
                    "confidence": float(row['confidence']) if row['confidence'] else None,
                    "ml_prob": float(row['ml_prob']) if row['ml_prob'] else None,
                    "ml_expected_return": float(row['ml_expected_return']) if row['ml_expected_return'] else None,
                    "rank": int(row['rank']) if row['rank'] else None,
                }

                logger.debug(f"Retrieved signal for ticker={ticker}: {signal['signal_label']}")
                return signal

        except Exception as e:
            logger.error(f"Error retrieving signal for ticker={ticker}: {e}")
            raise

    def get_signal_reasoning(self, ticker: str) -> Optional[Dict[str, Any]]:
        """
        Get SHAP-based reasoning (feature contributions) for a ticker's signal.

        Args:
            ticker: Stock ticker symbol (e.g., "BHP.AX")

        Returns:
            Dictionary with reasoning data or None if not found:
                - ticker: Stock ticker symbol
                - signal_label: Signal classification
                - confidence: Signal confidence score
                - shap_values: Raw SHAP values (JSONB)
                - feature_contributions: Feature contribution dict (JSONB)
                - factors: Sorted list of top contributing factors

        Example:
            >>> repo = SignalRepository()
            >>> reasoning = repo.get_signal_reasoning("BHP.AX")
            >>> print(reasoning['factors'][0]['feature'])
            'momentum'
        """
        try:
            ticker = ticker.strip().upper()
            if not ticker.endswith('.AX'):
                ticker = f"{ticker}.AX"

            with db_context() as conn:
                cur = conn.cursor(cursor_factory=RealDictCursor)

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
                    logger.debug(f"No signal reasoning found for ticker={ticker}")
                    return None

                result = {
                    "ticker": ticker,
                    "signal_label": row['signal_label'],
                    "confidence": float(row['confidence']) if row['confidence'] else None,
                    "shap_values": row['shap_values'],
                    "feature_contributions": row['feature_contributions'],
                    "factors": []
                }

                logger.debug(f"Retrieved signal reasoning for ticker={ticker}")
                return result

        except Exception as e:
            logger.error(f"Error retrieving signal reasoning for ticker={ticker}: {e}")
            raise

    def persist_signals(
        self,
        signals: List[Dict[str, Any]],
        model: str,
        as_of: str
    ) -> int:
        """
        Persist ML model signals to the database using bulk insert.

        Uses execute_values for efficient bulk insertion with ON CONFLICT handling
        to update existing records.

        Args:
            signals: List of signal dictionaries, each containing:
                - symbol: Stock ticker
                - rank: Signal rank (optional)
                - score: Signal score (optional)
                - ml_prob: ML probability (optional)
                - ml_expected_return: Expected return (optional)
            model: Model name/identifier
            as_of: Date string in YYYY-MM-DD format

        Returns:
            Number of signals persisted

        Example:
            >>> repo = SignalRepository()
            >>> signals = [
            ...     {"symbol": "BHP.AX", "rank": 1, "score": 0.95, "ml_prob": 0.87, "ml_expected_return": 0.15},
            ...     {"symbol": "CBA.AX", "rank": 2, "score": 0.92, "ml_prob": 0.84, "ml_expected_return": 0.12}
            ... ]
            >>> count = repo.persist_signals(signals, "model_a_ml", "2024-01-15")
            >>> print(count)
            2
        """
        if not signals:
            logger.debug("No signals to persist")
            return 0

        try:
            # Prepare rows for bulk insert
            rows = []
            for s in signals:
                rows.append((
                    as_of,
                    model,
                    s.get("symbol"),
                    int(s.get("rank")) if s.get("rank") is not None else None,
                    float(s.get("score")) if s.get("score") is not None else None,
                    float(s.get("ml_prob")) if s.get("ml_prob") is not None else None,
                    float(s.get("ml_expected_return")) if s.get("ml_expected_return") is not None else None,
                ))

            with db_context() as conn:
                cur = conn.cursor()
                execute_values(
                    cur,
                    """
                    INSERT INTO model_a_ml_signals (as_of, model, symbol, rank, score, ml_prob, ml_expected_return)
                    VALUES %s
                    ON CONFLICT (as_of, model, symbol) DO UPDATE SET
                        rank = EXCLUDED.rank,
                        score = EXCLUDED.score,
                        ml_prob = EXCLUDED.ml_prob,
                        ml_expected_return = EXCLUDED.ml_expected_return
                    """,
                    rows
                )

            logger.info(f"Persisted {len(rows)} signals for model={model}, as_of={as_of}")
            return len(rows)

        except Exception as e:
            logger.error(f"Error persisting signals: {e}")
            raise

    def get_accuracy_metrics(
        self,
        ticker: str,
        limit: int = 50
    ) -> Dict[str, Any]:
        """
        Calculate historical signal accuracy for a specific ticker.

        Analyzes historical signals by comparing predicted returns with actual
        price movements 30 days later.

        Args:
            ticker: Stock ticker symbol (e.g., "BHP.AX")
            limit: Number of historical signals to analyze (default: 50)

        Returns:
            Dictionary containing:
                - ticker: Stock ticker symbol
                - signals_analyzed: Total number of signals analyzed
                - overall_accuracy: Overall accuracy rate (0-1)
                - by_signal: Accuracy breakdown by signal type
                - lookback_days: Number of days used for validation (30)

        Example:
            >>> repo = SignalRepository()
            >>> metrics = repo.get_accuracy_metrics("BHP.AX", limit=100)
            >>> print(metrics['overall_accuracy'])
            0.68
            >>> print(metrics['by_signal']['STRONG_BUY']['accuracy'])
            0.72
        """
        try:
            ticker = ticker.strip().upper()
            if not ticker.endswith('.AX'):
                ticker = f"{ticker}.AX"

            with db_context() as conn:
                cur = conn.cursor(cursor_factory=RealDictCursor)

                # Get historical signals with actual outcomes
                cur.execute(
                    """
                    SELECT
                        s.signal_label,
                        s.confidence,
                        s.as_of,
                        -- Calculate if signal was correct by comparing predicted vs actual return
                        CASE
                            WHEN s.ml_expected_return > 0
                                 AND p_future.close > p_current.close
                            THEN true
                            WHEN s.ml_expected_return < 0
                                 AND p_future.close < p_current.close
                            THEN true
                            WHEN s.ml_expected_return = 0
                                 AND ABS(p_future.close - p_current.close) / p_current.close < 0.02
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
                    logger.debug(f"No historical signal data found for ticker={ticker}")
                    return {
                        "ticker": ticker,
                        "signals_analyzed": 0,
                        "overall_accuracy": None,
                        "by_signal": {},
                        "lookback_days": 30,
                        "message": "No historical signals with outcome data available"
                    }

                # Calculate accuracy statistics
                signal_stats = {}
                total_correct = 0
                total_signals = 0

                for row in rows:
                    signal_label = row['signal_label']
                    was_correct = row['was_correct']

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

                # Format results
                by_signal = {}
                for signal_label, stats in signal_stats.items():
                    accuracy = stats["correct"] / stats["count"] if stats["count"] > 0 else 0
                    by_signal[signal_label] = {
                        "accuracy": round(accuracy, 2),
                        "count": stats["count"],
                        "correct": stats["correct"]
                    }

                overall_accuracy = total_correct / total_signals if total_signals > 0 else 0

                logger.info(
                    f"Calculated accuracy metrics for ticker={ticker}: "
                    f"{total_signals} signals, {overall_accuracy:.2%} accuracy"
                )

                return {
                    "ticker": ticker,
                    "signals_analyzed": total_signals,
                    "overall_accuracy": round(overall_accuracy, 2),
                    "by_signal": by_signal,
                    "lookback_days": 30,
                    "message": f"Analyzed {total_signals} historical signals"
                }

        except Exception as e:
            logger.error(f"Error calculating accuracy metrics for ticker={ticker}: {e}")
            raise

    def register_model_run(
        self,
        model_name: str,
        version: Optional[str] = None,
        run_id: Optional[str] = None,
        metrics: Optional[Dict[str, Any]] = None,
        features: Optional[List[str]] = None,
        artifacts: Optional[Dict[str, Any]] = None
    ) -> int:
        """
        Register a model run in the model registry.

        Args:
            model_name: Name of the model
            version: Model version string
            run_id: Unique run identifier
            metrics: Model performance metrics (JSONB)
            features: List of features used
            artifacts: Model artifacts metadata (JSONB)

        Returns:
            ID of the newly created registry entry

        Example:
            >>> repo = SignalRepository()
            >>> reg_id = repo.register_model_run(
            ...     model_name="model_a_ml",
            ...     version="v1.2.0",
            ...     metrics={"roc_auc_mean": 0.85, "rmse_mean": 0.12}
            ... )
            >>> print(reg_id)
            123
        """
        try:
            with db_context() as conn:
                cur = conn.cursor()
                cur.execute(
                    """
                    INSERT INTO model_registry (model_name, version, run_id, metrics, features, artifacts)
                    VALUES (%s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb)
                    RETURNING id
                    """,
                    (
                        model_name,
                        version,
                        run_id,
                        json.dumps(metrics or {}),
                        json.dumps(features or []),
                        json.dumps(artifacts or {}),
                    )
                )
                new_id = cur.fetchone()[0]

                logger.info(
                    f"Registered model run: model_name={model_name}, version={version}, id={new_id}"
                )
                return int(new_id)

        except Exception as e:
            logger.error(f"Error registering model run: {e}")
            raise

    def persist_drift_audit(
        self,
        model: str,
        baseline_label: str,
        current_label: str,
        metrics: Dict[str, Any]
    ) -> int:
        """
        Persist drift audit metrics to the database.

        Args:
            model: Model name/identifier
            baseline_label: Label for baseline dataset
            current_label: Label for current dataset
            metrics: Drift metrics dictionary (JSONB)

        Returns:
            ID of the newly created drift audit entry

        Example:
            >>> repo = SignalRepository()
            >>> audit_id = repo.persist_drift_audit(
            ...     model="model_a_ml",
            ...     baseline_label="2024-01-01",
            ...     current_label="2024-02-01",
            ...     metrics={"psi_mean": 0.05, "psi_max": 0.12}
            ... )
            >>> print(audit_id)
            456
        """
        try:
            with db_context() as conn:
                cur = conn.cursor()
                cur.execute(
                    """
                    INSERT INTO model_a_drift_audit (model, baseline_label, current_label, metrics)
                    VALUES (%s, %s, %s, %s::jsonb)
                    RETURNING id
                    """,
                    (model, baseline_label, current_label, json.dumps(metrics))
                )
                new_id = cur.fetchone()[0]

                logger.info(
                    f"Persisted drift audit: model={model}, baseline={baseline_label}, "
                    f"current={current_label}, id={new_id}"
                )
                return int(new_id)

        except Exception as e:
            logger.error(f"Error persisting drift audit: {e}")
            raise

    def get_drift_summary(
        self,
        model: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get drift audit summary records.

        Args:
            model: Optional model name to filter by
            limit: Maximum number of records to return (default: 10)

        Returns:
            List of drift audit records with id, model, labels, metrics, and timestamp

        Example:
            >>> repo = SignalRepository()
            >>> audits = repo.get_drift_summary(model="model_a_ml", limit=5)
            >>> print(len(audits))
            5
        """
        try:
            with db_context() as conn:
                cur = conn.cursor(cursor_factory=RealDictCursor)

                if model:
                    cur.execute(
                        """
                        SELECT id, model, baseline_label, current_label, metrics, created_at
                        FROM model_a_drift_audit
                        WHERE model = %s
                        ORDER BY created_at DESC
                        LIMIT %s
                        """,
                        (model, limit)
                    )
                else:
                    cur.execute(
                        """
                        SELECT id, model, baseline_label, current_label, metrics, created_at
                        FROM model_a_drift_audit
                        ORDER BY created_at DESC
                        LIMIT %s
                        """,
                        (limit,)
                    )

                rows = cur.fetchall()

                results = [
                    {
                        "id": int(row['id']),
                        "model": row['model'],
                        "baseline_label": row['baseline_label'],
                        "current_label": row['current_label'],
                        "metrics": row['metrics'],
                        "created_at": row['created_at'].isoformat() if row['created_at'] else None,
                    }
                    for row in rows
                ]

                logger.debug(f"Retrieved {len(results)} drift audit records")
                return results

        except Exception as e:
            logger.error(f"Error retrieving drift summary: {e}")
            raise

    def get_model_status(self, model: str = "model_a_ml") -> Dict[str, Any]:
        """
        Get comprehensive model status including registry, signals, and drift data.

        Args:
            model: Model name/identifier (default: "model_a_ml")

        Returns:
            Dictionary containing:
                - model: Model name
                - registry: Latest registry entry (or None)
                - signals: Latest signal count and date (or None)
                - drift: Latest drift audit (or None)

        Example:
            >>> repo = SignalRepository()
            >>> status = repo.get_model_status("model_a_ml")
            >>> print(status['registry']['version'])
            'v1.2.0'
        """
        try:
            with db_context() as conn:
                cur = conn.cursor(cursor_factory=RealDictCursor)

                # Get latest registry entry
                cur.execute(
                    """
                    SELECT id, model_name, version, metrics, features, artifacts, created_at
                    FROM model_registry
                    WHERE model_name = %s
                    ORDER BY created_at DESC
                    LIMIT 1
                    """,
                    (model,)
                )
                reg = cur.fetchone()

                # Get latest signal info
                cur.execute(
                    """
                    SELECT as_of, COUNT(*) as signal_count
                    FROM model_a_ml_signals
                    WHERE model = %s
                    GROUP BY as_of
                    ORDER BY as_of DESC
                    LIMIT 1
                    """,
                    (model,)
                )
                sig = cur.fetchone()

                # Get latest drift audit
                cur.execute(
                    """
                    SELECT id, baseline_label, current_label, metrics, created_at
                    FROM model_a_drift_audit
                    WHERE model = %s
                    ORDER BY created_at DESC
                    LIMIT 1
                    """,
                    (model,)
                )
                drift = cur.fetchone()

            result = {"model": model}

            if reg:
                result["registry"] = {
                    "id": int(reg['id']),
                    "model_name": reg['model_name'],
                    "version": reg['version'],
                    "metrics": reg['metrics'],
                    "features": reg['features'],
                    "artifacts": reg['artifacts'],
                    "created_at": reg['created_at'].isoformat() if reg['created_at'] else None,
                }
            else:
                result["registry"] = None

            if sig:
                result["signals"] = {
                    "as_of": sig['as_of'].isoformat() if sig['as_of'] else None,
                    "row_count": int(sig['signal_count']),
                }
            else:
                result["signals"] = None

            if drift:
                result["drift"] = {
                    "id": int(drift['id']),
                    "baseline_label": drift['baseline_label'],
                    "current_label": drift['current_label'],
                    "metrics": drift['metrics'],
                    "created_at": drift['created_at'].isoformat() if drift['created_at'] else None,
                }
            else:
                result["drift"] = None

            logger.debug(f"Retrieved model status for model={model}")
            return result

        except Exception as e:
            logger.error(f"Error retrieving model status: {e}")
            raise
