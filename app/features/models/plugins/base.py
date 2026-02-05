"""Base class for ML model plugins."""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import date
from typing import Any, Dict, List, Literal, Optional

SignalType = Literal['STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL']

@dataclass
class ModelConfig:
    """Configuration for a model plugin."""
    model_id: str
    version: str
    weight_in_ensemble: float = 0.0
    enabled: bool = True
    requires_features: List[str] = field(default_factory=list)
    display_name: str = ""

    def __post_init__(self):
        if not self.display_name:
            self.display_name = self.model_id.replace("_", " ").title()

@dataclass
class ModelOutput:
    """Standardized output from any model."""
    symbol: str
    signal: SignalType
    confidence: float
    expected_return: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    rank: Optional[int] = None
    generated_at: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "symbol": self.symbol, "signal": self.signal, "confidence": self.confidence,
            "expected_return": self.expected_return, "metadata": self.metadata,
            "rank": self.rank, "generated_at": self.generated_at,
        }

class ModelPlugin(ABC):
    """Abstract base class for ML model plugins."""

    @property
    @abstractmethod
    def config(self) -> ModelConfig:
        pass

    @abstractmethod
    async def generate_signals(self, symbols: List[str], as_of: date) -> List[ModelOutput]:
        pass

    @abstractmethod
    async def get_signal(self, symbol: str, as_of: Optional[date] = None) -> Optional[ModelOutput]:
        pass

    @abstractmethod
    def explain(self, symbol: str) -> Dict[str, Any]:
        pass

    def validate_features(self, features: Dict[str, Any]) -> bool:
        return all(f in features for f in self.config.requires_features)

    def is_enabled(self) -> bool:
        return self.config.enabled

    def get_weight(self) -> float:
        return self.config.weight_in_ensemble if self.is_enabled() else 0.0
