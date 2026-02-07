"""
ModelBPlugin: Fundamentals-based grading model plugin.

This plugin wraps Model B (fundamentals-based quality grading model) and implements
the ModelPlugin interface for use in the ensemble system.

Model B uses:
- A classifier (loaded via joblib) for quality grade classification
- Fundamental financial ratios: PE, PB, ROE, debt-to-equity, profit margin, etc.
- Derived features: PE inverse, financial health score, value composite, quality score

The plugin extracts the core feature engineering and inference logic from the
legacy Model B job (jobs/generate_signals_model_b.py) into a reusable, testable component.
"""

import json
import os
from datetime import date
from typing import Any, Dict, List, Optional

import joblib
import numpy as np
import pandas as pd

from app.core import db, logger, PROJECT_ROOT
from app.features.models.plugins.base import (
    ModelConfig,
    ModelOutput,
    ModelPlugin,
    SignalType,
)


class ModelBPlugin(ModelPlugin):
    """
    Model B Plugin: Fundamentals-based quality grading model.

    This plugin implements a fundamentals-based trading model that grades
    stocks by financial quality (A through F) and converts those grades
    into trading signals with confidence scores.

    Features:
    - Financial ratios (PE, PB, ROE, debt-to-equity, etc.)
    - Derived metrics (PE inverse, financial health score, value composite)
    - Quality grading (A-F quintile classification)
    - Coverage-based filtering (requires >= 80% feature availability)

    Models:
    - Classifier: Predicts probability of high quality (used for grading)

    Attributes:
        _config: Model configuration with id, version, weight
        _classifier: Loaded classifier model (joblib)
        _feature_names: List of feature names expected by the classifier
    """

    def __init__(
        self,
        model_id: str = "model_b",
        version: str = "v1.0",
        weight: float = 0.4,
        enabled: bool = True,
    ):
        """
        Initialize ModelB plugin with configuration and load trained model.

        Args:
            model_id: Unique identifier for this model (default: "model_b")
            version: Model version string (default: "v1.0")
            weight: Weight in ensemble (default: 0.4 for 40%)
            enabled: Whether model is active (default: True)

        Raises:
            FileNotFoundError: If model or features files cannot be found
            Exception: If model loading fails
        """
        self._config = ModelConfig(
            model_id=model_id,
            version=version,
            weight_in_ensemble=weight,
            enabled=enabled,
            requires_features=[
                "pe_ratio",
                "pb_ratio",
                "roe",
                "debt_to_equity",
                "profit_margin",
                "revenue_growth_yoy",
                "current_ratio",
                "quick_ratio",
                "eps_growth",
                "market_cap",
                "div_yield",
            ],
            display_name="Model B: Fundamentals & Quality Grading",
        )

        self._classifier = None
        self._feature_names: List[str] = []

        self._load_model()

    @property
    def config(self) -> ModelConfig:
        """Return model configuration."""
        return self._config

    def _load_model(self) -> None:
        """
        Load trained Model B classifier and feature list from disk.

        Loads:
        - Classifier from models/model_b_v1_0_classifier.pkl (via joblib)
        - Feature names from models/model_b_v1_0_features.json

        Sets:
            self._classifier: Loaded classifier model
            self._feature_names: List of feature names from JSON

        Raises:
            FileNotFoundError: If model or features file not found
            Exception: If loading fails
        """
        models_dir = os.path.join(PROJECT_ROOT, "models")
        version_tag = self._config.version.replace(".", "_")

        clf_path = os.path.join(models_dir, f"model_b_{version_tag}_classifier.pkl")
        features_path = os.path.join(models_dir, f"model_b_{version_tag}_features.json")

        if not os.path.exists(clf_path):
            raise FileNotFoundError(
                f"Model B classifier not found at {clf_path}. "
                "Run the training script to train the model."
            )

        if not os.path.exists(features_path):
            raise FileNotFoundError(
                f"Model B features not found at {features_path}. "
                "Run the training script to generate the features file."
            )

        try:
            self._classifier = joblib.load(clf_path)

            with open(features_path, "r") as f:
                features_config = json.load(f)
                self._feature_names = features_config["features"]

            logger.info(
                f"Loaded ModelB {self._config.version}: "
                f"classifier from {clf_path}, "
                f"{len(self._feature_names)} features"
            )

        except Exception as e:
            logger.error(f"Failed to load ModelB model: {e}")
            raise

    def _fetch_fundamentals(self, symbols: List[str]) -> pd.DataFrame:
        """
        Fetch latest fundamental data for given symbols from the database.

        Queries the fundamentals table for the most recent data within the
        last 30 days for each symbol.

        Args:
            symbols: List of ticker symbols to fetch

        Returns:
            DataFrame with fundamental data, one row per symbol
        """
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
                industry
            FROM fundamentals
            WHERE updated_at >= NOW() - INTERVAL '30 days'
            AND symbol = ANY(%s)
            ORDER BY symbol, updated_at DESC
        """

        try:
            conn = db()
            try:
                df = pd.read_sql(query, conn, params=(symbols,))
            finally:
                from app.core import return_conn
                return_conn(conn)

            logger.info(f"ModelB: Loaded fundamentals for {len(df)} symbols")
            return df

        except Exception as e:
            logger.error(f"ModelB: Failed to fetch fundamentals: {e}")
            return pd.DataFrame()

    def compute_derived_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Compute derived fundamental features from raw data.

        Derived features include:
        - pe_inverse: 1 / PE ratio (earnings yield proxy)
        - pe_ratio_zscore / pb_ratio_zscore: Cross-sectional z-scores
        - financial_health_score: Composite of normalized ROE, current ratio,
          and inverted debt-to-equity
        - value_score: Composite rank-percentile of PE inverse, PB inverse, ROE
        - quality_score_v2: Composite rank-percentile of ROE, margin, growth

        Args:
            df: DataFrame with raw fundamental columns

        Returns:
            DataFrame with additional derived feature columns
        """
        # PE inverse (earnings yield proxy)
        df["pe_inverse"] = 1 / df["pe_ratio"].replace(0, np.nan)

        # Cross-sectional z-scores
        if "pe_ratio" in df.columns:
            std = df["pe_ratio"].std()
            if std and std > 0:
                df["pe_ratio_zscore"] = (
                    (df["pe_ratio"] - df["pe_ratio"].mean()) / std
                )
        if "pb_ratio" in df.columns:
            std = df["pb_ratio"].std()
            if std and std > 0:
                df["pb_ratio_zscore"] = (
                    (df["pb_ratio"] - df["pb_ratio"].mean()) / std
                )

        # Financial health score
        if all(c in df.columns for c in ["roe", "current_ratio", "debt_to_equity"]):
            roe_std = df["roe"].std()
            cr_std = df["current_ratio"].std()
            de_std = df["debt_to_equity"].std()

            roe_norm = (
                (df["roe"] - df["roe"].mean()) / roe_std if roe_std and roe_std > 0
                else pd.Series(0, index=df.index)
            )
            current_norm = (
                (df["current_ratio"] - df["current_ratio"].mean()) / cr_std
                if cr_std and cr_std > 0
                else pd.Series(0, index=df.index)
            )
            # Inverted: lower debt is better
            debt_norm = (
                (df["debt_to_equity"].mean() - df["debt_to_equity"]) / de_std
                if de_std and de_std > 0
                else pd.Series(0, index=df.index)
            )
            df["financial_health_score"] = (
                roe_norm.fillna(0) + current_norm.fillna(0) + debt_norm.fillna(0)
            ) / 3

        # Value score (rank-based composite)
        if all(c in df.columns for c in ["pe_inverse", "pb_ratio", "roe"]):
            pe_inv_rank = df["pe_inverse"].rank(pct=True)
            pb_inv_rank = 1 - df["pb_ratio"].rank(pct=True)
            roe_rank = df["roe"].rank(pct=True)
            df["value_score"] = (pe_inv_rank + pb_inv_rank + roe_rank) / 3

        # Quality score v2 (rank-based composite)
        if all(c in df.columns for c in ["roe", "profit_margin", "revenue_growth_yoy"]):
            roe_rank = df["roe"].rank(pct=True)
            margin_rank = df["profit_margin"].rank(pct=True)
            growth_rank = df["revenue_growth_yoy"].rank(pct=True)
            df["quality_score_v2"] = (roe_rank + margin_rank + growth_rank) / 3

        # Additional ratio aliases used by some feature sets
        df["roe_ratio"] = df["roe"]
        df["debt_to_equity_ratio"] = df["debt_to_equity"]

        return df

    def classify_signal(
        self, quality_score: str, prob: float
    ) -> SignalType:
        """
        Convert quality grade and probability into a trading signal.

        Classification rules (matching job script logic):
        - STRONG_BUY: quality A AND prob >= 0.8
        - BUY: quality A/B AND prob >= 0.6
        - STRONG_SELL: quality F AND prob <= 0.3
        - SELL: quality D/F OR prob <= 0.4
        - HOLD: all other cases

        Args:
            quality_score: Letter grade A-F from quintile classification
            prob: Probability of high quality from classifier [0, 1]

        Returns:
            SignalType string
        """
        if quality_score == "A" and prob >= 0.8:
            return "STRONG_BUY"
        elif quality_score in ("A", "B") and prob >= 0.6:
            return "BUY"
        elif quality_score == "F" and prob <= 0.3:
            return "STRONG_SELL"
        elif quality_score in ("D", "F") or prob <= 0.4:
            return "SELL"
        else:
            return "HOLD"

    async def generate_signals(
        self, symbols: List[str], as_of: date
    ) -> List[ModelOutput]:
        """
        Generate signals for a list of symbols as of a specific date.

        Pipeline:
        1. Fetch latest fundamentals from database
        2. Compute derived features
        3. Filter symbols with insufficient data coverage (< 80%)
        4. Run classifier inference
        5. Assign quality grades (A-F quintiles)
        6. Convert to standardized ModelOutput signals

        Args:
            symbols: List of ticker symbols (e.g., ["BHP.AX", "CBA.AX"])
            as_of: Date for signal generation

        Returns:
            List of ModelOutput objects with signals, confidence, and metadata
        """
        logger.info(
            f"ModelB: Generating signals for {len(symbols)} symbols as of {as_of}"
        )

        # Fetch fundamentals
        df = self._fetch_fundamentals(symbols)

        if df.empty:
            logger.warning(f"ModelB: No fundamental data found for {as_of}")
            return []

        # Compute derived features
        df = self.compute_derived_features(df)

        # Filter by feature coverage (>= 80%)
        required_coverage = 0.8
        available_features = [f for f in self._feature_names if f in df.columns]

        if not available_features:
            logger.warning("ModelB: No matching features found in data")
            return []

        df["coverage"] = (
            df[available_features].notna().sum(axis=1) / len(self._feature_names)
        )
        df_valid = df[df["coverage"] >= required_coverage].copy()

        logger.info(
            f"ModelB: {len(df_valid)} symbols with >= {required_coverage:.0%} "
            f"feature coverage (of {len(df)} total)"
        )

        if df_valid.empty:
            logger.warning("ModelB: No stocks with sufficient fundamental data")
            return []

        # Drop rows with NaN in required features and prepare feature matrix
        df_valid = df_valid.dropna(subset=available_features)

        if df_valid.empty:
            logger.warning("ModelB: No stocks after dropping NaN features")
            return []

        # Prepare feature matrix
        X = df_valid[available_features].copy()
        X = X.replace([np.inf, -np.inf], np.nan)
        X = X.fillna(0.0)

        # Run inference
        try:
            prob_high_quality = self._classifier.predict_proba(X)[:, 1]
        except Exception as e:
            logger.error(f"ModelB: Inference failed: {e}")
            return []

        # Assign quality grades (A-F quintiles)
        try:
            quality_grades = pd.qcut(
                prob_high_quality,
                q=5,
                labels=["F", "D", "C", "B", "A"],
                duplicates="drop",
            )
        except ValueError:
            # If too few unique values for 5 bins, fall back to 3
            try:
                quality_grades = pd.qcut(
                    prob_high_quality,
                    q=3,
                    labels=["F", "C", "A"],
                    duplicates="drop",
                )
            except ValueError:
                quality_grades = pd.Series(
                    ["C"] * len(prob_high_quality), index=df_valid.index
                )

        # Build signals
        df_valid = df_valid.copy()
        df_valid["prob_high_quality"] = prob_high_quality
        df_valid["quality_grade"] = quality_grades.values
        df_valid["ml_expected_return"] = (prob_high_quality - 0.5) * 0.2
        df_valid["rank"] = (
            pd.Series(prob_high_quality).rank(ascending=False).astype(int).values
        )

        # Convert to ModelOutput
        signals = []
        for _, row in df_valid.iterrows():
            signal_type = self.classify_signal(
                quality_score=str(row["quality_grade"]),
                prob=float(row["prob_high_quality"]),
            )

            output = ModelOutput(
                symbol=row["symbol"],
                signal=signal_type,
                confidence=float(row["prob_high_quality"]),
                expected_return=float(row["ml_expected_return"]),
                rank=int(row["rank"]),
                generated_at=as_of.isoformat(),
                metadata={
                    "model_id": self._config.model_id,
                    "version": self._config.version,
                    "quality_grade": str(row["quality_grade"]),
                    "score": float(row["prob_high_quality"]),
                    "pe_ratio": (
                        float(row["pe_ratio"]) if pd.notna(row.get("pe_ratio")) else None
                    ),
                    "roe": (
                        float(row["roe"]) if pd.notna(row.get("roe")) else None
                    ),
                },
            )
            signals.append(output)

        logger.info(f"ModelB: Generated {len(signals)} signals")
        return signals

    async def get_signal(
        self, symbol: str, as_of: Optional[date] = None
    ) -> Optional[ModelOutput]:
        """
        Get signal for a single symbol, with database fallback.

        Strategy:
        1. Check database for cached signal from this date
        2. If not found, generate fresh signal

        Args:
            symbol: Ticker symbol (e.g., "BHP.AX")
            as_of: Target date (defaults to today)

        Returns:
            ModelOutput if signal exists/can be generated, else None
        """
        if as_of is None:
            as_of = date.today()

        # Try database first
        signal = self._get_signal_from_db(symbol, as_of)
        if signal:
            return signal

        # Generate fresh signal
        signals = await self.generate_signals([symbol], as_of)
        return signals[0] if signals else None

    def _get_signal_from_db(
        self, symbol: str, as_of: date
    ) -> Optional[ModelOutput]:
        """
        Retrieve cached signal from model_b_ml_signals table.

        Args:
            symbol: Ticker symbol
            as_of: Signal date

        Returns:
            ModelOutput if found in database, else None
        """
        query = """
            SELECT symbol, ml_prob, ml_expected_return, rank, score, quality_score
            FROM model_b_ml_signals
            WHERE symbol = %s AND as_of = %s AND model = %s
            LIMIT 1
        """

        try:
            conn = db()
            try:
                result = pd.read_sql(
                    query,
                    conn,
                    params=(symbol, as_of, f"{self._config.model_id}_{self._config.version.replace('.', '_')}"),
                )
            finally:
                from app.core import return_conn
                return_conn(conn)

            if result.empty:
                return None

            row = result.iloc[0]

            signal_type = self.classify_signal(
                quality_score=str(row["quality_score"]),
                prob=float(row["ml_prob"]),
            )

            return ModelOutput(
                symbol=row["symbol"],
                signal=signal_type,
                confidence=float(row["ml_prob"]),
                expected_return=(
                    float(row["ml_expected_return"])
                    if pd.notna(row["ml_expected_return"])
                    else None
                ),
                rank=int(row["rank"]) if pd.notna(row["rank"]) else None,
                generated_at=as_of.isoformat(),
                metadata={
                    "model_id": self._config.model_id,
                    "version": self._config.version,
                    "quality_grade": str(row["quality_score"]),
                    "score": (
                        float(row["score"]) if pd.notna(row["score"]) else None
                    ),
                    "source": "database",
                },
            )

        except Exception as e:
            logger.error(f"ModelB: Failed to retrieve signal from DB: {e}")
            return None

    def explain(self, symbol: str) -> Dict[str, Any]:
        """
        Get feature importance explanation for a symbol's signal.

        Returns model-level feature importance from the classifier.

        Args:
            symbol: Ticker symbol to explain

        Returns:
            Dictionary with symbol, model info, explanation type, and
            sorted list of feature importance dicts
        """
        if self._classifier is None:
            return {
                "symbol": symbol,
                "model": self._config.model_id,
                "error": "Model not loaded",
            }

        importance = self._classifier.feature_importances_
        features = [
            {"name": name, "importance": float(imp)}
            for name, imp in zip(self._feature_names, importance)
        ]

        # Sort by importance descending
        features = sorted(features, key=lambda x: x["importance"], reverse=True)

        return {
            "symbol": symbol,
            "model": self._config.model_id,
            "version": self._config.version,
            "explanation_type": "feature_importance",
            "features": features,
            "source": "model",
            "note": "Model-level feature importance (not symbol-specific)",
        }
