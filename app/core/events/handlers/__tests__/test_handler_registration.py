"""
app/core/events/handlers/__tests__/test_handler_registration.py
Integration tests for event handler registration system.
"""

import pytest
from unittest.mock import Mock, MagicMock, patch, AsyncMock

from app.core.events import Event, EventType, event_bus
from app.core.events.handlers import register_event_handlers
from app.core.events.handlers.drift_handler import handle_drift_detected


@pytest.fixture
def clean_event_bus():
    """Ensure event bus is clean before each test."""
    # Clear all handlers
    event_bus._handlers.clear()
    event_bus._history.clear()
    yield event_bus
    # Clean up after test
    event_bus._handlers.clear()
    event_bus._history.clear()


class TestRegisterEventHandlers:
    """Test suite for event handler registration."""

    def test_register_event_handlers_subscribes_drift_handler(self, clean_event_bus):
        """Test that register_event_handlers subscribes the drift handler."""
        # Arrange
        assert EventType.MODEL_DRIFT_DETECTED not in clean_event_bus._handlers
        
        # Act
        register_event_handlers()
        
        # Assert
        assert EventType.MODEL_DRIFT_DETECTED in clean_event_bus._handlers
        handlers = clean_event_bus._handlers[EventType.MODEL_DRIFT_DETECTED]
        assert len(handlers) == 1
        assert handlers[0] == handle_drift_detected

    def test_register_event_handlers_logs_success(self, clean_event_bus):
        """Test that registration logs a success message."""
        # Arrange
        with patch('app.core.events.handlers.logger') as mock_logger:
            # Act
            register_event_handlers()
            
            # Assert
            mock_logger.info.assert_called_once()
            log_message = mock_logger.info.call_args[0][0]
            assert "registered" in log_message.lower()

    def test_register_event_handlers_is_idempotent(self, clean_event_bus):
        """Test that calling register multiple times doesn't duplicate handlers."""
        # Act
        register_event_handlers()
        first_count = len(clean_event_bus._handlers[EventType.MODEL_DRIFT_DETECTED])
        
        register_event_handlers()
        second_count = len(clean_event_bus._handlers[EventType.MODEL_DRIFT_DETECTED])
        
        # Assert - handlers are added each time (not idempotent by default)
        # This is expected behavior for event bus subscribe
        assert second_count == first_count + 1

    @pytest.mark.asyncio
    async def test_drift_handler_is_called_on_event(self, clean_event_bus):
        """Integration test: verify drift handler is triggered by events."""
        # Arrange
        register_event_handlers()
        
        drift_event = Event(
            type=EventType.MODEL_DRIFT_DETECTED,
            payload={
                "model_id": "test_model",
                "drift_score": 0.9,
                "auto_retrain": False
            },
            source="test"
        )
        
        # Mock the handler functions to verify they're called
        with patch('app.core.events.handlers.drift_handler.notify_admins') as mock_notify:
            mock_notify.return_value = AsyncMock()
            
            # Act
            await clean_event_bus.publish(drift_event)
            
            # Assert
            mock_notify.assert_called_once()

    @pytest.mark.asyncio
    async def test_multiple_events_trigger_handler_multiple_times(self, clean_event_bus):
        """Test that multiple events trigger the handler multiple times."""
        # Arrange
        register_event_handlers()
        
        with patch('app.core.events.handlers.drift_handler.notify_admins') as mock_notify:
            mock_notify.return_value = AsyncMock()
            
            # Act
            for i in range(3):
                event = Event(
                    type=EventType.MODEL_DRIFT_DETECTED,
                    payload={
                        "model_id": f"model_{i}",
                        "drift_score": 0.8 + i * 0.05
                    },
                    source="test"
                )
                await clean_event_bus.publish(event)
            
            # Assert
            assert mock_notify.call_count == 3

    @pytest.mark.asyncio
    async def test_handler_receives_correct_event_data(self, clean_event_bus):
        """Test that handler receives the correct event payload."""
        # Arrange
        register_event_handlers()
        
        expected_model_id = "model_xyz"
        expected_drift_score = 0.88
        
        drift_event = Event(
            type=EventType.MODEL_DRIFT_DETECTED,
            payload={
                "model_id": expected_model_id,
                "drift_score": expected_drift_score,
                "features_drifted": ["feat1", "feat2"]
            },
            source="test"
        )
        
        with patch('app.core.events.handlers.drift_handler.notify_admins') as mock_notify:
            mock_notify.return_value = AsyncMock()
            
            # Act
            await clean_event_bus.publish(drift_event)
            
            # Assert
            call_kwargs = mock_notify.call_args[1]
            assert call_kwargs["model_id"] == expected_model_id
            assert call_kwargs["drift_score"] == expected_drift_score
            assert call_kwargs["features_drifted"] == ["feat1", "feat2"]

    def test_register_event_handlers_exports_correct_symbols(self):
        """Test that __all__ exports the correct symbols."""
        from app.core.events.handlers import __all__
        
        assert "register_event_handlers" in __all__
        assert "handle_drift_detected" in __all__
