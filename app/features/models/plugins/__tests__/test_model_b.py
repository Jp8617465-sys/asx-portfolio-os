"""
Tests for ModelBPlugin - Fundamentals-based grading model.

Written FIRST (TDD) before implementation.
Tests cover: config, generate_signals, signal classification,
get_signal, explain, and derived feature computation.
"""

import json
import os
from datetime import date
from unittest.mock import MagicMock, patch, mock_open, AsyncMock

import numpy as np
import pandas as pd
import pytest

# ---------------------------------------------------------------------------
# Helpers – build a mock classifier that behaves like a sklearn-style model
# ---------------------------------------------------------------------------

def _make_mock_classifier(n_classes=2):
    """Return a mock classifier with predict_proba."""
    clf = MagicMock()
    clf.predict_proba = MagicMock(
        side_effect=lambda X: np.column_stack([
            1 - np.full(len(X), 0.75),
            np.full(len(X), 0.75),
        ])
    )
    clf.feature_importances_ = np.array([0.3, 0.2, 0.15, 0.1, 0.1, 0.05, 0.05, 0.05])
    return clf


FEATURE_NAMES = [
    "pe_ratio", "pb_ratio", "roe", "debt_to_equity",
    "profit_margin", "revenue_growth_yoy", "current_ratio", "eps_growth",
]

FEATURES_JSON = {"features": FEATURE_NAMES}


def _patch_model_loading():
    """Return a set of patches that prevent real file/model loading."""
    mock_clf = _make_mock_classifier()
    patches = {
        "joblib_load": patch(
            "app.features.models.plugins.model_b.joblib.load",
            return_value=mock_clf,
        ),
        "os_path_exists": patch(
            "app.features.models.plugins.model_b.os.path.exists",
            return_value=True,
        ),
        "builtins_open": patch(
            "builtins.open",
            mock_open(read_data=json.dumps(FEATURES_JSON)),
        ),
    }
    return patches, mock_clf


# ──────────────────────────────────────────────────────────────────────────────
# 1. TestModelBPluginConfig
# ──────────────────────────────────────────────────────────────────────────────

class TestModelBPluginConfig:
    """Tests that ModelBPlugin config is correctly set up."""

    def _make_plugin(self):
        patches, _ = _patch_model_loading()
        with patches["joblib_load"], patches["os_path_exists"], patches["builtins_open"]:
            from app.features.models.plugins.model_b import ModelBPlugin
            return ModelBPlugin()

    def test_model_id_is_model_b(self):
        plugin = self._make_plugin()
        assert plugin.config.model_id == "model_b"

    def test_version_is_v1_0(self):
        plugin = self._make_plugin()
        assert plugin.config.version == "v1.0"

    def test_weight_is_0_4(self):
        plugin = self._make_plugin()
        assert plugin.config.weight_in_ensemble == 0.4

    def test_requires_fundamentals_features(self):
        plugin = self._make_plugin()
        expected_features = [
            "pe_ratio", "pb_ratio", "roe", "debt_to_equity",
            "profit_margin", "revenue_growth_yoy", "current_ratio",
            "quick_ratio", "eps_growth", "market_cap", "div_yield",
        ]
        for feat in expected_features:
            assert feat in plugin.config.requires_features, (
                f"Missing required feature: {feat}"
            )

    def test_display_name_set(self):
        plugin = self._make_plugin()
        assert plugin.config.display_name != ""
        assert "Model B" in plugin.config.display_name or "Fundamental" in plugin.config.display_name

    def test_enabled_by_default(self):
        plugin = self._make_plugin()
        assert plugin.config.enabled is True

    def test_get_weight_returns_weight(self):
        plugin = self._make_plugin()
        assert plugin.get_weight() == 0.4

    def test_get_weight_returns_zero_when_disabled(self):
        patches, _ = _patch_model_loading()
        with patches["joblib_load"], patches["os_path_exists"], patches["builtins_open"]:
            from app.features.models.plugins.model_b import ModelBPlugin
            plugin = ModelBPlugin(enabled=False)
        assert plugin.get_weight() == 0.0


# ──────────────────────────────────────────────────────────────────────────────
# 2. TestModelBPluginGenerateSignals
# ──────────────────────────────────────────────────────────────────────────────

class TestModelBPluginGenerateSignals:
    """Tests that generate_signals returns List[ModelOutput] correctly."""

    def _make_plugin_and_clf(self):
        patches, mock_clf = _patch_model_loading()
        with patches["joblib_load"], patches["os_path_exists"], patches["builtins_open"]:
            from app.features.models.plugins.model_b import ModelBPlugin
            plugin = ModelBPlugin()
        return plugin, mock_clf

    def _make_fundamentals_df(self, n=5):
        """Build a fake fundamentals DataFrame."""
        symbols = [f"SYM{i}.AX" for i in range(n)]
        return pd.DataFrame({
            "symbol": symbols,
            "pe_ratio": np.random.uniform(5, 30, n),
            "pb_ratio": np.random.uniform(0.5, 5, n),
            "roe": np.random.uniform(-0.1, 0.4, n),
            "debt_to_equity": np.random.uniform(0, 3, n),
            "profit_margin": np.random.uniform(-0.1, 0.3, n),
            "revenue_growth_yoy": np.random.uniform(-0.2, 0.5, n),
            "current_ratio": np.random.uniform(0.5, 3, n),
            "quick_ratio": np.random.uniform(0.3, 2, n),
            "eps_growth": np.random.uniform(-0.5, 1, n),
            "market_cap": np.random.uniform(1e8, 1e11, n),
            "div_yield": np.random.uniform(0, 0.08, n),
            "sector": ["Financials"] * n,
            "industry": ["Banks"] * n,
        })

    @pytest.mark.asyncio
    async def test_generate_signals_returns_list_of_model_output(self):
        plugin, mock_clf = self._make_plugin_and_clf()
        df = self._make_fundamentals_df(5)

        with patch.object(plugin, "_fetch_fundamentals", return_value=df):
            signals = await plugin.generate_signals(
                [f"SYM{i}.AX" for i in range(5)], date(2024, 6, 1)
            )

        from app.features.models.plugins.base import ModelOutput
        assert isinstance(signals, list)
        assert len(signals) > 0
        for s in signals:
            assert isinstance(s, ModelOutput)

    @pytest.mark.asyncio
    async def test_generate_signals_empty_fundamentals(self):
        plugin, _ = self._make_plugin_and_clf()
        empty_df = pd.DataFrame()

        with patch.object(plugin, "_fetch_fundamentals", return_value=empty_df):
            signals = await plugin.generate_signals(["BHP.AX"], date(2024, 6, 1))

        assert signals == []

    @pytest.mark.asyncio
    async def test_generate_signals_filters_insufficient_coverage(self):
        plugin, mock_clf = self._make_plugin_and_clf()

        # Build a df where most features are NaN (below 80% coverage)
        df = pd.DataFrame({
            "symbol": ["BAD.AX"],
            "pe_ratio": [np.nan],
            "pb_ratio": [np.nan],
            "roe": [np.nan],
            "debt_to_equity": [np.nan],
            "profit_margin": [np.nan],
            "revenue_growth_yoy": [np.nan],
            "current_ratio": [np.nan],
            "quick_ratio": [np.nan],
            "eps_growth": [np.nan],
            "market_cap": [1e9],
            "div_yield": [0.03],
            "sector": ["Materials"],
            "industry": ["Mining"],
        })

        with patch.object(plugin, "_fetch_fundamentals", return_value=df):
            signals = await plugin.generate_signals(["BAD.AX"], date(2024, 6, 1))

        assert signals == []

    @pytest.mark.asyncio
    async def test_generate_signals_output_has_correct_fields(self):
        plugin, mock_clf = self._make_plugin_and_clf()
        df = self._make_fundamentals_df(3)

        with patch.object(plugin, "_fetch_fundamentals", return_value=df):
            signals = await plugin.generate_signals(
                [f"SYM{i}.AX" for i in range(3)], date(2024, 6, 1)
            )

        for s in signals:
            assert hasattr(s, "symbol")
            assert hasattr(s, "signal")
            assert hasattr(s, "confidence")
            assert s.signal in ("STRONG_BUY", "BUY", "HOLD", "SELL", "STRONG_SELL")
            assert 0 <= s.confidence <= 1
            assert s.generated_at is not None

    @pytest.mark.asyncio
    async def test_generate_signals_metadata_includes_model_info(self):
        plugin, _ = self._make_plugin_and_clf()
        df = self._make_fundamentals_df(2)

        with patch.object(plugin, "_fetch_fundamentals", return_value=df):
            signals = await plugin.generate_signals(
                ["SYM0.AX", "SYM1.AX"], date(2024, 6, 1)
            )

        for s in signals:
            assert s.metadata.get("model_id") == "model_b"
            assert s.metadata.get("version") == "v1.0"


# ──────────────────────────────────────────────────────────────────────────────
# 3. TestModelBPluginSignalClassification
# ──────────────────────────────────────────────────────────────────────────────

class TestModelBPluginSignalClassification:
    """Tests the classify_signal logic based on quality grades and probability."""

    def _make_plugin(self):
        patches, _ = _patch_model_loading()
        with patches["joblib_load"], patches["os_path_exists"], patches["builtins_open"]:
            from app.features.models.plugins.model_b import ModelBPlugin
            return ModelBPlugin()

    def test_quality_a_high_prob_is_buy(self):
        plugin = self._make_plugin()
        signal = plugin.classify_signal(quality_score="A", prob=0.75)
        assert signal in ("BUY", "STRONG_BUY")

    def test_quality_b_high_prob_is_buy(self):
        plugin = self._make_plugin()
        signal = plugin.classify_signal(quality_score="B", prob=0.65)
        assert signal in ("BUY", "STRONG_BUY")

    def test_quality_a_very_high_prob_is_strong_buy(self):
        plugin = self._make_plugin()
        signal = plugin.classify_signal(quality_score="A", prob=0.85)
        assert signal == "STRONG_BUY"

    def test_quality_d_is_sell(self):
        plugin = self._make_plugin()
        signal = plugin.classify_signal(quality_score="D", prob=0.35)
        assert signal in ("SELL", "STRONG_SELL")

    def test_quality_f_is_sell(self):
        plugin = self._make_plugin()
        signal = plugin.classify_signal(quality_score="F", prob=0.2)
        assert signal in ("SELL", "STRONG_SELL")

    def test_quality_f_very_low_prob_is_strong_sell(self):
        plugin = self._make_plugin()
        signal = plugin.classify_signal(quality_score="F", prob=0.1)
        assert signal == "STRONG_SELL"

    def test_quality_c_mid_prob_is_hold(self):
        plugin = self._make_plugin()
        signal = plugin.classify_signal(quality_score="C", prob=0.5)
        assert signal == "HOLD"

    def test_low_prob_regardless_of_grade_is_sell(self):
        plugin = self._make_plugin()
        signal = plugin.classify_signal(quality_score="B", prob=0.3)
        assert signal in ("SELL", "STRONG_SELL")

    def test_return_type_is_valid_signal(self):
        plugin = self._make_plugin()
        for grade in ["A", "B", "C", "D", "F"]:
            for prob in [0.1, 0.3, 0.5, 0.7, 0.9]:
                sig = plugin.classify_signal(quality_score=grade, prob=prob)
                assert sig in ("STRONG_BUY", "BUY", "HOLD", "SELL", "STRONG_SELL")


# ──────────────────────────────────────────────────────────────────────────────
# 4. TestModelBPluginGetSignal
# ──────────────────────────────────────────────────────────────────────────────

class TestModelBPluginGetSignal:
    """Tests get_signal with DB lookup and fallback to generate."""

    def _make_plugin(self):
        patches, _ = _patch_model_loading()
        with patches["joblib_load"], patches["os_path_exists"], patches["builtins_open"]:
            from app.features.models.plugins.model_b import ModelBPlugin
            return ModelBPlugin()

    @pytest.mark.asyncio
    async def test_get_signal_returns_from_db_when_found(self):
        plugin = self._make_plugin()

        mock_row = {
            "symbol": "BHP.AX",
            "ml_prob": 0.72,
            "ml_expected_return": 0.044,
            "rank": 3,
            "score": 0.72,
            "quality_score": "A",
        }
        mock_df = pd.DataFrame([mock_row])

        with patch.object(plugin, "_get_signal_from_db") as mock_db:
            from app.features.models.plugins.base import ModelOutput
            mock_db.return_value = ModelOutput(
                symbol="BHP.AX",
                signal="BUY",
                confidence=0.72,
                expected_return=0.044,
                rank=3,
                generated_at="2024-06-01",
                metadata={"model_id": "model_b", "source": "database"},
            )
            result = await plugin.get_signal("BHP.AX", as_of=date(2024, 6, 1))

        assert result is not None
        assert result.symbol == "BHP.AX"
        assert result.signal == "BUY"
        assert result.metadata.get("source") == "database"

    @pytest.mark.asyncio
    async def test_get_signal_falls_back_to_generate(self):
        plugin = self._make_plugin()

        with patch.object(plugin, "_get_signal_from_db", return_value=None), \
             patch.object(plugin, "generate_signals", new_callable=AsyncMock) as mock_gen:
            from app.features.models.plugins.base import ModelOutput
            mock_gen.return_value = [
                ModelOutput(
                    symbol="CBA.AX",
                    signal="HOLD",
                    confidence=0.52,
                    expected_return=0.004,
                    generated_at="2024-06-01",
                    metadata={"model_id": "model_b"},
                )
            ]
            result = await plugin.get_signal("CBA.AX", as_of=date(2024, 6, 1))

        assert result is not None
        assert result.symbol == "CBA.AX"
        mock_gen.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_signal_returns_none_when_no_data(self):
        plugin = self._make_plugin()

        with patch.object(plugin, "_get_signal_from_db", return_value=None), \
             patch.object(plugin, "generate_signals", new_callable=AsyncMock) as mock_gen:
            mock_gen.return_value = []
            result = await plugin.get_signal("UNKNOWN.AX", as_of=date(2024, 6, 1))

        assert result is None

    @pytest.mark.asyncio
    async def test_get_signal_defaults_to_today_when_no_as_of(self):
        plugin = self._make_plugin()

        with patch.object(plugin, "_get_signal_from_db", return_value=None), \
             patch.object(plugin, "generate_signals", new_callable=AsyncMock) as mock_gen:
            mock_gen.return_value = []
            await plugin.get_signal("BHP.AX")

        # Should have been called with today's date
        call_args = mock_gen.call_args
        assert call_args[0][1] == date.today()


# ──────────────────────────────────────────────────────────────────────────────
# 5. TestModelBPluginExplain
# ──────────────────────────────────────────────────────────────────────────────

class TestModelBPluginExplain:
    """Tests that explain returns feature importance dict."""

    def _make_plugin(self):
        patches, _ = _patch_model_loading()
        with patches["joblib_load"], patches["os_path_exists"], patches["builtins_open"]:
            from app.features.models.plugins.model_b import ModelBPlugin
            return ModelBPlugin()

    def test_explain_returns_dict(self):
        plugin = self._make_plugin()
        result = plugin.explain("BHP.AX")
        assert isinstance(result, dict)

    def test_explain_contains_symbol(self):
        plugin = self._make_plugin()
        result = plugin.explain("BHP.AX")
        assert result["symbol"] == "BHP.AX"

    def test_explain_contains_model_id(self):
        plugin = self._make_plugin()
        result = plugin.explain("BHP.AX")
        assert result["model"] == "model_b"

    def test_explain_contains_features_list(self):
        plugin = self._make_plugin()
        result = plugin.explain("BHP.AX")
        assert "features" in result
        assert isinstance(result["features"], list)

    def test_explain_features_have_name_and_importance(self):
        plugin = self._make_plugin()
        result = plugin.explain("BHP.AX")
        for feat in result["features"]:
            assert "name" in feat
            assert "importance" in feat

    def test_explain_features_sorted_by_importance(self):
        plugin = self._make_plugin()
        result = plugin.explain("BHP.AX")
        importances = [f["importance"] for f in result["features"]]
        assert importances == sorted(importances, reverse=True)

    def test_explain_without_model_loaded_returns_error(self):
        plugin = self._make_plugin()
        plugin._classifier = None
        result = plugin.explain("BHP.AX")
        assert "error" in result


# ──────────────────────────────────────────────────────────────────────────────
# 6. TestModelBDerivedFeatures
# ──────────────────────────────────────────────────────────────────────────────

class TestModelBDerivedFeatures:
    """Tests compute_derived_features: PE inverse, financial health, value composite."""

    def _make_plugin(self):
        patches, _ = _patch_model_loading()
        with patches["joblib_load"], patches["os_path_exists"], patches["builtins_open"]:
            from app.features.models.plugins.model_b import ModelBPlugin
            return ModelBPlugin()

    def _sample_df(self, n=10):
        """Build a sample fundamentals DataFrame with enough rows for z-scores."""
        np.random.seed(42)
        return pd.DataFrame({
            "symbol": [f"S{i}.AX" for i in range(n)],
            "pe_ratio": np.random.uniform(5, 40, n),
            "pb_ratio": np.random.uniform(0.5, 8, n),
            "roe": np.random.uniform(-0.1, 0.4, n),
            "debt_to_equity": np.random.uniform(0, 3, n),
            "profit_margin": np.random.uniform(-0.1, 0.3, n),
            "revenue_growth_yoy": np.random.uniform(-0.3, 0.5, n),
            "current_ratio": np.random.uniform(0.5, 4, n),
            "quick_ratio": np.random.uniform(0.3, 2.5, n),
            "eps_growth": np.random.uniform(-0.5, 1, n),
            "market_cap": np.random.uniform(1e8, 5e10, n),
            "div_yield": np.random.uniform(0, 0.08, n),
        })

    def test_pe_inverse_computed(self):
        plugin = self._make_plugin()
        df = self._sample_df()
        result = plugin.compute_derived_features(df.copy())
        assert "pe_inverse" in result.columns
        # pe_inverse = 1 / pe_ratio
        assert not result["pe_inverse"].isna().all()

    def test_pe_inverse_zero_pe_handled(self):
        plugin = self._make_plugin()
        df = self._sample_df()
        df.loc[0, "pe_ratio"] = 0
        result = plugin.compute_derived_features(df.copy())
        # Should handle division by zero gracefully (NaN)
        assert "pe_inverse" in result.columns

    def test_financial_health_score_computed(self):
        plugin = self._make_plugin()
        df = self._sample_df()
        result = plugin.compute_derived_features(df.copy())
        assert "financial_health_score" in result.columns
        assert not result["financial_health_score"].isna().all()

    def test_value_score_computed(self):
        plugin = self._make_plugin()
        df = self._sample_df()
        result = plugin.compute_derived_features(df.copy())
        assert "value_score" in result.columns
        assert not result["value_score"].isna().all()

    def test_value_score_between_0_and_1(self):
        plugin = self._make_plugin()
        df = self._sample_df(20)
        result = plugin.compute_derived_features(df.copy())
        valid = result["value_score"].dropna()
        assert (valid >= 0).all() and (valid <= 1).all()

    def test_quality_score_v2_computed(self):
        plugin = self._make_plugin()
        df = self._sample_df()
        result = plugin.compute_derived_features(df.copy())
        assert "quality_score_v2" in result.columns

    def test_derived_features_preserves_original_columns(self):
        plugin = self._make_plugin()
        df = self._sample_df()
        original_cols = set(df.columns)
        result = plugin.compute_derived_features(df.copy())
        assert original_cols.issubset(set(result.columns))
