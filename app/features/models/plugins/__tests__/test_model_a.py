"""
app/features/models/plugins/__tests__/test_model_a.py
Comprehensive unit tests for the ModelAPlugin implementation.
"""

import pytest
import numpy as np
import pandas as pd
from datetime import date
from unittest.mock import MagicMock, AsyncMock, patch, mock_open

from app.features.models.plugins.base import ModelConfig, ModelOutput, ModelPlugin


# ---------------------------------------------------------------------------
# Helpers: build a ModelAPlugin with mocked file I/O so __init__ never
# touches the real filesystem or loads real pickle files.
# ---------------------------------------------------------------------------

def _make_mock_classifier(feature_names=None):
    """Return a mock LightGBM classifier."""
    clf = MagicMock()
    if feature_names is not None:
        clf.feature_name_ = feature_names
    clf.predict_proba = MagicMock(
        return_value=np.array([[0.3, 0.7]])
    )
    clf.feature_importances_ = np.array([0.2, 0.15, 0.1, 0.08])
    return clf


def _make_mock_regressor():
    """Return a mock LightGBM regressor."""
    reg = MagicMock()
    reg.predict = MagicMock(return_value=np.array([0.08]))
    return reg


@pytest.fixture
def mock_model_files():
    """Patch os.path.exists and pickle.load so ModelAPlugin.__init__ succeeds."""
    clf = _make_mock_classifier(
        feature_names=["mom_12_1", "mom_6", "mom_3", "vol_90"]
    )
    reg = _make_mock_regressor()

    with patch("app.features.models.plugins.model_a.os.path.exists", return_value=True), \
         patch("builtins.open", mock_open(read_data=b"")), \
         patch("app.features.models.plugins.model_a.pickle.load", side_effect=[clf, reg]), \
         patch("app.features.models.plugins.model_a.logger"):
        yield clf, reg


@pytest.fixture
def plugin(mock_model_files):
    """Return a ModelAPlugin constructed with mocked model files."""
    from app.features.models.plugins.model_a import ModelAPlugin
    return ModelAPlugin()


@pytest.fixture
def mock_db_connection():
    """Provide a mock for the db() context manager used in model_a."""
    mock_conn = MagicMock()
    cm = MagicMock()
    cm.__enter__ = MagicMock(return_value=mock_conn)
    cm.__exit__ = MagicMock(return_value=False)
    return cm, mock_conn


# ===========================================================================
# TestModelAPluginConfig
# ===========================================================================

class TestModelAPluginConfig:
    """Verify the default configuration of ModelAPlugin."""

    def test_model_id_is_model_a(self, plugin):
        assert plugin.config.model_id == "model_a"

    def test_version_matches_default(self, plugin):
        assert plugin.config.version == "v1.1"

    def test_weight_in_ensemble_is_06(self, plugin):
        assert plugin.config.weight_in_ensemble == 0.6

    def test_requires_correct_features(self, plugin):
        expected = [
            "mom_12_1", "mom_6", "mom_3", "vol_90",
            "vol_30", "trend_200", "sma200_slope_pos", "adv_20_median",
        ]
        assert plugin.config.requires_features == expected

    def test_display_name_is_set(self, plugin):
        assert plugin.config.display_name == "Model A: Momentum & Technical Indicators"

    def test_enabled_by_default(self, plugin):
        assert plugin.config.enabled is True

    def test_is_instance_of_model_plugin(self, plugin):
        assert isinstance(plugin, ModelPlugin)

    def test_custom_model_id(self, mock_model_files):
        """Can override model_id at construction."""
        from app.features.models.plugins.model_a import ModelAPlugin

        with patch("app.features.models.plugins.model_a.os.path.exists", return_value=True), \
             patch("builtins.open", mock_open(read_data=b"")), \
             patch("app.features.models.plugins.model_a.pickle.load",
                   side_effect=[_make_mock_classifier(["f1"]), _make_mock_regressor()]), \
             patch("app.features.models.plugins.model_a.logger"):
            p = ModelAPlugin(model_id="custom_a", version="v2.0", weight=0.3)

        assert p.config.model_id == "custom_a"
        assert p.config.version == "v2.0"
        assert p.config.weight_in_ensemble == 0.3


# ===========================================================================
# TestModelAPluginInit
# ===========================================================================

class TestModelAPluginInit:
    """Test ModelAPlugin initialization and model loading."""

    def test_classifier_loaded(self, plugin, mock_model_files):
        clf, _ = mock_model_files
        assert plugin._classifier is clf

    def test_regressor_loaded(self, plugin, mock_model_files):
        _, reg = mock_model_files
        assert plugin._regressor is reg

    def test_features_extracted_from_classifier(self, plugin):
        assert plugin._features == ["mom_12_1", "mom_6", "mom_3", "vol_90"]

    def test_features_fallback_when_no_feature_name_attr(self):
        """When classifier has no feature_name_ attribute, use fallback list."""
        clf = MagicMock(spec=[])  # no feature_name_ attribute
        reg = _make_mock_regressor()

        with patch("app.features.models.plugins.model_a.os.path.exists", return_value=True), \
             patch("builtins.open", mock_open(read_data=b"")), \
             patch("app.features.models.plugins.model_a.pickle.load", side_effect=[clf, reg]), \
             patch("app.features.models.plugins.model_a.logger"):
            from app.features.models.plugins.model_a import ModelAPlugin
            p = ModelAPlugin()

        assert len(p._features) == 12
        assert "mom_12_1" in p._features

    def test_handles_missing_classifier_file(self):
        """FileNotFoundError raised when classifier file is missing."""
        # First call (version-specific) -> False, glob returns empty, second exists check -> False
        with patch("app.features.models.plugins.model_a.os.path.exists", return_value=False), \
             patch("glob.glob", return_value=[]), \
             patch("app.features.models.plugins.model_a.logger"):
            from app.features.models.plugins.model_a import ModelAPlugin
            with pytest.raises(FileNotFoundError, match="Classifier model not found"):
                ModelAPlugin()

    def test_handles_missing_regressor_file(self):
        """FileNotFoundError raised when regressor file is missing."""
        call_count = {"n": 0}

        def exists_side_effect(path):
            call_count["n"] += 1
            # First call: clf version-specific -> True
            # Second call: reg version-specific -> False
            # Third call: clf exists for final check -> True
            # Fourth call: reg exists for final check -> False
            if "classifier" in path:
                return True
            return False

        with patch("app.features.models.plugins.model_a.os.path.exists", side_effect=exists_side_effect), \
             patch("glob.glob", return_value=[]), \
             patch("app.features.models.plugins.model_a.logger"):
            from app.features.models.plugins.model_a import ModelAPlugin
            with pytest.raises(FileNotFoundError, match="Regressor model not found"):
                ModelAPlugin()

    def test_handles_pickle_load_error(self):
        """Exception propagated when pickle.load fails."""
        with patch("app.features.models.plugins.model_a.os.path.exists", return_value=True), \
             patch("builtins.open", mock_open(read_data=b"")), \
             patch("app.features.models.plugins.model_a.pickle.load",
                   side_effect=Exception("corrupt file")), \
             patch("app.features.models.plugins.model_a.logger"):
            from app.features.models.plugins.model_a import ModelAPlugin
            with pytest.raises(Exception, match="corrupt file"):
                ModelAPlugin()


# ===========================================================================
# TestModelAClassifySignal
# ===========================================================================

class TestModelAClassifySignal:
    """Test the _classify_signal method directly."""

    def test_strong_buy(self, plugin):
        assert plugin._classify_signal(confidence=0.70, exp_return=0.10) == "STRONG_BUY"

    def test_strong_buy_at_threshold(self, plugin):
        assert plugin._classify_signal(confidence=0.65, exp_return=0.06) == "STRONG_BUY"

    def test_buy(self, plugin):
        assert plugin._classify_signal(confidence=0.60, exp_return=0.03) == "BUY"

    def test_buy_at_threshold(self, plugin):
        assert plugin._classify_signal(confidence=0.55, exp_return=0.01) == "BUY"

    def test_strong_sell_low_confidence(self, plugin):
        assert plugin._classify_signal(confidence=0.30, exp_return=0.02) == "STRONG_SELL"

    def test_strong_sell_large_negative_return(self, plugin):
        assert plugin._classify_signal(confidence=0.50, exp_return=-0.06) == "STRONG_SELL"

    def test_strong_sell_at_threshold(self, plugin):
        assert plugin._classify_signal(confidence=0.35, exp_return=0.00) == "STRONG_SELL"

    def test_sell_low_medium_confidence(self, plugin):
        assert plugin._classify_signal(confidence=0.45, exp_return=0.02) == "SELL"

    def test_sell_negative_return(self, plugin):
        assert plugin._classify_signal(confidence=0.50, exp_return=-0.01) == "SELL"

    def test_hold(self, plugin):
        assert plugin._classify_signal(confidence=0.50, exp_return=0.02) == "HOLD"


# ===========================================================================
# TestModelAGenerateSignals
# ===========================================================================

class TestModelAGenerateSignals:
    """Test generate_signals with mocked database and models."""

    @pytest.mark.asyncio
    async def test_returns_model_output_list(self, plugin):
        """generate_signals returns List[ModelOutput] when data is present."""
        # Build a fake engineered DataFrame that passes filters
        df = pd.DataFrame({
            "dt": [pd.Timestamp("2024-01-15")],
            "symbol": ["BHP.AX"],
            "close": [45.0],
            "volume": [1_000_000],
            "mom_12_1": [0.15],
            "mom_6": [0.10],
            "mom_3": [0.05],
            "mom_9": [0.12],
            "vol_90": [0.02],
            "vol_30": [0.018],
            "adv_20_median": [10_000_000.0],
            "trend_200": [1],
            "sma200_slope_pos": [1],
        })

        with patch.object(plugin, "_load_and_engineer_features", new_callable=AsyncMock, return_value=df):
            signals = await plugin.generate_signals(["BHP.AX"], date(2024, 1, 15))

        assert isinstance(signals, list)
        assert len(signals) == 1
        assert isinstance(signals[0], ModelOutput)
        assert signals[0].symbol == "BHP.AX"
        assert signals[0].signal in ("STRONG_BUY", "BUY", "HOLD", "SELL", "STRONG_SELL")

    @pytest.mark.asyncio
    async def test_handles_empty_price_data(self, plugin):
        """Returns empty list when no price data is available."""
        with patch.object(
            plugin, "_load_and_engineer_features",
            new_callable=AsyncMock,
            return_value=pd.DataFrame(),
        ):
            signals = await plugin.generate_signals(["BHP.AX"], date(2024, 1, 15))

        assert signals == []

    @pytest.mark.asyncio
    async def test_handles_all_filtered_out(self, plugin):
        """Returns empty when all symbols fail filters."""
        df = pd.DataFrame({
            "dt": [pd.Timestamp("2024-01-15")],
            "symbol": ["SMALL.AX"],
            "close": [0.50],           # below min_price
            "volume": [100],
            "mom_12_1": [0.05],
            "mom_6": [0.03],
            "mom_3": [0.02],
            "vol_90": [0.01],
            "vol_30": [0.01],
            "adv_20_median": [1000.0],  # below adv_floor
            "trend_200": [0],           # not above 200 SMA
            "sma200_slope_pos": [0],
        })

        with patch.object(plugin, "_load_and_engineer_features", new_callable=AsyncMock, return_value=df):
            signals = await plugin.generate_signals(["SMALL.AX"], date(2024, 1, 15))

        assert signals == []

    @pytest.mark.asyncio
    async def test_each_output_has_valid_signal_type(self, plugin):
        """Each ModelOutput has a valid SignalType value."""
        rows = []
        for sym in ["BHP.AX", "CBA.AX"]:
            rows.append({
                "dt": pd.Timestamp("2024-01-15"),
                "symbol": sym, "close": 40.0, "volume": 500_000,
                "mom_12_1": 0.10, "mom_6": 0.08, "mom_3": 0.04,
                "mom_9": 0.09, "vol_90": 0.02, "vol_30": 0.018,
                "adv_20_median": 8_000_000.0,
                "trend_200": 1, "sma200_slope_pos": 1,
            })
        df = pd.DataFrame(rows)

        # Make classifier return two rows of probs
        plugin._classifier.predict_proba = MagicMock(
            return_value=np.array([[0.3, 0.7], [0.4, 0.6]])
        )
        plugin._regressor.predict = MagicMock(
            return_value=np.array([0.08, 0.02])
        )

        with patch.object(plugin, "_load_and_engineer_features", new_callable=AsyncMock, return_value=df):
            signals = await plugin.generate_signals(["BHP.AX", "CBA.AX"], date(2024, 1, 15))

        valid = {"STRONG_BUY", "BUY", "HOLD", "SELL", "STRONG_SELL"}
        for sig in signals:
            assert sig.signal in valid

    @pytest.mark.asyncio
    async def test_output_metadata_contains_model_info(self, plugin):
        """Each output's metadata includes model_id and version."""
        df = pd.DataFrame({
            "dt": [pd.Timestamp("2024-01-15")],
            "symbol": ["BHP.AX"], "close": [45.0], "volume": [1_000_000],
            "mom_12_1": [0.15], "mom_6": [0.10], "mom_3": [0.05],
            "mom_9": [0.12], "vol_90": [0.02], "vol_30": [0.018],
            "adv_20_median": [10_000_000.0],
            "trend_200": [1], "sma200_slope_pos": [1],
        })

        with patch.object(plugin, "_load_and_engineer_features", new_callable=AsyncMock, return_value=df):
            signals = await plugin.generate_signals(["BHP.AX"], date(2024, 1, 15))

        assert signals[0].metadata["model_id"] == "model_a"
        assert signals[0].metadata["version"] == "v1.1"

    @pytest.mark.asyncio
    async def test_inference_failure_returns_empty(self, plugin):
        """If classifier.predict_proba raises, returns empty list."""
        df = pd.DataFrame({
            "dt": [pd.Timestamp("2024-01-15")],
            "symbol": ["BHP.AX"], "close": [45.0], "volume": [1_000_000],
            "mom_12_1": [0.15], "mom_6": [0.10], "mom_3": [0.05],
            "mom_9": [0.12], "vol_90": [0.02], "vol_30": [0.018],
            "adv_20_median": [10_000_000.0],
            "trend_200": [1], "sma200_slope_pos": [1],
        })
        plugin._classifier.predict_proba.side_effect = Exception("inference boom")

        with patch.object(plugin, "_load_and_engineer_features", new_callable=AsyncMock, return_value=df):
            signals = await plugin.generate_signals(["BHP.AX"], date(2024, 1, 15))

        assert signals == []


# ===========================================================================
# TestModelAGetSignal
# ===========================================================================

class TestModelAGetSignal:
    """Test get_signal (single-symbol retrieval)."""

    @pytest.mark.asyncio
    async def test_returns_from_db_when_cached(self, plugin):
        """get_signal returns DB-cached result without regenerating."""
        cached = ModelOutput(
            symbol="BHP.AX", signal="BUY", confidence=0.72,
            expected_return=0.05, generated_at="2024-01-15",
        )
        with patch.object(plugin, "_get_signal_from_db", return_value=cached):
            result = await plugin.get_signal("BHP.AX", as_of=date(2024, 1, 15))

        assert result is cached
        assert result.signal == "BUY"

    @pytest.mark.asyncio
    async def test_returns_none_for_unknown_ticker(self, plugin):
        """Returns None when DB has nothing and generate also produces nothing."""
        with patch.object(plugin, "_get_signal_from_db", return_value=None), \
             patch.object(plugin, "generate_signals", new_callable=AsyncMock, return_value=[]):
            result = await plugin.get_signal("UNKNOWN.AX", as_of=date(2024, 1, 15))

        assert result is None

    @pytest.mark.asyncio
    async def test_falls_back_to_generate_when_not_in_db(self, plugin):
        """Falls back to generate_signals when not in database."""
        generated = ModelOutput(
            symbol="CBA.AX", signal="HOLD", confidence=0.50,
            expected_return=0.01, generated_at="2024-01-15",
        )
        with patch.object(plugin, "_get_signal_from_db", return_value=None), \
             patch.object(plugin, "generate_signals",
                          new_callable=AsyncMock, return_value=[generated]):
            result = await plugin.get_signal("CBA.AX", as_of=date(2024, 1, 15))

        assert result is generated

    @pytest.mark.asyncio
    async def test_defaults_as_of_to_today(self, plugin):
        """as_of defaults to date.today() when not supplied."""
        with patch.object(plugin, "_get_signal_from_db", return_value=None) as mock_db, \
             patch.object(plugin, "generate_signals",
                          new_callable=AsyncMock, return_value=[]):
            await plugin.get_signal("BHP.AX")

        call_args = mock_db.call_args
        assert call_args[0][1] == date.today()


# ===========================================================================
# TestModelAGetSignalFromDb
# ===========================================================================

class TestModelAGetSignalFromDb:
    """Test _get_signal_from_db."""

    def test_reads_from_model_a_ml_signals_table(self, plugin):
        """Queries model_a_ml_signals and returns ModelOutput."""
        result_df = pd.DataFrame({
            "symbol": ["BHP.AX"],
            "ml_prob": [0.72],
            "ml_expected_return": [0.06],
            "rank": [3],
            "score": [0.85],
        })
        mock_conn = MagicMock()
        cm = MagicMock()
        cm.__enter__ = MagicMock(return_value=mock_conn)
        cm.__exit__ = MagicMock(return_value=False)

        with patch("app.features.models.plugins.model_a.db", return_value=cm), \
             patch("app.features.models.plugins.model_a.pd.read_sql", return_value=result_df):
            output = plugin._get_signal_from_db("BHP.AX", date(2024, 1, 15))

        assert isinstance(output, ModelOutput)
        assert output.symbol == "BHP.AX"
        assert output.confidence == 0.72
        assert output.expected_return == 0.06
        assert output.rank == 3
        assert output.metadata["source"] == "database"

    def test_returns_none_for_empty_result(self, plugin):
        """Returns None when query returns no rows."""
        mock_conn = MagicMock()
        cm = MagicMock()
        cm.__enter__ = MagicMock(return_value=mock_conn)
        cm.__exit__ = MagicMock(return_value=False)

        with patch("app.features.models.plugins.model_a.db", return_value=cm), \
             patch("app.features.models.plugins.model_a.pd.read_sql",
                   return_value=pd.DataFrame()):
            output = plugin._get_signal_from_db("NOPE.AX", date(2024, 1, 15))

        assert output is None

    def test_returns_none_on_db_error(self, plugin):
        """Returns None and logs error when DB raises."""
        cm = MagicMock()
        cm.__enter__ = MagicMock(side_effect=Exception("DB down"))
        cm.__exit__ = MagicMock(return_value=False)

        with patch("app.features.models.plugins.model_a.db", return_value=cm):
            output = plugin._get_signal_from_db("BHP.AX", date(2024, 1, 15))

        assert output is None


# ===========================================================================
# TestModelAExplain
# ===========================================================================

class TestModelAExplain:
    """Test the explain method."""

    def test_returns_dict_with_feature_importance(self, plugin):
        """Returns feature importance when SHAP is unavailable."""
        plugin._features = ["f1", "f2", "f3", "f4"]
        plugin._classifier.feature_importances_ = np.array([0.4, 0.3, 0.2, 0.1])

        result = plugin.explain("BHP.AX")

        assert result["symbol"] == "BHP.AX"
        assert result["model"] == "model_a"
        assert result["explanation_type"] == "feature_importance"
        assert result["source"] == "model"
        assert len(result["features"]) == 4
        # Sorted by importance descending
        assert result["features"][0]["name"] == "f1"
        assert result["features"][0]["importance"] == 0.4

    def test_returns_shap_when_available(self, plugin):
        """Returns SHAP explanation when _get_shap_from_db returns data."""
        shap_data = [
            {"name": "mom_12_1", "value": 0.15},
            {"name": "vol_90", "value": -0.08},
        ]
        with patch.object(plugin, "_get_shap_from_db", return_value=shap_data):
            result = plugin.explain("BHP.AX")

        assert result["explanation_type"] == "shap"
        assert result["source"] == "database"
        assert result["features"] == shap_data

    def test_returns_error_when_classifier_is_none(self, plugin):
        """Returns error dict when classifier is not loaded."""
        plugin._classifier = None

        result = plugin.explain("BHP.AX")

        assert "error" in result
        assert result["error"] == "Model not loaded"

    def test_get_shap_from_db_returns_none(self, plugin):
        """The placeholder _get_shap_from_db always returns None."""
        result = plugin._get_shap_from_db("BHP.AX")
        assert result is None


# ===========================================================================
# TestModelAApplyFilters
# ===========================================================================

class TestModelAApplyFilters:
    """Test the _apply_filters method directly."""

    def test_filters_by_adv_floor(self, plugin):
        """Symbols below ADV floor are removed."""
        df = pd.DataFrame({
            "symbol": ["HIGH", "LOW"],
            "close": [50.0, 50.0],
            "mom_6": [0.1, 0.1], "mom_12_1": [0.1, 0.1],
            "vol_90": [0.02, 0.02], "adv_20_median": [10_000_000.0, 100.0],
            "trend_200": [1, 1], "sma200_slope_pos": [1, 1],
        })
        result = plugin._apply_filters(df)
        assert len(result) == 1
        assert result.iloc[0]["symbol"] == "HIGH"

    def test_filters_by_min_price(self, plugin):
        """Symbols below min_price are removed."""
        df = pd.DataFrame({
            "symbol": ["OK", "PENNY"],
            "close": [5.0, 0.50],
            "mom_6": [0.1, 0.1], "mom_12_1": [0.1, 0.1],
            "vol_90": [0.02, 0.02], "adv_20_median": [10_000_000.0, 10_000_000.0],
            "trend_200": [1, 1], "sma200_slope_pos": [1, 1],
        })
        result = plugin._apply_filters(df)
        assert len(result) == 1
        assert result.iloc[0]["symbol"] == "OK"

    def test_filters_by_trend(self, plugin):
        """Symbols without positive trend are removed."""
        df = pd.DataFrame({
            "symbol": ["TREND_OK", "NO_TREND"],
            "close": [50.0, 50.0],
            "mom_6": [0.1, 0.1], "mom_12_1": [0.1, 0.1],
            "vol_90": [0.02, 0.02], "adv_20_median": [10_000_000.0, 10_000_000.0],
            "trend_200": [1, 0], "sma200_slope_pos": [1, 1],
        })
        result = plugin._apply_filters(df)
        assert len(result) == 1
        assert result.iloc[0]["symbol"] == "TREND_OK"

    def test_filters_by_null_features(self, plugin):
        """Symbols with null required features are removed."""
        df = pd.DataFrame({
            "symbol": ["GOOD", "BAD"],
            "close": [50.0, 50.0],
            "mom_6": [0.1, None], "mom_12_1": [0.1, 0.1],
            "vol_90": [0.02, 0.02], "adv_20_median": [10_000_000.0, 10_000_000.0],
            "trend_200": [1, 1], "sma200_slope_pos": [1, 1],
        })
        result = plugin._apply_filters(df)
        assert len(result) == 1
        assert result.iloc[0]["symbol"] == "GOOD"


# ===========================================================================
# TestModelARunInference
# ===========================================================================

class TestModelARunInference:
    """Test _run_inference method."""

    def test_raises_when_models_not_loaded(self, plugin):
        """RuntimeError when classifier or regressor is None."""
        plugin._classifier = None
        df = pd.DataFrame({"symbol": ["X"]})
        with pytest.raises(RuntimeError, match="Models not loaded"):
            plugin._run_inference(df, date(2024, 1, 15))

    def test_returns_ranked_model_outputs(self, plugin):
        """Returns list of ModelOutput sorted by score."""
        df = pd.DataFrame({
            "symbol": ["A", "B"],
            "mom_12_1": [0.20, 0.10],
            "mom_6": [0.15, 0.08],
            "mom_3": [0.10, 0.05],
            "vol_90": [0.02, 0.03],
            "adv_20_median": [10_000_000.0, 8_000_000.0],
            "trend_200": [1, 1],
        })
        plugin._classifier.predict_proba = MagicMock(
            return_value=np.array([[0.2, 0.8], [0.3, 0.7]])
        )
        plugin._regressor.predict = MagicMock(
            return_value=np.array([0.10, 0.05])
        )

        results = plugin._run_inference(df, date(2024, 1, 15))

        assert len(results) == 2
        assert results[0].rank == 1
        assert results[1].rank == 2
        # Higher score should be ranked first
        assert results[0].metadata["score"] >= results[1].metadata["score"]
