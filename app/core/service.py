"""
app/core/service.py
Base service class providing event publishing capability.
"""

from abc import ABC
from typing import Dict, Any, Optional
from datetime import datetime

from app.core.events.event_bus import event_bus, Event, EventType
from app.core import logger


class BaseService(ABC):
    """
    Abstract base service class with event publishing capability.

    This class provides a foundation for feature-specific service classes
    that contain business logic. It includes built-in event publishing
    functionality to enable event-driven architecture and cross-feature
    communication.

    All service classes should inherit from this base class to maintain
    consistent patterns for event handling and logging.

    Attributes:
        event_bus: Singleton instance of the event bus for publishing events

    Example:
        class SignalService(BaseService):
            def __init__(self):
                super().__init__()
                self.repo = SignalRepository()

            async def generate_signals(self, tickers: List[str]) -> List[Dict]:
                # Business logic here
                signals = self.repo.get_signals(tickers)

                # Publish event to notify other features
                await self.publish_event(
                    EventType.SIGNAL_GENERATED,
                    {"tickers": tickers, "count": len(signals)}
                )

                return signals
    """

    def __init__(self):
        """Initialize base service with event bus access."""
        self.event_bus = event_bus
        logger.debug(f"Initialized {self.__class__.__name__}")

    async def publish_event(
        self,
        event_type: EventType,
        payload: Dict[str, Any],
        source: Optional[str] = None,
        user_id: Optional[str] = None,
        correlation_id: Optional[str] = None
    ) -> None:
        """
        Publish an event to the event bus.

        This method creates and publishes an event that can be subscribed to
        by event handlers across the application. Events enable loose coupling
        between features and support real-time notifications.

        Args:
            event_type: Type of event from EventType enum (e.g., SIGNAL_GENERATED)
            payload: Dictionary containing event data (must be JSON-serializable)
            source: Optional identifier of the event source (defaults to class name)
            user_id: Optional user ID for user-specific events
            correlation_id: Optional correlation ID for tracking related events

        Raises:
            Exception: If event publishing fails (logged but not re-raised)

        Example:
            >>> # In a service method
            >>> await self.publish_event(
            ...     EventType.SIGNAL_GENERATED,
            ...     {
            ...         "model": "model_a",
            ...         "ticker": "BHP.AX",
            ...         "signal": "BUY",
            ...         "confidence": 0.85
            ...     },
            ...     user_id="user_123"
            ... )

            >>> # Publishing a portfolio change event
            >>> await self.publish_event(
            ...     EventType.PORTFOLIO_CHANGED,
            ...     {
            ...         "portfolio_id": 456,
            ...         "action": "upload",
            ...         "holdings_count": 10,
            ...         "total_value": 50000.00
            ...     },
            ...     user_id="user_123",
            ...     correlation_id="req_789"
            ... )
        """
        try:
            event = Event(
                type=event_type,
                payload=payload,
                timestamp=datetime.utcnow(),
                source=source or self.__class__.__name__,
                user_id=user_id,
                correlation_id=correlation_id
            )

            await self.event_bus.publish(event)

            logger.info(
                f"Published event: {event_type.value} from {event.source} "
                f"(event_id={event.event_id[:8]}...)"
            )
            logger.debug(f"Event payload: {payload}")

        except Exception as e:
            # Log error but don't re-raise to prevent event publishing from breaking
            # the main business logic flow
            logger.error(
                f"Failed to publish event {event_type.value} from "
                f"{source or self.__class__.__name__}: {e}"
            )

    def _log_operation(
        self,
        operation: str,
        details: Optional[Dict[str, Any]] = None,
        level: str = "info"
    ) -> None:
        """
        Helper method for consistent operation logging.

        Args:
            operation: Description of the operation being performed
            details: Optional dictionary with additional details
            level: Log level ('debug', 'info', 'warning', 'error')

        Example:
            >>> self._log_operation(
            ...     "Generating signals",
            ...     {"ticker_count": 50, "model": "model_a"},
            ...     level="info"
            ... )
        """
        log_message = f"{self.__class__.__name__}: {operation}"

        if details:
            detail_str = ", ".join([f"{k}={v}" for k, v in details.items()])
            log_message += f" ({detail_str})"

        log_func = getattr(logger, level.lower(), logger.info)
        log_func(log_message)
