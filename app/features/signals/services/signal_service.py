"""
app/features/signals/services/signal_service.py
Business logic service for ML signals and model operations.
"""

from typing import Optional, List, Dict, Any
from datetime import date

from app.core.service import BaseService
from app.core.events.event_bus import EventType
from app.core import logger
from app.features.signals.repositories import SignalRepository


class SignalService(BaseService):
    """
    Service layer for ML signal operations.

    This service encapsulates business logic for:
    - Retrieving and processing live signals
    - Persisting model runs and signals
    - Generating signal explanations with SHAP values
    - Calculating signal accuracy metrics
    - Managing model registry and drift audits

    The service publishes events after significant operations to enable
    event-driven architecture and cross-feature notifications.
    """

    def __init__(self, repository: Optional[SignalRepository] = None):
        """
        Initialize SignalService with repository dependency.

        Args:
            repository: Optional SignalRepository instance for dependency injection.
                       If None, creates a new instance.
        """
        super().__init__()
        self.repo = repository or SignalRepository()
        logger.debug("SignalService initialized")

    async def get_live_signals(
        self,
        model: str = "model_a_ml",
        limit: int = 20,
        as_of: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Retrieve live signals and publish SIGNAL_GENERATED event.

        Args:
            model: Model name to filter signals (default: "model_a_ml")
            limit: Maximum number of signals to return (default: 20)
            as_of: Specific date to retrieve signals for. If None, gets latest.

        Returns:
            Dictionary containing:
                - status: "ok"
                - model: Model name
                - as_of: Date of signals (ISO format)
                - count: Number of signals
                - signals: List of signal dictionaries

        Example:
            >>> service = SignalService()
            >>> result = await service.get_live_signals(limit=10)
            >>> print(result['count'])
            10
        """
        self._log_operation(
            "Retrieving live signals",
            {"model": model, "limit": limit, "as_of": as_of}
        )

        try:
            # Get signals from repository
            result = self.repo.get_live_signals(model=model, limit=limit, as_of=as_of)

            # Publish event for signal retrieval
            await self.publish_event(
                EventType.SIGNAL_GENERATED,
                {
                    "model": model,
                    "as_of": result['as_of'].isoformat() if isinstance(result['as_of'], date) else result['as_of'],
                    "count": result['count'],
                    "top_signal": result['signals'][0]['symbol'] if result['signals'] else None,
                }
            )

            # Format response
            return {
                "status": "ok",
                "model": model,
                "as_of": result['as_of'].isoformat() if isinstance(result['as_of'], date) else result['as_of'],
                "count": result['count'],
                "signals": result['signals']
            }

        except Exception as e:
            logger.error(f"Error in get_live_signals: {e}")
            raise

    async def get_signal_for_ticker(
        self,
        ticker: str,
        model: str = "model_a_ml",
        as_of: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Get the latest signal for a specific ticker.

        Args:
            ticker: Stock ticker symbol (e.g., "BHP.AX")
            model: Model name to filter signals (default: "model_a_ml")
            as_of: Specific date to retrieve signal for. If None, gets latest.

        Returns:
            Dictionary with status and signal data, or error if not found

        Raises:
            ValueError: If no signal found for the ticker

        Example:
            >>> service = SignalService()
            >>> result = await service.get_signal_for_ticker("BHP.AX")
            >>> print(result['signal_label'])
            'STRONG_BUY'
        """
        self._log_operation(
            "Retrieving signal for ticker",
            {"ticker": ticker, "model": model}
        )

        try:
            signal = self.repo.get_signal_by_ticker(ticker=ticker, model=model, as_of=as_of)

            if not signal:
                raise ValueError(f"No signal found for {ticker}")

            return {
                "status": "ok",
                **signal
            }

        except Exception as e:
            logger.error(f"Error getting signal for ticker {ticker}: {e}")
            raise

    async def get_signal_with_reasoning(
        self,
        ticker: str
    ) -> Dict[str, Any]:
        """
        Get signal with SHAP-based reasoning (feature contributions).

        Combines signal data with SHAP values to explain why a stock
        received its signal. Parses and ranks feature contributions.

        Args:
            ticker: Stock ticker symbol (e.g., "BHP.AX")

        Returns:
            Dictionary containing:
                - status: "ok"
                - ticker: Stock ticker
                - signal: Signal label
                - confidence: Signal confidence
                - factors: List of top contributing factors
                - explanation: Human-readable explanation

        Raises:
            ValueError: If no signal reasoning found for the ticker

        Example:
            >>> service = SignalService()
            >>> result = await service.get_signal_with_reasoning("BHP.AX")
            >>> print(result['factors'][0]['feature'])
            'momentum'
            >>> print(result['factors'][0]['direction'])
            'positive'
        """
        self._log_operation(
            "Retrieving signal reasoning",
            {"ticker": ticker}
        )

        try:
            reasoning = self.repo.get_signal_reasoning(ticker=ticker)

            if not reasoning:
                raise ValueError(f"No signal reasoning found for {ticker}")

            # Parse and rank feature contributions
            factors = self._parse_feature_contributions(
                reasoning['feature_contributions'],
                reasoning['shap_values']
            )

            result = {
                "status": "ok",
                "ticker": reasoning['ticker'],
                "signal": reasoning['signal_label'],
                "confidence": reasoning['confidence'],
                "factors": factors[:10],  # Top 10 factors
                "explanation": f"{reasoning['signal_label']} signal driven by {len(factors)} features"
            }

            logger.info(f"Retrieved reasoning for {ticker}: {len(factors)} factors")
            return result

        except Exception as e:
            logger.error(f"Error getting signal reasoning for {ticker}: {e}")
            raise

    def _parse_feature_contributions(
        self,
        feature_contributions: Optional[Dict[str, Any]],
        shap_values: Optional[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Parse and sort feature contributions from SHAP values.

        Args:
            feature_contributions: Feature contribution dictionary (preferred)
            shap_values: Raw SHAP values dictionary (fallback)

        Returns:
            List of factor dictionaries sorted by absolute contribution

        Example:
            >>> factors = service._parse_feature_contributions(
            ...     {"momentum": 0.45, "rsi": -0.15},
            ...     None
            ... )
            >>> print(factors[0])
            {'feature': 'momentum', 'contribution': 0.45, 'direction': 'positive'}
        """
        factors = []

        # Try feature_contributions first
        if feature_contributions and isinstance(feature_contributions, dict):
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

        # Fall back to shap_values if available
        elif shap_values and isinstance(shap_values, dict):
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

        return factors

    async def persist_model_run(
        self,
        signals: List[Dict[str, Any]],
        model: str,
        as_of: str,
        model_version: Optional[str] = None,
        run_id: Optional[str] = None,
        metrics: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Persist ML signals and optionally register the model run.

        This method:
        1. Persists signals to the database
        2. Optionally registers the model run in the registry
        3. Publishes a SIGNAL_GENERATED event

        Args:
            signals: List of signal dictionaries to persist
            model: Model name/identifier
            as_of: Date string in YYYY-MM-DD format
            model_version: Optional model version for registry
            run_id: Optional unique run identifier
            metrics: Optional model performance metrics

        Returns:
            Dictionary with status and row count

        Example:
            >>> service = SignalService()
            >>> signals = [{"symbol": "BHP.AX", "rank": 1, "score": 0.95}]
            >>> result = await service.persist_model_run(
            ...     signals, "model_a_ml", "2024-01-15", model_version="v1.2"
            ... )
            >>> print(result['rows'])
            1
        """
        self._log_operation(
            "Persisting model run",
            {"model": model, "as_of": as_of, "signal_count": len(signals)}
        )

        try:
            # Persist signals
            row_count = self.repo.persist_signals(
                signals=signals,
                model=model,
                as_of=as_of
            )

            # Register model run if version provided
            registry_id = None
            if model_version:
                registry_id = self.repo.register_model_run(
                    model_name=model,
                    version=model_version,
                    run_id=run_id,
                    metrics=metrics
                )

            # Publish event
            await self.publish_event(
                EventType.SIGNAL_GENERATED,
                {
                    "model": model,
                    "as_of": as_of,
                    "signal_count": row_count,
                    "model_version": model_version,
                    "registry_id": registry_id,
                }
            )

            logger.info(
                f"Persisted model run: {row_count} signals, model={model}, "
                f"version={model_version}, registry_id={registry_id}"
            )

            return {
                "status": "ok",
                "rows": row_count,
                "registry_id": registry_id
            }

        except Exception as e:
            logger.error(f"Error persisting model run: {e}")
            raise

    async def register_model_run(
        self,
        model_name: str,
        version: Optional[str] = None,
        run_id: Optional[str] = None,
        metrics: Optional[Dict[str, Any]] = None,
        features: Optional[List[str]] = None,
        artifacts: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Register a model run in the registry.

        Args:
            model_name: Name of the model
            version: Model version string
            run_id: Unique run identifier
            metrics: Model performance metrics
            features: List of features used
            artifacts: Model artifacts metadata

        Returns:
            Dictionary with status and registry ID

        Example:
            >>> service = SignalService()
            >>> result = await service.register_model_run(
            ...     model_name="model_a_ml",
            ...     version="v1.2.0",
            ...     metrics={"roc_auc_mean": 0.85}
            ... )
            >>> print(result['id'])
            123
        """
        self._log_operation(
            "Registering model run",
            {"model_name": model_name, "version": version}
        )

        try:
            registry_id = self.repo.register_model_run(
                model_name=model_name,
                version=version,
                run_id=run_id,
                metrics=metrics,
                features=features,
                artifacts=artifacts
            )

            # Publish event for model registry update
            await self.publish_event(
                EventType.JOB_COMPLETED,
                {
                    "job_type": "model_registration",
                    "model_name": model_name,
                    "version": version,
                    "registry_id": registry_id,
                    "metrics": metrics or {}
                }
            )

            return {"status": "ok", "id": registry_id}

        except Exception as e:
            logger.error(f"Error registering model run: {e}")
            raise

    async def persist_drift_audit(
        self,
        model: str,
        baseline_label: str,
        current_label: str,
        metrics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Persist drift audit metrics and publish drift detection event.

        Args:
            model: Model name/identifier
            baseline_label: Label for baseline dataset
            current_label: Label for current dataset
            metrics: Drift metrics dictionary

        Returns:
            Dictionary with status and audit ID

        Example:
            >>> service = SignalService()
            >>> result = await service.persist_drift_audit(
            ...     model="model_a_ml",
            ...     baseline_label="2024-01-01",
            ...     current_label="2024-02-01",
            ...     metrics={"psi_mean": 0.05}
            ... )
            >>> print(result['id'])
            456
        """
        self._log_operation(
            "Persisting drift audit",
            {"model": model, "baseline": baseline_label, "current": current_label}
        )

        try:
            audit_id = self.repo.persist_drift_audit(
                model=model,
                baseline_label=baseline_label,
                current_label=current_label,
                metrics=metrics
            )

            # Check if significant drift detected (PSI > 0.1 is typically concerning)
            psi_mean = metrics.get("psi_mean", 0)
            psi_max = metrics.get("psi_max", 0)

            if psi_mean > 0.1 or psi_max > 0.25:
                await self.publish_event(
                    EventType.MODEL_DRIFT_DETECTED,
                    {
                        "model": model,
                        "baseline_label": baseline_label,
                        "current_label": current_label,
                        "psi_mean": psi_mean,
                        "psi_max": psi_max,
                        "audit_id": audit_id,
                        "severity": "high" if psi_max > 0.25 else "medium"
                    }
                )

            return {"status": "ok", "id": audit_id}

        except Exception as e:
            logger.error(f"Error persisting drift audit: {e}")
            raise

    async def get_drift_summary(
        self,
        model: Optional[str] = None,
        limit: int = 10
    ) -> Dict[str, Any]:
        """
        Get drift audit summary records.

        Args:
            model: Optional model name to filter by
            limit: Maximum number of records to return (default: 10)

        Returns:
            Dictionary with status, count, and list of drift audit records

        Example:
            >>> service = SignalService()
            >>> result = await service.get_drift_summary(model="model_a_ml")
            >>> print(result['count'])
            5
        """
        self._log_operation(
            "Retrieving drift summary",
            {"model": model, "limit": limit}
        )

        try:
            rows = self.repo.get_drift_summary(model=model, limit=limit)

            return {
                "status": "ok",
                "count": len(rows),
                "rows": rows
            }

        except Exception as e:
            logger.error(f"Error retrieving drift summary: {e}")
            raise

    async def get_model_status(self, model: str = "model_a_ml") -> Dict[str, Any]:
        """
        Get comprehensive model status including registry, signals, and drift.

        Args:
            model: Model name/identifier (default: "model_a_ml")

        Returns:
            Dictionary with status and model status details

        Example:
            >>> service = SignalService()
            >>> result = await service.get_model_status("model_a_ml")
            >>> print(result['registry']['version'])
            'v1.2.0'
        """
        self._log_operation(
            "Retrieving model status",
            {"model": model}
        )

        try:
            status = self.repo.get_model_status(model=model)

            return {
                "status": "ok",
                **status
            }

        except Exception as e:
            logger.error(f"Error retrieving model status: {e}")
            raise

    async def get_accuracy_metrics(
        self,
        ticker: str,
        limit: int = 50
    ) -> Dict[str, Any]:
        """
        Get historical signal accuracy metrics for a ticker.

        Args:
            ticker: Stock ticker symbol (e.g., "BHP.AX")
            limit: Number of historical signals to analyze (default: 50)

        Returns:
            Dictionary with accuracy statistics by signal type

        Example:
            >>> service = SignalService()
            >>> result = await service.get_accuracy_metrics("BHP.AX")
            >>> print(result['overall_accuracy'])
            0.68
        """
        self._log_operation(
            "Calculating accuracy metrics",
            {"ticker": ticker, "limit": limit}
        )

        try:
            metrics = self.repo.get_accuracy_metrics(ticker=ticker, limit=limit)

            return {
                "status": "ok",
                **metrics
            }

        except Exception as e:
            logger.error(f"Error calculating accuracy metrics: {e}")
            raise
