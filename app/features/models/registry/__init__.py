"""Model Registry Module"""
import os
from typing import Dict, List, Optional
import yaml

from app.core import logger, PROJECT_ROOT
from ..plugins.base import ModelPlugin, ModelConfig


class ModelRegistry:
    """
    Registry for managing model plugins.

    The registry maintains a singleton instance that tracks all registered
    model plugins. It provides methods for:
    - Registering/unregistering plugins
    - Loading configuration from YAML
    - Retrieving enabled models
    - Calculating normalized ensemble weights

    Configuration is loaded from /config/models.yaml on initialization.
    """
    _instance: Optional["ModelRegistry"] = None

    def __new__(cls) -> "ModelRegistry":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._plugins: Dict[str, ModelPlugin] = {}
            cls._instance._config: Dict = {}
            cls._instance._config_loaded = False
        return cls._instance

    def load_config(self, config_path: Optional[str] = None) -> None:
        """
        Load model configuration from YAML file.

        The configuration file defines:
        - Model weights for ensemble
        - Enable/disable flags
        - Model versions
        - Feature requirements
        - Performance metrics

        Args:
            config_path: Path to models.yaml (defaults to /config/models.yaml)

        Raises:
            FileNotFoundError: If config file doesn't exist
            yaml.YAMLError: If config file is invalid YAML
        """
        if config_path is None:
            config_path = os.path.join(PROJECT_ROOT, "config", "models.yaml")

        if not os.path.exists(config_path):
            logger.warning(f"Model config not found at {config_path}, using defaults")
            self._config = {"models": {}, "ensemble": {}}
            return

        try:
            with open(config_path, "r") as f:
                self._config = yaml.safe_load(f) or {}

            logger.info(f"Loaded model config from {config_path}")
            logger.debug(f"Config contains {len(self._config.get('models', {}))} model definitions")
            self._config_loaded = True

        except Exception as e:
            logger.error(f"Failed to load model config from {config_path}: {e}")
            self._config = {"models": {}, "ensemble": {}}

    def get_model_config(self, model_id: str) -> Optional[Dict]:
        """
        Get configuration for a specific model from YAML.

        Args:
            model_id: Model identifier (e.g., "model_a")

        Returns:
            Dictionary with model config if found, else None

        Example:
            >>> config = registry.get_model_config("model_a")
            >>> config["enabled"]  # True
            >>> config["weight"]  # 0.6
        """
        if not self._config_loaded:
            self.load_config()

        return self._config.get("models", {}).get(model_id)

    def get_ensemble_config(self) -> Dict:
        """
        Get ensemble-level configuration.

        Returns:
            Dictionary with ensemble settings:
            - conflict_strategy: How to resolve model disagreements
            - min_agreement: Minimum agreement threshold
            - min_confidence: Minimum confidence for signals
            - flag_conflicts: Whether to flag conflicting signals

        Example:
            >>> config = registry.get_ensemble_config()
            >>> config["conflict_strategy"]  # "weighted_majority"
            >>> config["min_confidence"]  # 0.6
        """
        if not self._config_loaded:
            self.load_config()

        return self._config.get("ensemble", {})

    def register(self, plugin: ModelPlugin) -> None:
        """
        Register a model plugin.

        Args:
            plugin: ModelPlugin instance to register
        """
        self._plugins[plugin.config.model_id] = plugin
        logger.info(
            f"Registered plugin: {plugin.config.model_id} "
            f"(enabled={plugin.is_enabled()}, weight={plugin.get_weight()})"
        )

    def unregister(self, model_id: str) -> None:
        """
        Unregister a model plugin.

        Args:
            model_id: Model identifier to remove
        """
        if model_id in self._plugins:
            del self._plugins[model_id]
            logger.info(f"Unregistered plugin: {model_id}")

    def get(self, model_id: str) -> Optional[ModelPlugin]:
        """
        Get a specific model plugin by ID.

        Args:
            model_id: Model identifier

        Returns:
            ModelPlugin instance if registered, else None
        """
        return self._plugins.get(model_id)

    def get_all(self) -> List[ModelPlugin]:
        """
        Get all registered model plugins.

        Returns:
            List of all ModelPlugin instances
        """
        return list(self._plugins.values())

    def get_enabled(self) -> List[ModelPlugin]:
        """
        Get only enabled model plugins.

        Returns:
            List of enabled ModelPlugin instances
        """
        return [p for p in self._plugins.values() if p.is_enabled()]

    def get_configs(self) -> List[ModelConfig]:
        """
        Get configuration objects for all registered models.

        Returns:
            List of ModelConfig objects
        """
        return [p.config for p in self._plugins.values()]

    def get_ensemble_weights(self) -> Dict[str, float]:
        """
        Get normalized ensemble weights for enabled models.

        Weights are normalized to sum to 1.0 across all enabled models.
        If no models are enabled or total weight is 0, returns empty dict.

        Returns:
            Dictionary mapping model_id to normalized weight

        Example:
            >>> registry.get_ensemble_weights()
            {"model_a": 0.6, "model_b": 0.4}
        """
        enabled = self.get_enabled()
        total = sum(p.get_weight() for p in enabled)

        if total == 0:
            logger.warning("No enabled models or total weight is 0")
            return {}

        weights = {p.config.model_id: p.get_weight() / total for p in enabled}

        logger.debug(
            f"Ensemble weights (normalized): "
            f"{', '.join(f'{k}={v:.2f}' for k, v in weights.items())}"
        )

        return weights

    def validate_weights(self) -> bool:
        """
        Validate that ensemble weights sum to 1.0 (within tolerance).

        Returns:
            True if weights are valid, False otherwise
        """
        weights = self.get_ensemble_weights()
        if not weights:
            return False

        total = sum(weights.values())
        is_valid = abs(total - 1.0) < 0.01  # Tolerance for floating point

        if not is_valid:
            logger.warning(f"Ensemble weights sum to {total:.4f}, expected 1.0")

        return is_valid

    def auto_register_plugins(self) -> None:
        """
        Auto-discover and register plugins from config.

        This method reads the models.yaml config and attempts to:
        1. Import the corresponding plugin module
        2. Instantiate the plugin with config values
        3. Register it in the registry

        Note: Currently requires manual import. Future enhancement could
        use dynamic imports based on config.
        """
        if not self._config_loaded:
            self.load_config()

        # TODO: Implement dynamic plugin discovery
        # For now, plugins must be manually imported and registered
        logger.debug("Auto-registration not yet implemented. Register plugins manually.")


model_registry = ModelRegistry()
__all__ = ["ModelRegistry", "model_registry"]
