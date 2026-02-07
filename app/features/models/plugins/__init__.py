"""Model Plugins Module"""
from .base import ModelPlugin, ModelConfig, ModelOutput, SignalType
from .model_a import ModelAPlugin
from .model_b import ModelBPlugin

__all__ = [
    "ModelPlugin",
    "ModelConfig",
    "ModelOutput",
    "SignalType",
    "ModelAPlugin",
    "ModelBPlugin",
]
