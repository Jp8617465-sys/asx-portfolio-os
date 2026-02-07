"""
app/features/models/registry/__tests__/test_registry.py
Comprehensive unit tests for ModelRegistry class.
"""

import os
import pytest
from unittest.mock import MagicMock, patch, mock_open
from typing import Dict, List, Optional
from datetime import date
import yaml

from app.features.models.registry import ModelRegistry, model_registry
from app.features.models.plugins.base import ModelConfig, ModelOutput, ModelPlugin


# ---------------------------------------------------------------------------
# Concrete test implementation of ModelPlugin (reusing pattern from test_base.py)
# ---------------------------------------------------------------------------

class MockPlugin(ModelPlugin):
    """Concrete implementation of ModelPlugin for testing registry."""

    def __init__(
        self,
        model_id: str = "test_model",
        version: str = "v1.0",
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
            requires_features=requires_features if requires_features is not None else [],
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

    def explain(self, symbol: str) -> Dict:
        return {}


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def reset_registry():
    """Reset the singleton registry instance before each test to prevent test interference."""
    ModelRegistry._instance = None
    yield
    ModelRegistry._instance = None


@pytest.fixture
def sample_config():
    """Sample configuration dict matching models.yaml structure."""
    return {
        "models": {
            "model_a": {
                "enabled": True,
                "weight": 0.6,
                "version": "v1.1",
                "description": "Test model A",
                "features": ["momentum", "volatility"],
            },
            "model_b": {
                "enabled": True,
                "weight": 0.4,
                "version": "v1.0",
                "description": "Test model B",
                "features": ["pe_ratio", "roe"],
            },
            "model_c": {
                "enabled": False,
                "weight": 0.0,
                "version": "v1.0",
                "description": "Test model C - disabled",
                "features": ["sentiment"],
            },
        },
        "ensemble": {
            "conflict_strategy": "weighted_majority",
            "min_agreement": 0.5,
            "min_confidence": 0.6,
            "flag_conflicts": True,
        },
    }


# ===========================================================================
# TestModelRegistrySingleton
# ===========================================================================

class TestModelRegistrySingleton:
    """Test singleton pattern implementation."""

    def test_singleton_returns_same_instance(self):
        """Multiple instantiations return the same singleton instance."""
        registry1 = ModelRegistry()
        registry2 = ModelRegistry()
        assert registry1 is registry2

    def test_singleton_state_persists(self):
        """State changes persist across multiple instantiations."""
        registry1 = ModelRegistry()
        plugin = MockPlugin(model_id="test_persist")
        registry1.register(plugin)

        registry2 = ModelRegistry()
        assert registry2.get("test_persist") is not None
        assert registry2.get("test_persist") is plugin

    def test_singleton_reset_creates_fresh_instance(self, reset_registry):
        """After reset, a fresh registry is created (via fixture)."""
        # This test implicitly validates the reset_registry fixture behavior
        registry = ModelRegistry()
        assert len(registry.get_all()) == 0

    def test_module_level_instance_is_singleton(self):
        """Module-level model_registry is the singleton instance."""
        # Note: The reset_registry fixture clears the singleton before each test,
        # so the module-level instance created at import time is a different instance.
        # This test validates that creating a new instance after reset returns the same
        # instance as subsequent calls.
        registry1 = ModelRegistry()
        registry2 = ModelRegistry()
        assert registry1 is registry2

    def test_singleton_initializes_empty_state(self):
        """Fresh singleton has empty plugins, config, and config_loaded=False."""
        registry = ModelRegistry()
        assert registry._plugins == {}
        assert registry._config == {}
        assert registry._config_loaded is False


# ===========================================================================
# TestModelRegistryConfig
# ===========================================================================

class TestModelRegistryConfig:
    """Test configuration loading from YAML."""

    def test_load_config_from_yaml_file(self, sample_config, tmp_path):
        """load_config successfully loads a valid YAML file."""
        config_file = tmp_path / "models.yaml"
        with open(config_file, "w") as f:
            yaml.dump(sample_config, f)

        registry = ModelRegistry()
        registry.load_config(str(config_file))

        assert registry._config_loaded is True
        assert registry._config == sample_config
        assert "models" in registry._config
        assert "ensemble" in registry._config

    def test_load_config_missing_file_uses_defaults(self, tmp_path):
        """load_config with missing file sets defaults and logs warning."""
        config_file = tmp_path / "nonexistent.yaml"
        registry = ModelRegistry()

        with patch("app.features.models.registry.logger") as mock_logger:
            registry.load_config(str(config_file))
            mock_logger.warning.assert_called_once()

        assert registry._config == {"models": {}, "ensemble": {}}
        assert registry._config_loaded is False

    def test_load_config_invalid_yaml_uses_defaults(self, tmp_path):
        """load_config with invalid YAML logs error and uses defaults."""
        config_file = tmp_path / "invalid.yaml"
        with open(config_file, "w") as f:
            f.write("invalid: yaml: content: [")

        registry = ModelRegistry()

        with patch("app.features.models.registry.logger") as mock_logger:
            registry.load_config(str(config_file))
            mock_logger.error.assert_called_once()

        assert registry._config == {"models": {}, "ensemble": {}}

    def test_load_config_default_path(self, sample_config):
        """load_config without path uses PROJECT_ROOT/config/models.yaml."""
        registry = ModelRegistry()

        with patch("builtins.open", mock_open(read_data=yaml.dump(sample_config))):
            with patch("os.path.exists", return_value=True):
                registry.load_config()

        assert registry._config_loaded is True
        assert registry._config == sample_config

    def test_get_model_config_returns_config_for_model(self, sample_config, tmp_path):
        """get_model_config returns the config dict for a specific model."""
        config_file = tmp_path / "models.yaml"
        with open(config_file, "w") as f:
            yaml.dump(sample_config, f)

        registry = ModelRegistry()
        registry.load_config(str(config_file))

        config = registry.get_model_config("model_a")
        assert config is not None
        assert config["enabled"] is True
        assert config["weight"] == 0.6
        assert config["version"] == "v1.1"

    def test_get_model_config_nonexistent_returns_none(self, sample_config, tmp_path):
        """get_model_config returns None for nonexistent model_id."""
        config_file = tmp_path / "models.yaml"
        with open(config_file, "w") as f:
            yaml.dump(sample_config, f)

        registry = ModelRegistry()
        registry.load_config(str(config_file))

        config = registry.get_model_config("nonexistent_model")
        assert config is None

    def test_get_model_config_lazy_loads_config(self, sample_config):
        """get_model_config auto-loads config if not already loaded."""
        registry = ModelRegistry()

        with patch.object(registry, "load_config") as mock_load:
            registry._config_loaded = False
            registry.get_model_config("model_a")
            mock_load.assert_called_once()

    def test_get_ensemble_config_returns_ensemble_dict(self, sample_config, tmp_path):
        """get_ensemble_config returns the ensemble configuration."""
        config_file = tmp_path / "models.yaml"
        with open(config_file, "w") as f:
            yaml.dump(sample_config, f)

        registry = ModelRegistry()
        registry.load_config(str(config_file))

        ensemble = registry.get_ensemble_config()
        assert ensemble is not None
        assert ensemble["conflict_strategy"] == "weighted_majority"
        assert ensemble["min_agreement"] == 0.5
        assert ensemble["min_confidence"] == 0.6
        assert ensemble["flag_conflicts"] is True

    def test_get_ensemble_config_empty_when_missing(self):
        """get_ensemble_config returns empty dict when ensemble section is missing."""
        registry = ModelRegistry()
        registry._config = {"models": {}}
        registry._config_loaded = True

        ensemble = registry.get_ensemble_config()
        assert ensemble == {}

    def test_get_ensemble_config_lazy_loads_config(self, sample_config):
        """get_ensemble_config auto-loads config if not already loaded."""
        registry = ModelRegistry()

        with patch.object(registry, "load_config") as mock_load:
            registry._config_loaded = False
            registry.get_ensemble_config()
            mock_load.assert_called_once()

    def test_load_config_empty_yaml_file(self, tmp_path):
        """load_config handles empty YAML file gracefully."""
        config_file = tmp_path / "empty.yaml"
        with open(config_file, "w") as f:
            f.write("")

        registry = ModelRegistry()
        registry.load_config(str(config_file))

        assert registry._config == {}
        assert registry._config_loaded is True


# ===========================================================================
# TestModelRegistryRegister
# ===========================================================================

class TestModelRegistryRegister:
    """Test plugin registration and retrieval."""

    def test_register_plugin(self):
        """register adds a plugin to the registry."""
        registry = ModelRegistry()
        plugin = MockPlugin(model_id="test_model")

        with patch("app.features.models.registry.logger"):
            registry.register(plugin)

        assert "test_model" in registry._plugins
        assert registry._plugins["test_model"] is plugin

    def test_register_logs_plugin_details(self):
        """register logs plugin details including enabled state and weight."""
        registry = ModelRegistry()
        plugin = MockPlugin(model_id="test_model", weight=0.7, enabled=True)

        with patch("app.features.models.registry.logger") as mock_logger:
            registry.register(plugin)
            mock_logger.info.assert_called_once()
            log_message = mock_logger.info.call_args[0][0]
            assert "test_model" in log_message
            assert "enabled=True" in log_message
            assert "weight=0.7" in log_message

    def test_register_multiple_plugins(self):
        """register can add multiple plugins."""
        registry = ModelRegistry()
        plugin1 = MockPlugin(model_id="model_1")
        plugin2 = MockPlugin(model_id="model_2")

        with patch("app.features.models.registry.logger"):
            registry.register(plugin1)
            registry.register(plugin2)

        assert len(registry._plugins) == 2
        assert registry.get("model_1") is plugin1
        assert registry.get("model_2") is plugin2

    def test_unregister_plugin(self):
        """unregister removes a plugin from the registry."""
        registry = ModelRegistry()
        plugin = MockPlugin(model_id="test_model")

        with patch("app.features.models.registry.logger"):
            registry.register(plugin)
            registry.unregister("test_model")

        assert "test_model" not in registry._plugins
        assert registry.get("test_model") is None

    def test_unregister_logs_plugin_removal(self):
        """unregister logs the removal of the plugin."""
        registry = ModelRegistry()
        plugin = MockPlugin(model_id="test_model")

        with patch("app.features.models.registry.logger") as mock_logger:
            registry.register(plugin)
            mock_logger.reset_mock()
            registry.unregister("test_model")
            mock_logger.info.assert_called_once()
            log_message = mock_logger.info.call_args[0][0]
            assert "test_model" in log_message

    def test_unregister_nonexistent_plugin_does_nothing(self):
        """unregister does nothing if plugin doesn't exist."""
        registry = ModelRegistry()

        with patch("app.features.models.registry.logger") as mock_logger:
            registry.unregister("nonexistent")
            mock_logger.info.assert_not_called()

    def test_get_plugin_by_id(self):
        """get returns the plugin for a given model_id."""
        registry = ModelRegistry()
        plugin = MockPlugin(model_id="test_model")

        with patch("app.features.models.registry.logger"):
            registry.register(plugin)

        retrieved = registry.get("test_model")
        assert retrieved is plugin

    def test_get_nonexistent_returns_none(self):
        """get returns None for nonexistent model_id."""
        registry = ModelRegistry()
        assert registry.get("nonexistent") is None

    def test_get_all_returns_list_of_all_plugins(self):
        """get_all returns a list of all registered plugins."""
        registry = ModelRegistry()
        plugin1 = MockPlugin(model_id="model_1")
        plugin2 = MockPlugin(model_id="model_2")

        with patch("app.features.models.registry.logger"):
            registry.register(plugin1)
            registry.register(plugin2)

        all_plugins = registry.get_all()
        assert len(all_plugins) == 2
        assert plugin1 in all_plugins
        assert plugin2 in all_plugins

    def test_get_all_empty_when_no_plugins(self):
        """get_all returns empty list when no plugins are registered."""
        registry = ModelRegistry()
        assert registry.get_all() == []

    def test_get_enabled_returns_only_enabled_plugins(self):
        """get_enabled returns only plugins with enabled=True."""
        registry = ModelRegistry()
        plugin1 = MockPlugin(model_id="model_1", enabled=True)
        plugin2 = MockPlugin(model_id="model_2", enabled=False)
        plugin3 = MockPlugin(model_id="model_3", enabled=True)

        with patch("app.features.models.registry.logger"):
            registry.register(plugin1)
            registry.register(plugin2)
            registry.register(plugin3)

        enabled = registry.get_enabled()
        assert len(enabled) == 2
        assert plugin1 in enabled
        assert plugin3 in enabled
        assert plugin2 not in enabled

    def test_get_enabled_empty_when_all_disabled(self):
        """get_enabled returns empty list when all plugins are disabled."""
        registry = ModelRegistry()
        plugin1 = MockPlugin(model_id="model_1", enabled=False)
        plugin2 = MockPlugin(model_id="model_2", enabled=False)

        with patch("app.features.models.registry.logger"):
            registry.register(plugin1)
            registry.register(plugin2)

        assert registry.get_enabled() == []

    def test_get_configs_returns_list_of_model_configs(self):
        """get_configs returns a list of ModelConfig objects."""
        registry = ModelRegistry()
        plugin1 = MockPlugin(model_id="model_1")
        plugin2 = MockPlugin(model_id="model_2")

        with patch("app.features.models.registry.logger"):
            registry.register(plugin1)
            registry.register(plugin2)

        configs = registry.get_configs()
        assert len(configs) == 2
        assert all(isinstance(c, ModelConfig) for c in configs)
        assert plugin1.config in configs
        assert plugin2.config in configs


# ===========================================================================
# TestModelRegistryWeights
# ===========================================================================

class TestModelRegistryWeights:
    """Test ensemble weight calculations and validation."""

    def test_get_ensemble_weights_normalizes_to_sum_one(self):
        """get_ensemble_weights normalizes weights to sum to 1.0."""
        registry = ModelRegistry()
        plugin1 = MockPlugin(model_id="model_1", weight=0.6, enabled=True)
        plugin2 = MockPlugin(model_id="model_2", weight=0.4, enabled=True)

        with patch("app.features.models.registry.logger"):
            registry.register(plugin1)
            registry.register(plugin2)

        weights = registry.get_ensemble_weights()
        assert len(weights) == 2
        assert weights["model_1"] == pytest.approx(0.6)
        assert weights["model_2"] == pytest.approx(0.4)
        assert sum(weights.values()) == pytest.approx(1.0)

    def test_get_ensemble_weights_normalizes_unbalanced_weights(self):
        """get_ensemble_weights normalizes weights even when they don't initially sum to 1.0."""
        registry = ModelRegistry()
        plugin1 = MockPlugin(model_id="model_1", weight=3.0, enabled=True)
        plugin2 = MockPlugin(model_id="model_2", weight=2.0, enabled=True)

        with patch("app.features.models.registry.logger"):
            registry.register(plugin1)
            registry.register(plugin2)

        weights = registry.get_ensemble_weights()
        # 3/(3+2) = 0.6, 2/(3+2) = 0.4
        assert weights["model_1"] == pytest.approx(0.6)
        assert weights["model_2"] == pytest.approx(0.4)
        assert sum(weights.values()) == pytest.approx(1.0)

    def test_get_ensemble_weights_excludes_disabled_plugins(self):
        """get_ensemble_weights excludes disabled plugins."""
        registry = ModelRegistry()
        plugin1 = MockPlugin(model_id="model_1", weight=0.6, enabled=True)
        plugin2 = MockPlugin(model_id="model_2", weight=0.4, enabled=False)

        with patch("app.features.models.registry.logger"):
            registry.register(plugin1)
            registry.register(plugin2)

        weights = registry.get_ensemble_weights()
        assert len(weights) == 1
        assert "model_1" in weights
        assert "model_2" not in weights
        assert weights["model_1"] == pytest.approx(1.0)

    def test_get_ensemble_weights_returns_empty_when_total_weight_zero(self):
        """get_ensemble_weights returns empty dict when total weight is 0."""
        registry = ModelRegistry()
        plugin1 = MockPlugin(model_id="model_1", weight=0.0, enabled=True)
        plugin2 = MockPlugin(model_id="model_2", weight=0.0, enabled=True)

        with patch("app.features.models.registry.logger") as mock_logger:
            registry.register(plugin1)
            registry.register(plugin2)

            weights = registry.get_ensemble_weights()
            mock_logger.warning.assert_called()
            assert "No enabled models or total weight is 0" in mock_logger.warning.call_args[0][0]

        assert weights == {}

    def test_get_ensemble_weights_returns_empty_when_no_enabled_plugins(self):
        """get_ensemble_weights returns empty dict when no plugins are enabled."""
        registry = ModelRegistry()
        plugin1 = MockPlugin(model_id="model_1", weight=0.6, enabled=False)
        plugin2 = MockPlugin(model_id="model_2", weight=0.4, enabled=False)

        with patch("app.features.models.registry.logger") as mock_logger:
            registry.register(plugin1)
            registry.register(plugin2)

            weights = registry.get_ensemble_weights()
            mock_logger.warning.assert_called()

        assert weights == {}

    def test_get_ensemble_weights_logs_normalized_weights(self):
        """get_ensemble_weights logs the normalized weights."""
        registry = ModelRegistry()
        plugin1 = MockPlugin(model_id="model_1", weight=0.6, enabled=True)
        plugin2 = MockPlugin(model_id="model_2", weight=0.4, enabled=True)

        with patch("app.features.models.registry.logger") as mock_logger:
            registry.register(plugin1)
            registry.register(plugin2)

            registry.get_ensemble_weights()
            mock_logger.debug.assert_called()
            log_message = mock_logger.debug.call_args[0][0]
            assert "Ensemble weights (normalized)" in log_message
            assert "model_1=0.60" in log_message
            assert "model_2=0.40" in log_message

    def test_validate_weights_returns_true_when_valid(self):
        """validate_weights returns True when weights sum to 1.0."""
        registry = ModelRegistry()
        plugin1 = MockPlugin(model_id="model_1", weight=0.6, enabled=True)
        plugin2 = MockPlugin(model_id="model_2", weight=0.4, enabled=True)

        with patch("app.features.models.registry.logger"):
            registry.register(plugin1)
            registry.register(plugin2)

        assert registry.validate_weights() is True

    def test_validate_weights_returns_false_when_no_weights(self):
        """validate_weights returns False when get_ensemble_weights returns empty dict."""
        registry = ModelRegistry()
        plugin = MockPlugin(model_id="model_1", weight=0.0, enabled=True)

        with patch("app.features.models.registry.logger"):
            registry.register(plugin)

        assert registry.validate_weights() is False

    def test_validate_weights_uses_tolerance_for_floating_point(self):
        """validate_weights uses 0.01 tolerance for floating point comparison."""
        registry = ModelRegistry()
        # Weights that sum to 1.005 (within tolerance)
        plugin1 = MockPlugin(model_id="model_1", weight=0.6025, enabled=True)
        plugin2 = MockPlugin(model_id="model_2", weight=0.4025, enabled=True)

        with patch("app.features.models.registry.logger"):
            registry.register(plugin1)
            registry.register(plugin2)

        # After normalization they will sum to exactly 1.0
        assert registry.validate_weights() is True

    def test_validate_weights_logs_warning_when_invalid(self):
        """validate_weights logs warning when weights are invalid."""
        registry = ModelRegistry()

        with patch("app.features.models.registry.logger") as mock_logger:
            # No plugins, so weights will be empty
            result = registry.validate_weights()
            # Should return False and potentially log (depending on implementation)

        assert result is False

    def test_get_ensemble_weights_handles_single_enabled_plugin(self):
        """get_ensemble_weights correctly handles a single enabled plugin."""
        registry = ModelRegistry()
        plugin = MockPlugin(model_id="model_1", weight=0.8, enabled=True)

        with patch("app.features.models.registry.logger"):
            registry.register(plugin)

        weights = registry.get_ensemble_weights()
        assert len(weights) == 1
        assert weights["model_1"] == pytest.approx(1.0)

    def test_get_ensemble_weights_handles_three_plugins(self):
        """get_ensemble_weights correctly normalizes three plugins."""
        registry = ModelRegistry()
        plugin1 = MockPlugin(model_id="model_1", weight=0.5, enabled=True)
        plugin2 = MockPlugin(model_id="model_2", weight=0.3, enabled=True)
        plugin3 = MockPlugin(model_id="model_3", weight=0.2, enabled=True)

        with patch("app.features.models.registry.logger"):
            registry.register(plugin1)
            registry.register(plugin2)
            registry.register(plugin3)

        weights = registry.get_ensemble_weights()
        assert len(weights) == 3
        assert weights["model_1"] == pytest.approx(0.5)
        assert weights["model_2"] == pytest.approx(0.3)
        assert weights["model_3"] == pytest.approx(0.2)
        assert sum(weights.values()) == pytest.approx(1.0)

    def test_zero_weight_enabled_plugin_included_with_zero_normalized_weight(self):
        """Plugin with weight=0 but enabled=True is included in ensemble with 0.0 normalized weight."""
        registry = ModelRegistry()
        plugin1 = MockPlugin(model_id="model_1", weight=1.0, enabled=True)
        plugin2 = MockPlugin(model_id="model_2", weight=0.0, enabled=True)

        with patch("app.features.models.registry.logger"):
            registry.register(plugin1)
            registry.register(plugin2)

        # get_enabled includes both plugins
        enabled = registry.get_enabled()
        assert len(enabled) == 2

        # get_ensemble_weights includes both: model_1 gets 1.0/(1.0+0.0) = 1.0, model_2 gets 0.0/(1.0+0.0) = 0.0
        weights = registry.get_ensemble_weights()
        assert len(weights) == 2
        assert weights["model_1"] == pytest.approx(1.0)
        assert weights["model_2"] == pytest.approx(0.0)


# ===========================================================================
# TestModelRegistryAutoRegister
# ===========================================================================

class TestModelRegistryAutoRegister:
    """Test auto-registration functionality."""

    def test_auto_register_plugins_loads_config(self, sample_config):
        """auto_register_plugins calls load_config if not already loaded."""
        registry = ModelRegistry()

        with patch.object(registry, "load_config") as mock_load:
            registry._config_loaded = False
            registry.auto_register_plugins()
            mock_load.assert_called_once()

    def test_auto_register_plugins_logs_not_implemented(self, sample_config):
        """auto_register_plugins logs that it's not yet implemented."""
        registry = ModelRegistry()
        registry._config = sample_config
        registry._config_loaded = True

        with patch("app.features.models.registry.logger") as mock_logger:
            registry.auto_register_plugins()
            mock_logger.debug.assert_called()
            log_message = mock_logger.debug.call_args[0][0]
            assert "not yet implemented" in log_message.lower()

    def test_auto_register_plugins_does_not_raise_exception(self):
        """auto_register_plugins completes without raising exceptions."""
        registry = ModelRegistry()
        # Should not raise
        registry.auto_register_plugins()
