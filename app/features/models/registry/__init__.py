"""Model Registry Module"""
from typing import Dict, List, Optional
from ..plugins.base import ModelPlugin, ModelConfig

class ModelRegistry:
    """Registry for managing model plugins."""
    _instance: Optional["ModelRegistry"] = None

    def __new__(cls) -> "ModelRegistry":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._plugins: Dict[str, ModelPlugin] = {}
        return cls._instance

    def register(self, plugin: ModelPlugin) -> None:
        self._plugins[plugin.config.model_id] = plugin

    def unregister(self, model_id: str) -> None:
        if model_id in self._plugins:
            del self._plugins[model_id]

    def get(self, model_id: str) -> Optional[ModelPlugin]:
        return self._plugins.get(model_id)

    def get_all(self) -> List[ModelPlugin]:
        return list(self._plugins.values())

    def get_enabled(self) -> List[ModelPlugin]:
        return [p for p in self._plugins.values() if p.is_enabled()]

    def get_configs(self) -> List[ModelConfig]:
        return [p.config for p in self._plugins.values()]

    def get_ensemble_weights(self) -> Dict[str, float]:
        enabled = self.get_enabled()
        total = sum(p.get_weight() for p in enabled)
        if total == 0:
            return {}
        return {p.config.model_id: p.get_weight() / total for p in enabled}

model_registry = ModelRegistry()
__all__ = ["ModelRegistry", "model_registry"]
