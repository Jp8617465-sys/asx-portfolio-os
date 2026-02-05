"""Event Bus for pub/sub within the application."""
import asyncio
import logging
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List, Optional
import uuid

logger = logging.getLogger(__name__)

class EventType(str, Enum):
    SIGNAL_GENERATED = "signal.generated"
    SIGNAL_CHANGED = "signal.changed"
    PRICE_UPDATED = "price.updated"
    MODEL_DRIFT_DETECTED = "model.drift_detected"
    PORTFOLIO_CHANGED = "portfolio.changed"
    ALERT_TRIGGERED = "alert.triggered"
    NEWS_INGESTED = "news.ingested"
    SENTIMENT_CHANGED = "sentiment.changed"
    JOB_COMPLETED = "job.completed"

@dataclass
class Event:
    type: EventType
    payload: Dict[str, Any]
    timestamp: datetime = field(default_factory=datetime.utcnow)
    source: str = "unknown"
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    correlation_id: Optional[str] = None
    user_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "event_id": self.event_id, "type": self.type.value,
            "payload": self.payload, "timestamp": self.timestamp.isoformat(),
            "source": self.source, "user_id": self.user_id,
        }

class EventBus:
    """In-memory event bus for pub/sub."""
    _instance: Optional["EventBus"] = None

    def __new__(cls) -> "EventBus":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._handlers: Dict[EventType, List[Callable]] = defaultdict(list)
            cls._instance._history: List[Event] = []
        return cls._instance

    def subscribe(self, event_type: EventType, handler: Callable) -> Callable[[], None]:
        self._handlers[event_type].append(handler)
        def unsubscribe():
            if handler in self._handlers[event_type]:
                self._handlers[event_type].remove(handler)
        return unsubscribe

    async def publish(self, event: Event) -> None:
        self._history.append(event)
        if len(self._history) > 1000:
            self._history = self._history[-1000:]
        for handler in self._handlers.get(event.type, []):
            try:
                if asyncio.iscoroutinefunction(handler):
                    await handler(event)
                else:
                    handler(event)
            except Exception as e:
                logger.error(f"Event handler error: {e}")

    def get_history(self, event_type: Optional[EventType] = None, limit: int = 100) -> List[Event]:
        events = self._history
        if event_type:
            events = [e for e in events if e.type == event_type]
        return events[-limit:]

event_bus = EventBus()
