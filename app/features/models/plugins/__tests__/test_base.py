"""
app/features/models/plugins/__tests__/test_base.py
Comprehensive unit tests for the base plugin interface: ModelConfig, ModelOutput, ModelPlugin.
"""

import pytest
from unittest.mock import MagicMock, AsyncMock
from datetime import date
from typing import Any, Dict, List, Optional

from app.features.models.plugins.base import (
    ModelConfig,
    ModelOutput,
    ModelPlugin,
    SignalType,
)


# ---------------------------------------------------------------------------
# Concrete test implementation of ModelPlugin
# ---------------------------------------------------------------------------

class MockPlugin(ModelPlugin):
    """Concrete implementation of ModelPlugin for testing abstract base class."""

    def __init__(
        self,
        model_id: str = "test",
        version: str = "v1",
        weight: float = 0.5,
        enabled: bool = True,
        requires_features: Optional[List[str]] = None,
        display_name: str = "",
    ):
        self._config = ModelConfig(
            model_id=model_id,
            version=version,
            weight_in_ensemble=weight,
            enabled=enabled,
            requires_features=requires_features if requires_features is not None else ["f1", "f2"],
            display_name=display_name,
        )

    @property
    def config(self) -> ModelConfig:
        return self._config

    async def generate_signals(
        self, symbols: List[str], as_of: date
    ) -> List[ModelOutput]:
        return []

    async def get_signal(
        self, symbol: str, as_of: Optional[date] = None
    ) -> Optional[ModelOutput]:
        return None

    def explain(self, symbol: str) -> Dict[str, Any]:
        return {}


# ===========================================================================
# TestModelConfig
# ===========================================================================

class TestModelConfig:
    """Test ModelConfig dataclass behaviour."""

    def test_default_display_name_generation(self):
        """display_name is auto-generated from model_id when not provided."""
        cfg = ModelConfig(model_id="model_a", version="v1")
        assert cfg.display_name == "Model A"

    def test_default_display_name_with_underscores(self):
        """display_name handles multiple underscores correctly."""
        cfg = ModelConfig(model_id="my_fancy_model", version="v2")
        assert cfg.display_name == "My Fancy Model"

    def test_custom_display_name_preserved(self):
        """Explicit display_name is not overwritten."""
        cfg = ModelConfig(
            model_id="model_a",
            version="v1",
            display_name="Custom Name",
        )
        assert cfg.display_name == "Custom Name"

    def test_default_weight_is_zero(self):
        """weight_in_ensemble defaults to 0.0."""
        cfg = ModelConfig(model_id="x", version="v1")
        assert cfg.weight_in_ensemble == 0.0

    def test_enabled_default_true(self):
        """enabled defaults to True."""
        cfg = ModelConfig(model_id="x", version="v1")
        assert cfg.enabled is True

    def test_requires_features_default_empty_list(self):
        """requires_features defaults to an empty list."""
        cfg = ModelConfig(model_id="x", version="v1")
        assert cfg.requires_features == []

    def test_explicit_weight(self):
        """weight_in_ensemble can be set explicitly."""
        cfg = ModelConfig(model_id="x", version="v1", weight_in_ensemble=0.7)
        assert cfg.weight_in_ensemble == 0.7

    def test_explicit_enabled_false(self):
        """enabled can be set to False."""
        cfg = ModelConfig(model_id="x", version="v1", enabled=False)
        assert cfg.enabled is False

    def test_requires_features_explicit(self):
        """requires_features can be set explicitly."""
        features = ["momentum", "volatility"]
        cfg = ModelConfig(model_id="x", version="v1", requires_features=features)
        assert cfg.requires_features == features


# ===========================================================================
# TestModelOutput
# ===========================================================================

class TestModelOutput:
    """Test ModelOutput dataclass and to_dict serialisation."""

    def test_to_dict_includes_all_fields(self):
        """to_dict() returns a dict with every field."""
        output = ModelOutput(
            symbol="BHP.AX",
            signal="BUY",
            confidence=0.75,
            expected_return=0.12,
            metadata={"model_id": "model_a"},
            rank=1,
            generated_at="2024-01-15",
        )
        d = output.to_dict()

        assert d["symbol"] == "BHP.AX"
        assert d["signal"] == "BUY"
        assert d["confidence"] == 0.75
        assert d["expected_return"] == 0.12
        assert d["metadata"] == {"model_id": "model_a"}
        assert d["rank"] == 1
        assert d["generated_at"] == "2024-01-15"

    def test_optional_fields_default_to_none(self):
        """Optional fields default to None when not provided."""
        output = ModelOutput(symbol="CBA.AX", signal="HOLD", confidence=0.5)

        assert output.expected_return is None
        assert output.rank is None
        assert output.generated_at is None

    def test_metadata_defaults_to_empty_dict(self):
        """metadata defaults to an empty dict."""
        output = ModelOutput(symbol="X", signal="HOLD", confidence=0.5)
        assert output.metadata == {}

    def test_generated_at_is_optional(self):
        """generated_at can be omitted."""
        output = ModelOutput(symbol="X", signal="SELL", confidence=0.3)
        assert output.generated_at is None
        d = output.to_dict()
        assert d["generated_at"] is None

    def test_to_dict_returns_dict_type(self):
        """to_dict() returns a plain dict."""
        output = ModelOutput(symbol="X", signal="HOLD", confidence=0.5)
        assert isinstance(output.to_dict(), dict)

    def test_to_dict_with_none_optionals(self):
        """to_dict() includes None values for unset optional fields."""
        output = ModelOutput(symbol="X", signal="HOLD", confidence=0.5)
        d = output.to_dict()
        assert "expected_return" in d
        assert d["expected_return"] is None
        assert "rank" in d
        assert d["rank"] is None


# ===========================================================================
# TestModelPluginInterface
# ===========================================================================

class TestModelPluginInterface:
    """Test the ModelPlugin abstract base class and its concrete helper methods."""

    def test_abstract_methods_are_defined(self):
        """The ABC defines generate_signals, get_signal, explain as abstract."""
        abstracts = ModelPlugin.__abstractmethods__
        assert "generate_signals" in abstracts
        assert "get_signal" in abstracts
        assert "explain" in abstracts
        # config is an abstract property
        assert "config" in abstracts

    def test_cannot_instantiate_abstract_class(self):
        """Instantiating ModelPlugin directly raises TypeError."""
        with pytest.raises(TypeError):
            ModelPlugin()

    def test_validate_features_all_present(self):
        """validate_features returns True when all required features are present."""
        plugin = MockPlugin(requires_features=["f1", "f2"])
        features = {"f1": 1.0, "f2": 2.0, "extra": 3.0}
        assert plugin.validate_features(features) is True

    def test_validate_features_missing_returns_false(self):
        """validate_features returns False when a required feature is missing."""
        plugin = MockPlugin(requires_features=["f1", "f2", "f3"])
        features = {"f1": 1.0, "f2": 2.0}
        assert plugin.validate_features(features) is False

    def test_validate_features_empty_required(self):
        """validate_features returns True when no features are required."""
        plugin = MockPlugin(requires_features=[])
        features = {"f1": 1.0}
        assert plugin.validate_features(features) is True

    def test_validate_features_empty_provided(self):
        """validate_features returns False when features dict is empty but requirements exist."""
        plugin = MockPlugin(requires_features=["f1"])
        assert plugin.validate_features({}) is False

    def test_is_enabled_returns_config_enabled(self):
        """is_enabled() returns the config.enabled value."""
        plugin_enabled = MockPlugin(enabled=True)
        assert plugin_enabled.is_enabled() is True

        plugin_disabled = MockPlugin(enabled=False)
        assert plugin_disabled.is_enabled() is False

    def test_get_weight_returns_weight_when_enabled(self):
        """get_weight() returns the configured weight when plugin is enabled."""
        plugin = MockPlugin(weight=0.6, enabled=True)
        assert plugin.get_weight() == 0.6

    def test_get_weight_returns_zero_when_disabled(self):
        """get_weight() returns 0.0 when plugin is disabled."""
        plugin = MockPlugin(weight=0.6, enabled=False)
        assert plugin.get_weight() == 0.0

    def test_config_property_returns_model_config(self):
        """config property returns a ModelConfig instance."""
        plugin = MockPlugin()
        assert isinstance(plugin.config, ModelConfig)

    @pytest.mark.asyncio
    async def test_generate_signals_is_callable(self):
        """generate_signals is an async method that can be awaited."""
        plugin = MockPlugin()
        result = await plugin.generate_signals(["BHP.AX"], date(2024, 1, 15))
        assert isinstance(result, list)

    @pytest.mark.asyncio
    async def test_get_signal_is_callable(self):
        """get_signal is an async method that can be awaited."""
        plugin = MockPlugin()
        result = await plugin.get_signal("BHP.AX")
        assert result is None

    def test_explain_is_callable(self):
        """explain returns a dict."""
        plugin = MockPlugin()
        result = plugin.explain("BHP.AX")
        assert isinstance(result, dict)
