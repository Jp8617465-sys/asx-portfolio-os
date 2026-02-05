"""
EnsembleService: Weighted aggregation of multiple model signals.

This service coordinates the ensemble system by:
1. Fetching enabled models from the registry
2. Getting dynamic weights from config
3. Generating signals from each model
4. Aggregating signals using weighted voting
5. Detecting and resolving conflicts
6. Publishing SIGNAL_GENERATED events

The ensemble replaces the hardcoded 60/40 weighting from the legacy
generate_ensemble_signals.py job with a configurable, plugin-based system.
"""

from datetime import date
from typing import Dict, List, Optional, Tuple

from app.core import logger
from app.core.service import BaseService
from app.core.events.event_bus import EventType
from app.features.models.plugins.base import ModelOutput, SignalType
from app.features.models.registry import model_registry


class EnsembleService(BaseService):
    """
    Service for generating ensemble signals from multiple models.

    The EnsembleService orchestrates signal generation across multiple model
    plugins, aggregates their outputs using configurable weights, and detects
    conflicts where models disagree.

    Key features:
    - Dynamic model discovery via registry
    - Configurable weights from models.yaml
    - Conflict detection and resolution
    - Event publishing for downstream consumers
    - Support for multiple aggregation strategies

    Attributes:
        registry: ModelRegistry instance for accessing plugins
        min_agreement: Minimum model agreement threshold (default: 0.5)
        min_confidence: Minimum confidence for final signals (default: 0.6)
        conflict_strategy: How to resolve conflicts (default: "weighted_majority")

    Example:
        >>> service = EnsembleService()
        >>> signals = await service.generate_ensemble_signals(
        ...     symbols=["BHP.AX", "CBA.AX"],
        ...     as_of=date(2024, 1, 15)
        ... )
        >>> for s in signals:
        ...     print(f"{s['symbol']}: {s['signal']} (score={s['ensemble_score']:.2f})")
    """

    def __init__(self):
        """
        Initialize EnsembleService with registry and config.

        Loads ensemble configuration from models.yaml including:
        - Conflict resolution strategy
        - Minimum agreement threshold
        - Minimum confidence threshold
        """
        super().__init__()
        self.registry = model_registry

        # Load ensemble config
        ensemble_config = self.registry.get_ensemble_config()

        self.min_agreement = ensemble_config.get("min_agreement", 0.5)
        self.min_confidence = ensemble_config.get("min_confidence", 0.6)
        self.conflict_strategy = ensemble_config.get(
            "conflict_strategy", "weighted_majority"
        )
        self.flag_conflicts = ensemble_config.get("flag_conflicts", True)

        logger.info(
            f"Initialized EnsembleService: "
            f"strategy={self.conflict_strategy}, "
            f"min_agreement={self.min_agreement}, "
            f"min_confidence={self.min_confidence}"
        )

    async def generate_ensemble_signals(
        self,
        symbols: List[str],
        as_of: date,
        persist: bool = True,
    ) -> List[Dict]:
        """
        Generate ensemble signals by aggregating multiple model outputs.

        This is the main entry point for ensemble signal generation. It:
        1. Retrieves enabled models and their weights
        2. Generates signals from each model
        3. Aggregates signals using weighted voting
        4. Detects conflicts and applies resolution strategy
        5. Optionally persists results to database
        6. Publishes SIGNAL_GENERATED event

        Args:
            symbols: List of ticker symbols to analyze
            as_of: Date for signal generation
            persist: Whether to save results to database (default: True)

        Returns:
            List of ensemble signal dictionaries with keys:
            - symbol: Ticker symbol
            - signal: Final ensemble signal (STRONG_BUY, BUY, HOLD, SELL, STRONG_SELL)
            - ensemble_score: Weighted confidence score [0, 1]
            - confidence: Same as ensemble_score
            - model_signals: Dict of individual model signals
            - model_confidences: Dict of individual model confidences
            - conflict: Boolean indicating model disagreement
            - conflict_reason: Description of conflict if present
            - signals_agree: Boolean indicating model agreement
            - rank: Ranking by ensemble score

        Raises:
            ValueError: If no enabled models found
            Exception: If signal generation fails

        Example:
            >>> signals = await service.generate_ensemble_signals(
            ...     symbols=["BHP.AX", "CBA.AX"],
            ...     as_of=date(2024, 1, 15)
            ... )
            >>> len(signals)  # 2
            >>> signals[0]["signal"]  # "BUY"
            >>> signals[0]["ensemble_score"]  # 0.72
            >>> signals[0]["conflict"]  # False
        """
        self._log_operation(
            "Generating ensemble signals",
            {"symbols": len(symbols), "as_of": str(as_of)},
        )

        # Get enabled models and weights
        enabled_models = self.registry.get_enabled()
        if not enabled_models:
            raise ValueError("No enabled models found in registry")

        weights = self.registry.get_ensemble_weights()

        logger.info(
            f"Ensemble: {len(enabled_models)} enabled models: "
            f"{', '.join(f'{m.config.model_id}={weights[m.config.model_id]:.2f}' for m in enabled_models)}"
        )

        # Generate signals from each model
        model_outputs: Dict[str, List[ModelOutput]] = {}

        for model in enabled_models:
            try:
                signals = await model.generate_signals(symbols, as_of)
                model_outputs[model.config.model_id] = signals
                logger.info(
                    f"  {model.config.model_id}: Generated {len(signals)} signals"
                )
            except Exception as e:
                logger.error(
                    f"  {model.config.model_id}: Signal generation failed: {e}"
                )
                # Continue with other models even if one fails
                model_outputs[model.config.model_id] = []

        # Aggregate signals
        ensemble_signals = self._aggregate_signals(model_outputs, weights, as_of)

        logger.info(f"Generated {len(ensemble_signals)} ensemble signals")

        # Log distribution
        signal_counts = {}
        for sig in ensemble_signals:
            signal_counts[sig["signal"]] = signal_counts.get(sig["signal"], 0) + 1

        logger.info(f"Signal distribution: {signal_counts}")

        conflict_count = sum(1 for s in ensemble_signals if s.get("conflict", False))
        logger.info(
            f"Conflicts: {conflict_count} ({conflict_count / len(ensemble_signals) * 100:.1f}%)"
        )

        # Persist to database
        if persist and ensemble_signals:
            try:
                self._persist_signals(ensemble_signals, as_of)
            except Exception as e:
                logger.error(f"Failed to persist ensemble signals: {e}")

        # Publish event
        await self.publish_event(
            EventType.SIGNAL_GENERATED,
            {
                "source": "ensemble",
                "as_of": str(as_of),
                "symbols": symbols,
                "signal_count": len(ensemble_signals),
                "models": list(model_outputs.keys()),
                "conflicts": conflict_count,
            },
        )

        return ensemble_signals

    def _aggregate_signals(
        self,
        model_outputs: Dict[str, List[ModelOutput]],
        weights: Dict[str, float],
        as_of: date,
    ) -> List[Dict]:
        """
        Aggregate signals from multiple models using weighted voting.

        For each symbol present in multiple models:
        1. Calculate weighted ensemble score (sum of confidence * weight)
        2. Collect individual model signals and confidences
        3. Detect conflicts (opposite signals from different models)
        4. Apply conflict resolution strategy
        5. Determine final signal based on ensemble score or majority

        Args:
            model_outputs: Dict mapping model_id to list of ModelOutputs
            weights: Dict mapping model_id to normalized weight
            as_of: Date of signal generation

        Returns:
            List of aggregated signal dictionaries, sorted by ensemble score
        """
        # Build map of symbol -> list of (model_id, ModelOutput) tuples
        symbol_signals: Dict[str, List[Tuple[str, ModelOutput]]] = {}

        for model_id, outputs in model_outputs.items():
            for output in outputs:
                if output.symbol not in symbol_signals:
                    symbol_signals[output.symbol] = []
                symbol_signals[output.symbol].append((model_id, output))

        # Aggregate each symbol
        ensemble_signals = []

        for symbol, model_sigs in symbol_signals.items():
            # Only include symbols with signals from multiple models
            if len(model_sigs) < 2:
                continue

            result = self._aggregate_symbol(symbol, model_sigs, weights, as_of)
            ensemble_signals.append(result)

        # Sort by ensemble score (descending)
        ensemble_signals.sort(key=lambda x: x["ensemble_score"], reverse=True)

        # Add rank
        for i, sig in enumerate(ensemble_signals, 1):
            sig["rank"] = i

        return ensemble_signals

    def _aggregate_symbol(
        self,
        symbol: str,
        model_signals: List[Tuple[str, ModelOutput]],
        weights: Dict[str, float],
        as_of: date,
    ) -> Dict:
        """
        Aggregate signals for a single symbol across models.

        Calculation:
        - ensemble_score = sum(model_confidence * model_weight) for all models
        - conflict = models produce opposite signals (buy vs sell)
        - final_signal = determined by conflict resolution strategy

        Args:
            symbol: Ticker symbol
            model_signals: List of (model_id, ModelOutput) tuples
            weights: Model weights
            as_of: Signal date

        Returns:
            Dictionary with aggregated signal data
        """
        # Extract data
        model_ids = [mid for mid, _ in model_signals]
        outputs = [out for _, out in model_signals]

        # Calculate weighted ensemble score
        ensemble_score = 0.0
        for model_id, output in model_signals:
            weight = weights.get(model_id, 0.0)
            ensemble_score += output.confidence * weight

        # Collect individual signals and confidences
        model_signal_map = {mid: out.signal for mid, out in model_signals}
        model_conf_map = {mid: out.confidence for mid, out in model_signals}
        model_exp_return_map = {
            mid: out.expected_return for mid, out in model_signals
        }

        # Detect conflicts
        buy_signals = {"STRONG_BUY", "BUY"}
        sell_signals = {"STRONG_SELL", "SELL"}

        has_buy = any(sig in buy_signals for sig in model_signal_map.values())
        has_sell = any(sig in sell_signals for sig in model_signal_map.values())

        conflict = has_buy and has_sell
        conflict_reason = None

        if conflict:
            # Create conflict description
            signal_strs = [
                f"{mid}={sig}" for mid, sig in model_signal_map.items()
            ]
            conflict_reason = ", ".join(signal_strs)

        # Check agreement
        unique_signals = set(model_signal_map.values())
        signals_agree = len(unique_signals) == 1

        # Determine final signal
        final_signal = self._resolve_signal(
            model_signal_map,
            weights,
            ensemble_score,
            conflict,
        )

        return {
            "symbol": symbol,
            "signal": final_signal,
            "ensemble_score": ensemble_score,
            "confidence": ensemble_score,
            "model_signals": model_signal_map,
            "model_confidences": model_conf_map,
            "model_expected_returns": model_exp_return_map,
            "conflict": conflict,
            "conflict_reason": conflict_reason,
            "signals_agree": signals_agree,
            "as_of": as_of.isoformat(),
            "models_contributing": model_ids,
        }

    def _resolve_signal(
        self,
        model_signals: Dict[str, SignalType],
        weights: Dict[str, float],
        ensemble_score: float,
        has_conflict: bool,
    ) -> SignalType:
        """
        Resolve final signal using configured strategy.

        Strategies:
        1. weighted_majority: Use weighted voting, default to HOLD on conflict
        2. confidence_based: Use ensemble_score thresholds
        3. conservative: Always HOLD on conflict, otherwise use majority

        Args:
            model_signals: Dict of model_id -> signal
            weights: Model weights
            ensemble_score: Weighted confidence score
            has_conflict: Whether models disagree

        Returns:
            Final SignalType
        """
        if self.conflict_strategy == "conservative" and has_conflict:
            # Conservative: always HOLD on conflict
            return "HOLD"

        if self.conflict_strategy == "confidence_based":
            # Use ensemble score thresholds
            if ensemble_score >= 0.7:
                return "STRONG_BUY"
            elif ensemble_score >= 0.6:
                return "BUY"
            elif ensemble_score <= 0.3:
                return "STRONG_SELL"
            elif ensemble_score <= 0.4:
                return "SELL"
            else:
                return "HOLD"

        # Default: weighted_majority
        # Calculate weighted votes for each signal type
        signal_scores: Dict[SignalType, float] = {}

        for model_id, signal in model_signals.items():
            weight = weights.get(model_id, 0.0)
            signal_scores[signal] = signal_scores.get(signal, 0.0) + weight

        # Get signal with highest weighted vote
        if not signal_scores:
            return "HOLD"

        winning_signal = max(signal_scores.items(), key=lambda x: x[1])[0]

        # On conflict, default to HOLD for safety
        if has_conflict and winning_signal not in {"HOLD"}:
            return "HOLD"

        return winning_signal

    def _persist_signals(self, signals: List[Dict], as_of: date) -> None:
        """
        Persist ensemble signals to database.

        Saves to ensemble_signals table with model breakdown and conflict info.

        Args:
            signals: List of ensemble signal dictionaries
            as_of: Signal date

        Raises:
            Exception: If database operation fails
        """
        from app.core import db
        from psycopg2.extras import execute_values

        if not signals:
            logger.warning("No signals to persist")
            return

        logger.info(f"Persisting {len(signals)} ensemble signals to database...")

        rows = []
        for sig in signals:
            # Extract model-specific data
            model_a_signal = sig.get("model_signals", {}).get("model_a")
            model_b_signal = sig.get("model_signals", {}).get("model_b")
            model_a_conf = sig.get("model_confidences", {}).get("model_a")
            model_b_conf = sig.get("model_confidences", {}).get("model_b")

            rows.append((
                as_of,
                sig["symbol"],
                sig["signal"],
                float(sig["ensemble_score"]),
                float(sig["confidence"]),
                model_a_signal,
                model_b_signal,
                float(model_a_conf) if model_a_conf is not None else None,
                float(model_b_conf) if model_b_conf is not None else None,
                bool(sig.get("conflict", False)),
                sig.get("conflict_reason"),
                bool(sig.get("signals_agree", False)),
                int(sig.get("rank", 0)),
                # Note: model_a_rank and model_b_rank would need to be extracted
                # from the individual ModelOutput objects if needed
                None,  # model_a_rank placeholder
                None,  # model_b_rank placeholder
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

        try:
            with db() as con, con.cursor() as cur:
                execute_values(cur, sql, rows)
                con.commit()

            logger.info(f"✅ Persisted {len(rows)} ensemble signals for {as_of}")

        except Exception as e:
            logger.error(f"Failed to persist ensemble signals: {e}")
            raise

    async def get_ensemble_signal(
        self, symbol: str, as_of: Optional[date] = None
    ) -> Optional[Dict]:
        """
        Get ensemble signal for a single symbol.

        Checks database first, then generates fresh signal if not found.

        Args:
            symbol: Ticker symbol
            as_of: Target date (defaults to today)

        Returns:
            Ensemble signal dictionary if available, else None
        """
        if as_of is None:
            as_of = date.today()

        # Try database first
        signal = self._get_signal_from_db(symbol, as_of)
        if signal:
            return signal

        # Generate fresh
        signals = await self.generate_ensemble_signals([symbol], as_of, persist=False)
        return signals[0] if signals else None

    def _get_signal_from_db(self, symbol: str, as_of: date) -> Optional[Dict]:
        """
        Retrieve ensemble signal from database.

        Args:
            symbol: Ticker symbol
            as_of: Signal date

        Returns:
            Signal dictionary if found, else None
        """
        from app.core import db
        import pandas as pd

        query = """
            SELECT
                symbol, signal, ensemble_score, confidence,
                model_a_signal, model_b_signal,
                model_a_confidence, model_b_confidence,
                conflict, conflict_reason, signals_agree, rank
            FROM ensemble_signals
            WHERE symbol = %s AND as_of = %s
            LIMIT 1
        """

        try:
            with db() as con:
                result = pd.read_sql(query, con, params=(symbol, as_of))

            if result.empty:
                return None

            row = result.iloc[0]

            return {
                "symbol": row["symbol"],
                "signal": row["signal"],
                "ensemble_score": float(row["ensemble_score"]),
                "confidence": float(row["confidence"]),
                "model_signals": {
                    "model_a": row["model_a_signal"],
                    "model_b": row["model_b_signal"],
                },
                "model_confidences": {
                    "model_a": float(row["model_a_confidence"])
                    if pd.notna(row["model_a_confidence"])
                    else None,
                    "model_b": float(row["model_b_confidence"])
                    if pd.notna(row["model_b_confidence"])
                    else None,
                },
                "conflict": bool(row["conflict"]),
                "conflict_reason": row["conflict_reason"],
                "signals_agree": bool(row["signals_agree"]),
                "rank": int(row["rank"]) if pd.notna(row["rank"]) else None,
                "source": "database",
            }

        except Exception as e:
            logger.error(f"Failed to retrieve ensemble signal from DB: {e}")
            return None
