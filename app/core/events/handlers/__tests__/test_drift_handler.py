"""
app/core/events/handlers/__tests__/test_drift_handler.py
Unit tests for drift detection event handler following TDD methodology.
"""

import pytest
from unittest.mock import Mock, MagicMock, patch, AsyncMock, call
from datetime import datetime

from app.core.events import Event, EventType
from app.core.events.handlers.drift_handler import handle_drift_detected


@pytest.fixture
def mock_logger():
    """Mock logger for testing log outputs."""
    with patch('app.core.events.handlers.drift_handler.logger') as mock_log:
        yield mock_log


@pytest.fixture
def drift_event():
    """Create a sample drift detection event."""
    return Event(
        type=EventType.MODEL_DRIFT_DETECTED,
        payload={
            "model_id": "model_a_v1_1",
            "drift_score": 0.85,
            "threshold": 0.7,
            "features_drifted": ["feature_1", "feature_2"],
            "timestamp": datetime.utcnow().isoformat()
        },
        source="drift_monitor",
        user_id=None
    )


@pytest.fixture
def drift_event_with_retraining():
    """Create a drift event that should trigger retraining."""
    return Event(
        type=EventType.MODEL_DRIFT_DETECTED,
        payload={
            "model_id": "model_a_v1_1",
            "drift_score": 0.95,
            "threshold": 0.7,
            "features_drifted": ["feature_1", "feature_2", "feature_3"],
            "auto_retrain": True,
            "timestamp": datetime.utcnow().isoformat()
        },
        source="drift_monitor",
        user_id=None
    )


class TestHandleDriftDetected:
    """Test suite for handle_drift_detected handler."""

    @pytest.mark.asyncio
    async def test_handle_drift_detected_logs_warning(self, drift_event, mock_logger):
        """Test that drift detection logs a warning message."""
        # Act
        await handle_drift_detected(drift_event)
        
        # Assert
        mock_logger.warning.assert_called_once()
        call_args = mock_logger.warning.call_args[0][0]
        assert "model_a_v1_1" in call_args
        assert "0.85" in call_args or "drift" in call_args.lower()

    @pytest.mark.asyncio
    async def test_handle_drift_detected_logs_drift_score(self, drift_event, mock_logger):
        """Test that drift score is included in log message."""
        # Act
        await handle_drift_detected(drift_event)
        
        # Assert
        mock_logger.warning.assert_called_once()
        log_message = mock_logger.warning.call_args[0][0]
        assert "0.85" in log_message or str(drift_event.payload["drift_score"]) in log_message

    @pytest.mark.asyncio
    @patch('app.core.events.handlers.drift_handler.notify_admins')
    async def test_handle_drift_detected_notifies_admins(
        self, mock_notify_admins, drift_event, mock_logger
    ):
        """Test that admin users are notified of drift detection."""
        # Arrange
        mock_notify_admins.return_value = AsyncMock()
        
        # Act
        await handle_drift_detected(drift_event)
        
        # Assert
        mock_notify_admins.assert_called_once()
        call_args = mock_notify_admins.call_args[1]
        assert call_args["model_id"] == "model_a_v1_1"
        assert call_args["drift_score"] == 0.85

    @pytest.mark.asyncio
    @patch('app.core.events.handlers.drift_handler.trigger_model_retraining')
    async def test_handle_drift_detected_triggers_retraining_when_configured(
        self, mock_trigger_retraining, drift_event_with_retraining, mock_logger
    ):
        """Test that model retraining is triggered when auto_retrain is True."""
        # Arrange
        mock_trigger_retraining.return_value = AsyncMock()
        
        # Act
        await handle_drift_detected(drift_event_with_retraining)
        
        # Assert
        mock_trigger_retraining.assert_called_once_with("model_a_v1_1")

    @pytest.mark.asyncio
    @patch('app.core.events.handlers.drift_handler.trigger_model_retraining')
    async def test_handle_drift_detected_does_not_trigger_retraining_when_not_configured(
        self, mock_trigger_retraining, drift_event, mock_logger
    ):
        """Test that model retraining is NOT triggered when auto_retrain is False or missing."""
        # Act
        await handle_drift_detected(drift_event)
        
        # Assert
        mock_trigger_retraining.assert_not_called()

    @pytest.mark.asyncio
    async def test_handle_drift_detected_handles_missing_fields_gracefully(self, mock_logger):
        """Test that handler works even with minimal payload."""
        # Arrange
        minimal_event = Event(
            type=EventType.MODEL_DRIFT_DETECTED,
            payload={
                "model_id": "test_model",
                "drift_score": 0.8
            },
            source="test"
        )
        
        # Act
        await handle_drift_detected(minimal_event)
        
        # Assert - should log warning without crashing
        mock_logger.warning.assert_called_once()

    @pytest.mark.asyncio
    @patch('app.core.events.handlers.drift_handler.notify_admins')
    async def test_handle_drift_detected_includes_features_in_notification(
        self, mock_notify_admins, drift_event, mock_logger
    ):
        """Test that drifted features are included in admin notification."""
        # Arrange
        mock_notify_admins.return_value = AsyncMock()
        
        # Act
        await handle_drift_detected(drift_event)
        
        # Assert
        call_args = mock_notify_admins.call_args[1]
        assert "features_drifted" in call_args
        assert call_args["features_drifted"] == ["feature_1", "feature_2"]

    @pytest.mark.asyncio
    @patch('app.core.events.handlers.drift_handler.notify_admins')
    @patch('app.core.events.handlers.drift_handler.trigger_model_retraining')
    async def test_handle_drift_detected_full_workflow(
        self, mock_trigger_retraining, mock_notify_admins, 
        drift_event_with_retraining, mock_logger
    ):
        """Test complete drift detection workflow: log + notify + retrain."""
        # Arrange
        mock_notify_admins.return_value = AsyncMock()
        mock_trigger_retraining.return_value = AsyncMock()
        
        # Act
        await handle_drift_detected(drift_event_with_retraining)
        
        # Assert - all three actions should occur
        mock_logger.warning.assert_called_once()
        mock_notify_admins.assert_called_once()
        mock_trigger_retraining.assert_called_once()
