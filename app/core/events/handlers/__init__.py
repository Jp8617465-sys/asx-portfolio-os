"""Event Handlers - registered during app startup."""

import logging

logger = logging.getLogger(__name__)


def register_event_handlers() -> None:
    """
    Register all event handlers on application startup.

    This function subscribes event handlers to their respective event types.
    Handlers are registered with the event bus to enable event-driven architecture.

    Current handlers:
    - MODEL_DRIFT_DETECTED -> handle_drift_detected
    - SIGNAL_GENERATED -> handle_signal_generated
    - PORTFOLIO_CHANGED -> handle_portfolio_changed (Phase 3 Week 5)
    """
    # DEFERRED IMPORTS - only import when function is called, not at module level
    # This prevents circular import: handlers import from app.core, but app.core
    # imports this module, so we defer until after app.core is fully initialized
    from app.core.events import event_bus, EventType
    from .drift_handler import handle_drift_detected
    from .signal_handler import handle_signal_generated
    from .portfolio_handler import handle_portfolio_changed

    # Register drift detection handler
    event_bus.subscribe(EventType.MODEL_DRIFT_DETECTED, handle_drift_detected)

    # Register signal generation handler
    event_bus.subscribe(EventType.SIGNAL_GENERATED, handle_signal_generated)

    # Register portfolio change handler (Phase 3 Week 5)
    event_bus.subscribe(EventType.PORTFOLIO_CHANGED, handle_portfolio_changed)

    logger.info("✅ Event handlers registered successfully")


__all__ = ["register_event_handlers"]
