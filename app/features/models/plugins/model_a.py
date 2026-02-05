"""
ModelAPlugin: Momentum-based LightGBM model plugin.

This plugin wraps Model A (momentum-based technical analysis model) and implements
the ModelPlugin interface for use in the ensemble system.

Model A uses:
- LightGBM classifier for signal classification
- LightGBM regressor for expected return prediction
- Technical indicators: momentum (12-1, 6M, 3M), volatility, volume, trend
- SHAP values for explainability

The plugin extracts the core feature engineering and inference logic from the
legacy Model A job (run_model_a_job.py) into a reusable, testable component.
"""

import os
from datetime import date, timedelta
from typing import Any, Dict, List, Optional
import pickle

import numpy as np
import pandas as pd
import lightgbm as lgb

from app.core import db, logger, PROJECT_ROOT
from app.features.models.plugins.base import (
    ModelConfig,
    ModelOutput,
    ModelPlugin,
    SignalType,
)


class ModelAPlugin(ModelPlugin):
    """
    Model A Plugin: Momentum-based technical analysis model.

    This plugin implements a momentum-based trading model using LightGBM
    for classification and regression. It analyzes technical indicators
    to generate buy/sell/hold signals with confidence scores.

    Features:
    - Momentum indicators (12-1, 6M, 3M month returns)
    - Volatility metrics (30d, 90d standard deviation)
    - Trend indicators (200-day SMA, slope analysis)
    - Volume analysis (ADV ratios, liquidity filters)

    Models:
    - Classifier: Predicts probability of positive return
    - Regressor: Estimates expected return magnitude

    Attributes:
        _config: Model configuration with id, version, weight
        _classifier: LightGBM classifier model
        _regressor: LightGBM regressor model
        _features: List of required feature names for inference
    """

    def __init__(
        self,
        model_id: str = "model_a",
        version: str = "v1.1",
        weight: float = 0.6,
        enabled: bool = True,
    ):
        """
        Initialize ModelA plugin with configuration and load trained models.

        Args:
            model_id: Unique identifier for this model (default: "model_a")
            version: Model version string (default: "v1.1")
            weight: Weight in ensemble (default: 0.6 for 60%)
            enabled: Whether model is active (default: True)

        Raises:
            FileNotFoundError: If model files cannot be loaded
            Exception: If model loading fails
        """
        self._config = ModelConfig(
            model_id=model_id,
            version=version,
            weight_in_ensemble=weight,
            enabled=enabled,
            requires_features=[
                "mom_12_1",
                "mom_6",
                "mom_3",
                "vol_90",
                "vol_30",
                "trend_200",
                "sma200_slope_pos",
                "adv_20_median",
            ],
            display_name="Model A: Momentum & Technical Indicators",
        )

        # Load trained models
        self._classifier: Optional[lgb.LGBMClassifier] = None
        self._regressor: Optional[lgb.LGBMRegressor] = None
        self._features: List[str] = []

        self._load_models()

    @property
    def config(self) -> ModelConfig:
        """Return model configuration."""
        return self._config

    def _load_models(self) -> None:
        """
        Load trained LightGBM models from disk.

        Searches for model files in the following order:
        1. models/model_a_{version}_classifier.pkl
        2. models/model_a_classifier_*.pkl (latest by timestamp)

        Sets:
            self._classifier: Loaded LightGBM classifier
            self._regressor: Loaded LightGBM regressor
            self._features: List of feature names from models

        Raises:
            FileNotFoundError: If no model files found
            Exception: If model loading fails
        """
        models_dir = os.path.join(PROJECT_ROOT, "models")

        # Try version-specific paths first
        clf_path = os.path.join(models_dir, f"model_a_{self._config.version}_classifier.pkl")
        reg_path = os.path.join(models_dir, f"model_a_{self._config.version}_regressor.pkl")

        # Fall back to latest timestamped models
        if not os.path.exists(clf_path):
            import glob
            clf_files = sorted(glob.glob(os.path.join(models_dir, "model_a_classifier_*.pkl")))
            if clf_files:
                clf_path = clf_files[-1]  # Most recent
                logger.info(f"Using latest classifier: {clf_path}")

        if not os.path.exists(reg_path):
            import glob
            reg_files = sorted(glob.glob(os.path.join(models_dir, "model_a_regressor_*.pkl")))
            if reg_files:
                reg_path = reg_files[-1]  # Most recent
                logger.info(f"Using latest regressor: {reg_path}")

        # Load models
        if not os.path.exists(clf_path):
            raise FileNotFoundError(
                f"Classifier model not found at {clf_path}. "
                "Run models/train_model_a_ml.py to train the model."
            )

        if not os.path.exists(reg_path):
            raise FileNotFoundError(
                f"Regressor model not found at {reg_path}. "
                "Run models/train_model_a_ml.py to train the model."
            )

        try:
            with open(clf_path, "rb") as f:
                self._classifier = pickle.load(f)

            with open(reg_path, "rb") as f:
                self._regressor = pickle.load(f)

            # Extract feature names from classifier
            if hasattr(self._classifier, "feature_name_"):
                self._features = self._classifier.feature_name_
            else:
                # Fallback to base features
                self._features = [
                    "mom_12_1", "mom_9", "mom_6", "mom_3",
                    "vol_30", "vol_90", "vol_ratio_30_90",
                    "adv_20_median", "adv_ratio_20_60",
                    "trend_200", "sma200_slope_pos", "trend_strength"
                ]

            logger.info(
                f"Loaded ModelA {self._config.version}: "
                f"classifier from {clf_path}, regressor from {reg_path}"
            )
            logger.debug(f"Model features: {self._features}")

        except Exception as e:
            logger.error(f"Failed to load ModelA models: {e}")
            raise

    async def generate_signals(
        self, symbols: List[str], as_of: date
    ) -> List[ModelOutput]:
        """
        Generate signals for a list of symbols as of a specific date.

        This method performs the complete Model A pipeline:
        1. Load price history from database
        2. Engineer technical features (momentum, volatility, trend)
        3. Apply liquidity and quality filters
        4. Run ML inference (classifier + regressor)
        5. Convert to standardized signals

        Args:
            symbols: List of ticker symbols (e.g., ["BHP.AX", "CBA.AX"])
            as_of: Date for signal generation

        Returns:
            List of ModelOutput objects with signals, confidence, and metadata

        Example:
            >>> plugin = ModelAPlugin()
            >>> signals = await plugin.generate_signals(["BHP.AX"], date(2024, 1, 15))
            >>> signals[0].signal  # "BUY"
            >>> signals[0].confidence  # 0.72
        """
        logger.info(
            f"ModelA: Generating signals for {len(symbols)} symbols as of {as_of}"
        )

        # Load price data and engineer features
        df = await self._load_and_engineer_features(symbols, as_of)

        if df.empty:
            logger.warning(f"ModelA: No data after feature engineering for {as_of}")
            return []

        # Apply filters
        df = self._apply_filters(df)

        if df.empty:
            logger.warning(f"ModelA: No symbols passed filters for {as_of}")
            return []

        # Run ML inference
        signals = self._run_inference(df, as_of)

        logger.info(f"ModelA: Generated {len(signals)} signals")
        return signals

    async def _load_and_engineer_features(
        self, symbols: List[str], as_of: date
    ) -> pd.DataFrame:
        """
        Load price history and engineer technical features.

        Features engineered:
        - Momentum: 12-1, 6M, 3M, 9M returns
        - Volatility: 30d, 90d rolling std deviation
        - Trend: 200-day SMA, slope analysis
        - Volume: ADV 20-day median, ratios

        Args:
            symbols: List of symbols to process
            as_of: Target date for feature calculation

        Returns:
            DataFrame with engineered features, one row per symbol
        """
        # Load 520 days of history for feature calculation
        start_date = as_of - timedelta(days=520)

        query = """
            SELECT dt, symbol, close, volume
            FROM prices
            WHERE dt >= %s AND dt <= %s
            AND symbol = ANY(%s)
            ORDER BY symbol, dt
        """

        with db() as con:
            df = pd.read_sql(
                query,
                con,
                params=(start_date, as_of, symbols),
            )

        if df.empty:
            logger.warning(f"No price data found for symbols from {start_date} to {as_of}")
            return pd.DataFrame()

        df["dt"] = pd.to_datetime(df["dt"])
        df = df.sort_values(["symbol", "dt"])

        # Calculate returns
        df["ret1"] = df.groupby("symbol")["close"].pct_change()

        # Momentum features
        df["mom_12_1"] = (
            df.groupby("symbol")["close"].shift(21) /
            df.groupby("symbol")["close"].shift(252) - 1.0
        )
        df["mom_6"] = df.groupby("symbol")["close"].pct_change(126)
        df["mom_3"] = df.groupby("symbol")["close"].pct_change(63)
        df["mom_9"] = df.groupby("symbol")["close"].pct_change(189)

        # Volatility features
        df["vol_90"] = (
            df.groupby("symbol")["ret1"]
            .rolling(90)
            .std()
            .reset_index(level=0, drop=True)
        )
        df["vol_30"] = (
            df.groupby("symbol")["ret1"]
            .rolling(30)
            .std()
            .reset_index(level=0, drop=True)
        )
        df["vol_ratio_30_90"] = df["vol_30"] / (df["vol_90"] + 1e-12)

        # Volume/liquidity features
        df["adv_20_median"] = (
            (df["close"] * df["volume"])
            .groupby(df["symbol"])
            .rolling(20)
            .median()
            .reset_index(level=0, drop=True)
        )

        adv_60 = (
            df.groupby("symbol")["adv_20_median"]
            .rolling(60)
            .median()
            .reset_index(level=0, drop=True)
        )
        df["adv_ratio_20_60"] = df["adv_20_median"] / (adv_60 + 1e-12)

        # Trend features
        sma200 = (
            df.groupby("symbol")["close"]
            .rolling(200)
            .mean()
            .reset_index(level=0, drop=True)
        )
        sma200_lag = sma200.groupby(df["symbol"]).shift(20)

        df["trend_200"] = (df["close"] > sma200).astype(int)
        df["sma200_slope_pos"] = (sma200 > sma200_lag).astype(int)
        df["sma200_slope"] = (sma200 - sma200_lag) / (sma200_lag + 1e-12)
        df["trend_strength"] = np.where(
            df["trend_200"],
            1,
            -1
        ) * np.log1p(np.abs(df["sma200_slope"]))

        # Get latest snapshot
        latest = df.groupby("symbol").tail(1).copy()
        latest = latest[latest["dt"].dt.date == as_of]

        return latest

    def _apply_filters(
        self,
        df: pd.DataFrame,
        adv_floor: float = 5_000_000.0,
        min_price: float = 1.0,
    ) -> pd.DataFrame:
        """
        Apply liquidity and quality filters to symbols.

        Filters:
        1. All required features must be non-null
        2. ADV (average dollar volume) >= floor
        3. Price >= minimum price
        4. Trend quality: above 200-day SMA with positive slope

        Args:
            df: DataFrame with engineered features
            adv_floor: Minimum average dollar volume (default: $5M)
            min_price: Minimum share price (default: $1.00)

        Returns:
            Filtered DataFrame
        """
        required_cols = [
            "mom_6", "mom_12_1", "vol_90", "adv_20_median",
            "close", "trend_200", "sma200_slope_pos"
        ]

        # Filter: non-null features
        mask_notna = df[required_cols].notna().all(axis=1)

        # Filter: liquidity
        mask_adv = df["adv_20_median"] >= adv_floor

        # Filter: price
        mask_price = df["close"] >= min_price

        # Filter: trend quality (both above 200 SMA AND positive slope)
        mask_trend = (df["trend_200"] == 1) & (df["sma200_slope_pos"] == 1)

        filtered = df[mask_notna & mask_adv & mask_price & mask_trend].copy()

        logger.debug(
            f"ModelA filters: {len(df)} -> {len(filtered)} symbols "
            f"(notna={mask_notna.sum()}, adv={mask_adv.sum()}, "
            f"price={mask_price.sum()}, trend={mask_trend.sum()})"
        )

        return filtered

    def _run_inference(
        self, df: pd.DataFrame, as_of: date
    ) -> List[ModelOutput]:
        """
        Run ML inference and convert to ModelOutput signals.

        Steps:
        1. Prepare feature matrix (handle missing optional features)
        2. Run classifier to get confidence (probability of positive return)
        3. Run regressor to get expected return
        4. Classify signals based on confidence + expected return
        5. Rank by composite score

        Signal classification:
        - STRONG_BUY: confidence >= 0.65 AND exp_return > 0.05
        - BUY: confidence >= 0.55 AND exp_return > 0
        - STRONG_SELL: confidence <= 0.35 OR exp_return < -0.05
        - SELL: confidence <= 0.45 OR exp_return < 0
        - HOLD: otherwise

        Args:
            df: DataFrame with engineered features
            as_of: Date of signal generation

        Returns:
            List of ModelOutput objects sorted by rank
        """
        if self._classifier is None or self._regressor is None:
            raise RuntimeError("Models not loaded. Call _load_models() first.")

        # Prepare feature matrix
        X = pd.DataFrame()
        for feat in self._features:
            if feat in df.columns:
                X[feat] = df[feat]
            else:
                # Fill missing features with neutral values
                logger.warning(f"Feature {feat} not found, filling with 0")
                X[feat] = 0.0

        # Replace inf/-inf with NaN, then fill
        X = X.replace([np.inf, -np.inf], np.nan)
        X = X.fillna(0.0)

        # Run inference
        try:
            probs = self._classifier.predict_proba(X)[:, 1]  # P(positive return)
            exp_returns = self._regressor.predict(X)
        except Exception as e:
            logger.error(f"Inference failed: {e}")
            return []

        # Add predictions to dataframe
        df = df.copy()
        df["ml_prob"] = probs
        df["ml_expected_return"] = exp_returns

        # Calculate composite score for ranking
        # Weight momentum 75%, expected ML return 25%
        df["score"] = 0.75 * df["mom_12_1"] + 0.25 * df["ml_expected_return"]

        # Rank by score
        df = df.sort_values("score", ascending=False)
        df["rank"] = range(1, len(df) + 1)

        # Convert to ModelOutput
        signals = []
        for _, row in df.iterrows():
            signal = self._classify_signal(
                confidence=row["ml_prob"],
                exp_return=row["ml_expected_return"],
            )

            output = ModelOutput(
                symbol=row["symbol"],
                signal=signal,
                confidence=float(row["ml_prob"]),
                expected_return=float(row["ml_expected_return"]),
                rank=int(row["rank"]),
                generated_at=as_of.isoformat(),
                metadata={
                    "model_id": self._config.model_id,
                    "version": self._config.version,
                    "score": float(row["score"]),
                    "mom_12_1": float(row["mom_12_1"]),
                    "mom_6": float(row["mom_6"]),
                    "vol_90": float(row["vol_90"]),
                    "adv_20_median": float(row["adv_20_median"]),
                    "trend_200": bool(row["trend_200"]),
                },
            )
            signals.append(output)

        return signals

    def _classify_signal(
        self, confidence: float, exp_return: float
    ) -> SignalType:
        """
        Classify signal based on ML confidence and expected return.

        Classification rules:
        - STRONG_BUY: High confidence (>=0.65) AND high expected return (>5%)
        - BUY: Medium confidence (>=0.55) AND positive expected return
        - STRONG_SELL: Low confidence (<=0.35) OR large negative return (<-5%)
        - SELL: Low-medium confidence (<=0.45) OR negative expected return
        - HOLD: All other cases

        Args:
            confidence: ML classifier probability [0, 1]
            exp_return: Expected return from regressor (e.g., 0.05 = 5%)

        Returns:
            SignalType enum value
        """
        if confidence >= 0.65 and exp_return > 0.05:
            return "STRONG_BUY"
        elif confidence >= 0.55 and exp_return > 0:
            return "BUY"
        elif confidence <= 0.35 or exp_return < -0.05:
            return "STRONG_SELL"
        elif confidence <= 0.45 or exp_return < 0:
            return "SELL"
        else:
            return "HOLD"

    async def get_signal(
        self, symbol: str, as_of: Optional[date] = None
    ) -> Optional[ModelOutput]:
        """
        Get signal for a single symbol, with database fallback.

        Strategy:
        1. Check database for cached signal from this date
        2. If not found or as_of is None (use today), generate fresh signal

        Args:
            symbol: Ticker symbol (e.g., "BHP.AX")
            as_of: Target date (defaults to today)

        Returns:
            ModelOutput if signal exists/can be generated, else None

        Example:
            >>> signal = await plugin.get_signal("BHP.AX")
            >>> if signal:
            ...     print(f"{signal.symbol}: {signal.signal} ({signal.confidence:.2f})")
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
        Retrieve cached signal from database.

        Queries model_a_ml_signals table for the symbol/date combination.

        Args:
            symbol: Ticker symbol
            as_of: Signal date

        Returns:
            ModelOutput if found in database, else None
        """
        query = """
            SELECT symbol, ml_prob, ml_expected_return, rank, score
            FROM model_a_ml_signals
            WHERE symbol = %s AND as_of = %s AND model = %s
            LIMIT 1
        """

        try:
            with db() as con:
                result = pd.read_sql(
                    query,
                    con,
                    params=(symbol, as_of, self._config.model_id),
                )

            if result.empty:
                return None

            row = result.iloc[0]

            signal = self._classify_signal(
                confidence=row["ml_prob"],
                exp_return=row["ml_expected_return"],
            )

            return ModelOutput(
                symbol=row["symbol"],
                signal=signal,
                confidence=float(row["ml_prob"]),
                expected_return=float(row["ml_expected_return"]),
                rank=int(row["rank"]) if pd.notna(row["rank"]) else None,
                generated_at=as_of.isoformat(),
                metadata={
                    "model_id": self._config.model_id,
                    "version": self._config.version,
                    "score": float(row["score"]) if pd.notna(row["score"]) else None,
                    "source": "database",
                },
            )

        except Exception as e:
            logger.error(f"Failed to retrieve signal from DB: {e}")
            return None

    def explain(self, symbol: str) -> Dict[str, Any]:
        """
        Get feature importance explanation for a symbol's signal.

        Returns SHAP values or feature importance from the database if available,
        otherwise returns model-level feature importance.

        This method provides transparency into why the model generated a particular
        signal for a stock, showing which features contributed most to the decision.

        Args:
            symbol: Ticker symbol to explain

        Returns:
            Dictionary with:
            - symbol: The stock symbol
            - model: Model identifier
            - explanation_type: Type of explanation (shap/feature_importance)
            - features: List of dicts with feature names and importance scores
            - source: Where the explanation came from

        Example:
            >>> explanation = plugin.explain("BHP.AX")
            >>> for feat in explanation["features"][:5]:
            ...     print(f"{feat['name']}: {feat['importance']:.3f}")
        """
        # Try to get symbol-specific SHAP values from database
        shap_data = self._get_shap_from_db(symbol)
        if shap_data:
            return {
                "symbol": symbol,
                "model": self._config.model_id,
                "version": self._config.version,
                "explanation_type": "shap",
                "features": shap_data,
                "source": "database",
            }

        # Fall back to model-level feature importance
        if self._classifier is None:
            return {
                "symbol": symbol,
                "model": self._config.model_id,
                "error": "Model not loaded",
            }

        importance = self._classifier.feature_importances_
        features = [
            {"name": name, "importance": float(imp)}
            for name, imp in zip(self._features, importance)
        ]

        # Sort by importance
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

    def _get_shap_from_db(self, symbol: str) -> Optional[List[Dict[str, Any]]]:
        """
        Retrieve SHAP values for a symbol from database.

        Note: This is a placeholder for when SHAP values are stored.
        Currently returns None as SHAP persistence is not yet implemented.

        Args:
            symbol: Ticker symbol

        Returns:
            List of feature/value dicts if found, else None
        """
        # TODO: Implement when SHAP values table is created
        # Query would look like:
        # SELECT feature_name, shap_value
        # FROM model_shap_values
        # WHERE symbol = %s AND model = %s
        # ORDER BY abs(shap_value) DESC

        return None
