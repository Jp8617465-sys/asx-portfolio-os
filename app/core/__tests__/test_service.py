"""
app/core/__tests__/test_service.py
Comprehensive unit tests for BaseService following TDD best practices.
"""

import pytest
from unittest.mock import Mock, MagicMock, patch, AsyncMock
from datetime import datetime

from app.core.service import BaseService
from app.core.events.event_bus import Event, EventType


class TestService(BaseService):
    """Concrete implementation of BaseService for testing."""
    pass


@pytest.fixture
def mock_event_bus():
    """Mock event bus."""
    mock_bus = MagicMock()
    mock_bus.publish = AsyncMock()
    with patch('app.core.service.event_bus', mock_bus):
        yield mock_bus


@pytest.fixture
def mock_logger():
    """Mock logger."""
    with patch('app.core.service.logger') as mock_log:
        yield mock_log


@pytest.fixture
def service(mock_event_bus):
    """Create a test service instance."""
    return TestService()


class TestBaseServiceInit:
    """Test BaseService initialization."""

    def test_init_sets_event_bus(self, mock_event_bus, mock_logger):
        """Test that init sets event_bus correctly."""
        service = TestService()
        assert service.event_bus is not None

    def test_init_logs_initialization(self, mock_event_bus, mock_logger):
        """Test that init logs the initialization."""
        service = TestService()
        mock_logger.debug.assert_called_once()
        assert 'TestService' in str(mock_logger.debug.call_args)


class TestPublishEvent:
    """Test publish_event method."""

    @pytest.mark.asyncio
    async def test_publish_event_basic(self, service, mock_event_bus, mock_logger):
        """Test publishing a basic event."""
        # Setup
        event_type = EventType.SIGNAL_GENERATED
        payload = {"ticker": "BHP.AX", "signal": "BUY"}

        # Execute
        await service.publish_event(event_type, payload)

        # Verify
        mock_event_bus.publish.assert_called_once()
        call_args = mock_event_bus.publish.call_args
        published_event = call_args[0][0]

        assert isinstance(published_event, Event)
        assert published_event.type == event_type
        assert published_event.payload == payload
        assert published_event.source == 'TestService'
        assert isinstance(published_event.timestamp, datetime)
        assert published_event.event_id is not None

        # Verify logging
        mock_logger.info.assert_called_once()
        mock_logger.debug.assert_called_once()

    @pytest.mark.asyncio
    async def test_publish_event_with_all_params(self, service, mock_event_bus, mock_logger):
        """Test publishing event with all optional parameters."""
        # Setup
        event_type = EventType.PORTFOLIO_CHANGED
        payload = {"portfolio_id": 123}
        source = "CustomSource"
        user_id = "user_456"
        correlation_id = "corr_789"

        # Execute
        await service.publish_event(
            event_type,
            payload,
            source=source,
            user_id=user_id,
            correlation_id=correlation_id
        )

        # Verify
        mock_event_bus.publish.assert_called_once()
        published_event = mock_event_bus.publish.call_args[0][0]

        assert published_event.type == event_type
        assert published_event.payload == payload
        assert published_event.source == source
        assert published_event.user_id == user_id
        assert published_event.correlation_id == correlation_id

    @pytest.mark.asyncio
    async def test_publish_event_default_source(self, service, mock_event_bus, mock_logger):
        """Test that source defaults to class name."""
        # Execute
        await service.publish_event(EventType.SIGNAL_GENERATED, {})

        # Verify
        published_event = mock_event_bus.publish.call_args[0][0]
        assert published_event.source == 'TestService'

    @pytest.mark.asyncio
    async def test_publish_event_complex_payload(self, service, mock_event_bus, mock_logger):
        """Test publishing event with complex payload."""
        # Setup
        complex_payload = {
            "model": "model_a",
            "signals": [
                {"ticker": "BHP.AX", "score": 0.95},
                {"ticker": "CBA.AX", "score": 0.87}
            ],
            "metadata": {
                "version": "v1.2.0",
                "timestamp": "2024-01-15T10:00:00"
            }
        }

        # Execute
        await service.publish_event(EventType.SIGNAL_GENERATED, complex_payload)

        # Verify
        published_event = mock_event_bus.publish.call_args[0][0]
        assert published_event.payload == complex_payload
        assert len(published_event.payload["signals"]) == 2

    @pytest.mark.asyncio
    async def test_publish_event_different_event_types(self, service, mock_event_bus, mock_logger):
        """Test publishing different event types."""
        event_types = [
            EventType.SIGNAL_GENERATED,
            EventType.PORTFOLIO_CHANGED,
            EventType.MODEL_DRIFT_DETECTED,
            EventType.JOB_COMPLETED,
        ]

        for event_type in event_types:
            mock_event_bus.reset_mock()

            # Execute
            await service.publish_event(event_type, {"test": "data"})

            # Verify
            mock_event_bus.publish.assert_called_once()
            published_event = mock_event_bus.publish.call_args[0][0]
            assert published_event.type == event_type


class TestPublishEventErrorHandling:
    """Test error handling in publish_event."""

    @pytest.mark.asyncio
    async def test_publish_event_logs_error_on_failure(self, service, mock_event_bus, mock_logger):
        """Test that event publishing errors are logged but not re-raised."""
        # Setup
        mock_event_bus.publish.side_effect = Exception("Event bus failed")

        # Execute - should not raise exception
        await service.publish_event(EventType.SIGNAL_GENERATED, {"test": "data"})

        # Verify
        mock_logger.error.assert_called_once()
        assert "Failed to publish event" in str(mock_logger.error.call_args)

    @pytest.mark.asyncio
    async def test_publish_event_error_does_not_break_flow(self, service, mock_event_bus, mock_logger):
        """Test that event publish failure doesn't break business logic flow."""
        # Setup
        mock_event_bus.publish.side_effect = Exception("Event bus failed")

        # Execute - should complete without raising
        try:
            await service.publish_event(EventType.SIGNAL_GENERATED, {"test": "data"})
            completed = True
        except Exception:
            completed = False

        # Verify
        assert completed is True
        mock_logger.error.assert_called_once()

    @pytest.mark.asyncio
    async def test_publish_event_handles_event_creation_error(self, service, mock_event_bus, mock_logger):
        """Test handling of errors during event creation."""
        # Setup - force an error during Event creation
        with patch('app.core.service.Event', side_effect=Exception("Event creation failed")):
            # Execute
            await service.publish_event(EventType.SIGNAL_GENERATED, {"test": "data"})

            # Verify error is logged
            mock_logger.error.assert_called_once()


class TestLogOperation:
    """Test _log_operation helper method."""

    def test_log_operation_info_level(self, service, mock_logger):
        """Test logging operation at info level."""
        # Execute
        service._log_operation("Test operation", level="info")

        # Verify
        mock_logger.info.assert_called_once()
        log_message = str(mock_logger.info.call_args[0][0])
        assert "TestService" in log_message
        assert "Test operation" in log_message

    def test_log_operation_with_details(self, service, mock_logger):
        """Test logging operation with details."""
        # Setup
        details = {"ticker": "BHP.AX", "count": 10}

        # Execute
        service._log_operation("Processing signals", details=details, level="info")

        # Verify
        mock_logger.info.assert_called_once()
        log_message = str(mock_logger.info.call_args[0][0])
        assert "Processing signals" in log_message
        assert "ticker=BHP.AX" in log_message or "count=10" in log_message

    def test_log_operation_debug_level(self, service, mock_logger):
        """Test logging operation at debug level."""
        # Execute
        service._log_operation("Debug operation", level="debug")

        # Verify
        mock_logger.debug.assert_called_once()

    def test_log_operation_warning_level(self, service, mock_logger):
        """Test logging operation at warning level."""
        # Execute
        service._log_operation("Warning operation", level="warning")

        # Verify
        mock_logger.warning.assert_called_once()

    def test_log_operation_error_level(self, service, mock_logger):
        """Test logging operation at error level."""
        # Execute
        service._log_operation("Error operation", level="error")

        # Verify
        mock_logger.error.assert_called_once()

    def test_log_operation_default_to_info(self, service, mock_logger):
        """Test logging operation defaults to info level."""
        # Execute
        service._log_operation("Default operation")

        # Verify
        mock_logger.info.assert_called_once()

    def test_log_operation_invalid_level_defaults_to_info(self, service, mock_logger):
        """Test that invalid log level gets handled gracefully."""
        # Execute - should not raise an error
        try:
            service._log_operation("Test operation", level="invalid_level")
            handled_gracefully = True
        except Exception:
            handled_gracefully = False

        # Verify - should complete without error
        assert handled_gracefully

    def test_log_operation_multiple_details(self, service, mock_logger):
        """Test logging operation with multiple detail items."""
        # Setup
        details = {
            "model": "model_a",
            "version": "v1.2.0",
            "signals": 50,
            "accuracy": 0.85
        }

        # Execute
        service._log_operation("Model run completed", details=details)

        # Verify
        mock_logger.info.assert_called_once()
        log_message = str(mock_logger.info.call_args[0][0])
        assert "model=model_a" in log_message or "model_a" in log_message


class TestEventPublishingResilience:
    """Test event publishing resilience patterns."""

    @pytest.mark.asyncio
    async def test_multiple_events_published(self, service, mock_event_bus, mock_logger):
        """Test publishing multiple events in sequence."""
        # Execute
        await service.publish_event(EventType.SIGNAL_GENERATED, {"count": 1})
        await service.publish_event(EventType.PORTFOLIO_CHANGED, {"count": 2})
        await service.publish_event(EventType.JOB_COMPLETED, {"count": 3})

        # Verify
        assert mock_event_bus.publish.call_count == 3

    @pytest.mark.asyncio
    async def test_event_failure_doesnt_affect_subsequent_events(self, service, mock_event_bus, mock_logger):
        """Test that one event failure doesn't prevent subsequent events."""
        # Setup - first call fails, second succeeds
        mock_event_bus.publish.side_effect = [
            Exception("First event failed"),
            None  # Second succeeds
        ]

        # Execute
        await service.publish_event(EventType.SIGNAL_GENERATED, {"event": 1})
        await service.publish_event(EventType.SIGNAL_GENERATED, {"event": 2})

        # Verify both were attempted
        assert mock_event_bus.publish.call_count == 2
        # First failure was logged
        mock_logger.error.assert_called()

    @pytest.mark.asyncio
    async def test_event_payload_not_mutated(self, service, mock_event_bus, mock_logger):
        """Test that event payload is not mutated during publishing."""
        # Setup
        original_payload = {"ticker": "BHP.AX", "signal": "BUY"}
        payload_copy = original_payload.copy()

        # Execute
        await service.publish_event(EventType.SIGNAL_GENERATED, original_payload)

        # Verify payload unchanged
        assert original_payload == payload_copy


class TestServiceIntegration:
    """Integration-style tests for service patterns."""

    @pytest.mark.asyncio
    async def test_service_workflow_with_events(self, service, mock_event_bus, mock_logger):
        """Test typical service workflow with event publishing."""
        # Simulate a service method that publishes events

        # Start operation
        service._log_operation("Starting workflow", level="info")

        # Publish start event
        await service.publish_event(
            EventType.JOB_COMPLETED,
            {"status": "started", "job_id": "123"}
        )

        # Publish completion event
        await service.publish_event(
            EventType.SIGNAL_GENERATED,
            {"status": "completed", "results": 50}
        )

        # Verify
        assert mock_event_bus.publish.call_count == 2
        assert mock_logger.info.call_count >= 3  # Init + log_operation + 2 event publishes

    @pytest.mark.asyncio
    async def test_service_with_user_context(self, service, mock_event_bus, mock_logger):
        """Test service publishing events with user context."""
        user_id = "user_789"
        correlation_id = "req_abc123"

        # Execute
        await service.publish_event(
            EventType.PORTFOLIO_CHANGED,
            {"action": "upload", "holdings": 10},
            user_id=user_id,
            correlation_id=correlation_id
        )

        # Verify
        published_event = mock_event_bus.publish.call_args[0][0]
        assert published_event.user_id == user_id
        assert published_event.correlation_id == correlation_id

    def test_service_inherits_correctly(self, service, mock_event_bus):
        """Test that service inherits from BaseService correctly."""
        assert isinstance(service, BaseService)
        assert hasattr(service, 'event_bus')
        assert hasattr(service, 'publish_event')
        assert hasattr(service, '_log_operation')


class TestConcurrentEventPublishing:
    """Test concurrent event publishing scenarios."""

    @pytest.mark.asyncio
    async def test_concurrent_event_publishing(self, service, mock_event_bus, mock_logger):
        """Test publishing multiple events concurrently."""
        import asyncio

        # Setup
        payloads = [{"id": i} for i in range(10)]

        # Execute
        tasks = [
            service.publish_event(EventType.SIGNAL_GENERATED, payload)
            for payload in payloads
        ]
        await asyncio.gather(*tasks)

        # Verify all events were published
        assert mock_event_bus.publish.call_count == 10

    @pytest.mark.asyncio
    async def test_event_bus_singleton_behavior(self, mock_event_bus):
        """Test that all service instances share the same event bus."""
        # Create multiple service instances
        service1 = TestService()
        service2 = TestService()

        # Verify they share the same event bus
        assert service1.event_bus is service2.event_bus
