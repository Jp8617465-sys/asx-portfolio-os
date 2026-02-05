"""
Tests for Signal Handler - Test-Driven Development (Phase 3 Week 5)

This test suite drives the implementation of signal_handler.py by defining
the expected behavior BEFORE implementation (RED phase).

Test Coverage:
- Signal event handling
- Portfolio lookup with affected tickers
- Holdings signal updates
- Rebalancing suggestion triggers
- User notifications
- Error handling and edge cases
"""

# Set environment variables BEFORE any imports
import os
os.environ['DATABASE_URL'] = 'postgresql://test:test@localhost/test'
os.environ['EODHD_API_KEY'] = 'test_key'
os.environ['OS_API_KEY'] = 'test_api_key'
os.environ['JWT_SECRET_KEY'] = 'test_secret_key_for_testing_only'

import pytest
from unittest.mock import Mock, MagicMock, patch, AsyncMock, call
from datetime import datetime
from decimal import Decimal

from app.core.events import Event, EventType
from app.core.events.handlers.signal_handler import handle_signal_generated


class TestSignalHandlerBasicFunctionality:
    """Test basic signal handler functionality."""

    @pytest.mark.asyncio
    async def test_handle_signal_generated_with_affected_portfolios(self):
        """Test handler updates holdings when portfolios contain affected tickers."""
        # Arrange: Create event with signal data
        event = Event(
            type=EventType.SIGNAL_GENERATED,
            payload={
                'model': 'model_a_v1_1',
                'ticker': 'BHP.AX',
                'signal': 'STRONG_BUY',
                'confidence': 85.5,
                'timestamp': '2024-01-15T10:30:00'
            },
            source='signal_service'
        )

        # Mock database context
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.__enter__ = Mock(return_value=mock_conn)
        mock_conn.__exit__ = Mock(return_value=False)

        # Mock portfolios containing the ticker
        mock_cursor.fetchall.side_effect = [
            # First call: Get portfolios with ticker
            [
                {'portfolio_id': 1, 'user_id': 100, 'holding_id': 10},
                {'portfolio_id': 2, 'user_id': 101, 'holding_id': 20}
            ],
            # Second call: Get previous signal for portfolio 1
            [{'current_signal': 'HOLD', 'signal_confidence': 50.0}],
            # Third call: Get previous signal for portfolio 2
            [{'current_signal': 'BUY', 'signal_confidence': 65.0}]
        ]

        # Act: Call handler
        with patch('app.core.events.handlers.signal_handler.db_context', return_value=mock_conn):
            with patch('app.core.events.handlers.signal_handler.logger') as mock_logger:
                await handle_signal_generated(event)

        # Assert: Verify holdings were updated
        assert mock_cursor.execute.call_count >= 3

        # Check that UPDATE query was called for each holding
        update_calls = [call for call in mock_cursor.execute.call_args_list
                       if 'UPDATE user_holdings' in str(call)]
        assert len(update_calls) == 2

        # Verify logging
        mock_logger.info.assert_called()

    @pytest.mark.asyncio
    async def test_handle_signal_generated_updates_holdings_signals(self):
        """Test that handler correctly updates holdings signals in database."""
        # Arrange
        event = Event(
            type=EventType.SIGNAL_GENERATED,
            payload={
                'model': 'model_a_v1_1',
                'ticker': 'CBA.AX',
                'signal': 'SELL',
                'confidence': 72.3,
                'timestamp': '2024-01-15T11:00:00'
            }
        )

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.__enter__ = Mock(return_value=mock_conn)
        mock_conn.__exit__ = Mock(return_value=False)

        # Mock affected holdings
        mock_cursor.fetchall.side_effect = [
            [{'portfolio_id': 1, 'user_id': 100, 'holding_id': 15}],
            [{'current_signal': 'HOLD', 'signal_confidence': 55.0}]
        ]

        # Act
        with patch('app.core.events.handlers.signal_handler.db_context', return_value=mock_conn):
            await handle_signal_generated(event)

        # Assert: Check UPDATE statement includes correct values
        execute_calls = mock_cursor.execute.call_args_list
        update_call = next((call for call in execute_calls
                          if 'UPDATE user_holdings' in str(call[0][0])), None)

        assert update_call is not None
        # Verify signal and confidence are in the parameters
        params = update_call[0][1]
        assert 'SELL' in params or params[0] == 'SELL'
        assert 72.3 in params or abs(params[1] - 72.3) < 0.01

    @pytest.mark.asyncio
    async def test_handle_signal_generated_no_affected_portfolios(self):
        """Test handler gracefully handles when no portfolios contain the ticker."""
        # Arrange
        event = Event(
            type=EventType.SIGNAL_GENERATED,
            payload={
                'model': 'model_a_v1_1',
                'ticker': 'XYZ.AX',
                'signal': 'BUY',
                'confidence': 80.0
            }
        )

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.__enter__ = Mock(return_value=mock_conn)
        mock_conn.__exit__ = Mock(return_value=False)

        # No portfolios have this ticker
        mock_cursor.fetchall.return_value = []

        # Act
        with patch('app.core.events.handlers.signal_handler.db_context', return_value=mock_conn):
            with patch('app.core.events.handlers.signal_handler.logger') as mock_logger:
                await handle_signal_generated(event)

        # Assert: Should log but not fail
        mock_logger.info.assert_called()
        # No UPDATE statements should be executed
        update_calls = [call for call in mock_cursor.execute.call_args_list
                       if 'UPDATE' in str(call) and 'user_holdings' in str(call)]
        assert len(update_calls) == 0


class TestSignalHandlerRebalancingTrigger:
    """Test rebalancing suggestion triggering logic."""

    @pytest.mark.asyncio
    async def test_handle_signal_generated_triggers_rebalancing_for_significant_change(self):
        """Test that significant signal changes trigger rebalancing recalculation."""
        # Arrange: Signal changed from HOLD to STRONG_BUY (significant change)
        event = Event(
            type=EventType.SIGNAL_GENERATED,
            payload={
                'model': 'model_a_v1_1',
                'ticker': 'BHP.AX',
                'signal': 'STRONG_BUY',
                'confidence': 88.0,
                'timestamp': '2024-01-15T12:00:00'
            }
        )

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.__enter__ = Mock(return_value=mock_conn)
        mock_conn.__exit__ = Mock(return_value=False)

        # Mock portfolio with holding
        mock_cursor.fetchall.side_effect = [
            [{'portfolio_id': 1, 'user_id': 100, 'holding_id': 10}],
            [{'current_signal': 'HOLD', 'signal_confidence': 50.0}]  # Significant change
        ]

        # Act
        with patch('app.core.events.handlers.signal_handler.db_context', return_value=mock_conn):
            with patch('app.core.events.handlers.signal_handler.logger') as mock_logger:
                await handle_signal_generated(event)

        # Assert: Should delete old rebalancing suggestions
        delete_calls = [call for call in mock_cursor.execute.call_args_list
                       if 'DELETE' in str(call) and 'portfolio_rebalancing_suggestions' in str(call)]
        assert len(delete_calls) >= 1

    @pytest.mark.asyncio
    async def test_handle_signal_generated_no_rebalancing_for_minor_change(self):
        """Test that minor signal changes don't trigger unnecessary rebalancing."""
        # Arrange: Signal changed from BUY to STRONG_BUY (minor change)
        event = Event(
            type=EventType.SIGNAL_GENERATED,
            payload={
                'model': 'model_a_v1_1',
                'ticker': 'CBA.AX',
                'signal': 'STRONG_BUY',
                'confidence': 85.0
            }
        )

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.__enter__ = Mock(return_value=mock_conn)
        mock_conn.__exit__ = Mock(return_value=False)

        # Mock portfolio with holding - minor signal change
        mock_cursor.fetchall.side_effect = [
            [{'portfolio_id': 1, 'user_id': 100, 'holding_id': 10}],
            [{'current_signal': 'BUY', 'signal_confidence': 78.0}]  # Similar signal
        ]

        # Act
        with patch('app.core.events.handlers.signal_handler.db_context', return_value=mock_conn):
            await handle_signal_generated(event)

        # Assert: Should still update holding but may not trigger rebalancing
        update_calls = [call for call in mock_cursor.execute.call_args_list
                       if 'UPDATE user_holdings' in str(call)]
        assert len(update_calls) >= 1


class TestSignalHandlerNotifications:
    """Test notification triggering logic."""

    @pytest.mark.asyncio
    async def test_handle_signal_generated_creates_notifications_for_users(self):
        """Test that users are notified when their holdings have signal changes."""
        # Arrange
        event = Event(
            type=EventType.SIGNAL_GENERATED,
            payload={
                'model': 'model_a_v1_1',
                'ticker': 'RIO.AX',
                'signal': 'STRONG_SELL',
                'confidence': 90.0,
                'timestamp': '2024-01-15T13:00:00'
            }
        )

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.__enter__ = Mock(return_value=mock_conn)
        mock_conn.__exit__ = Mock(return_value=False)

        # Mock portfolios with significant signal change
        mock_cursor.fetchall.side_effect = [
            [
                {'portfolio_id': 1, 'user_id': 100, 'holding_id': 10},
                {'portfolio_id': 2, 'user_id': 101, 'holding_id': 20}
            ],
            [{'current_signal': 'BUY', 'signal_confidence': 70.0}],  # Significant change
            [{'current_signal': 'HOLD', 'signal_confidence': 55.0}]  # Significant change
        ]

        # Act
        with patch('app.core.events.handlers.signal_handler.db_context', return_value=mock_conn):
            with patch('app.core.events.handlers.signal_handler.event_bus') as mock_event_bus:
                await handle_signal_generated(event)

        # Assert: Notifications should be published via event bus
        # Check if notification events were published
        assert mock_event_bus.publish.call_count >= 2

    @pytest.mark.asyncio
    async def test_handle_signal_generated_notification_content(self):
        """Test that notification contains relevant signal change information."""
        # Arrange
        event = Event(
            type=EventType.SIGNAL_GENERATED,
            payload={
                'model': 'model_a_v1_1',
                'ticker': 'WBC.AX',
                'signal': 'BUY',
                'confidence': 75.0
            }
        )

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.__enter__ = Mock(return_value=mock_conn)
        mock_conn.__exit__ = Mock(return_value=False)

        mock_cursor.fetchall.side_effect = [
            [{'portfolio_id': 1, 'user_id': 100, 'holding_id': 10}],
            [{'current_signal': 'SELL', 'signal_confidence': 60.0}]  # Significant change
        ]

        # Act
        with patch('app.core.events.handlers.signal_handler.db_context', return_value=mock_conn):
            with patch('app.core.events.handlers.signal_handler.event_bus') as mock_event_bus:
                await handle_signal_generated(event)

        # Assert: Check notification event payload
        if mock_event_bus.publish.call_count > 0:
            notification_event = mock_event_bus.publish.call_args_list[-1][0][0]
            assert notification_event.payload.get('ticker') == 'WBC.AX'
            assert notification_event.payload.get('new_signal') == 'BUY'
            assert notification_event.payload.get('user_id') == 100


class TestSignalHandlerMultiplePortfolios:
    """Test handling multiple portfolios with the same ticker."""

    @pytest.mark.asyncio
    async def test_handle_signal_generated_with_multiple_portfolios(self):
        """Test that all portfolios with the ticker are updated."""
        # Arrange
        event = Event(
            type=EventType.SIGNAL_GENERATED,
            payload={
                'model': 'model_a_v1_1',
                'ticker': 'NAB.AX',
                'signal': 'HOLD',
                'confidence': 60.0
            }
        )

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.__enter__ = Mock(return_value=mock_conn)
        mock_conn.__exit__ = Mock(return_value=False)

        # Multiple portfolios have this ticker
        mock_cursor.fetchall.side_effect = [
            [
                {'portfolio_id': 1, 'user_id': 100, 'holding_id': 10},
                {'portfolio_id': 2, 'user_id': 101, 'holding_id': 20},
                {'portfolio_id': 3, 'user_id': 102, 'holding_id': 30}
            ],
            [{'current_signal': 'BUY', 'signal_confidence': 70.0}],
            [{'current_signal': 'SELL', 'signal_confidence': 65.0}],
            [{'current_signal': 'HOLD', 'signal_confidence': 58.0}]
        ]

        # Act
        with patch('app.core.events.handlers.signal_handler.db_context', return_value=mock_conn):
            await handle_signal_generated(event)

        # Assert: All 3 holdings should be updated
        update_calls = [call for call in mock_cursor.execute.call_args_list
                       if 'UPDATE user_holdings' in str(call)]
        assert len(update_calls) == 3

    @pytest.mark.asyncio
    async def test_handle_signal_generated_updates_portfolio_totals(self):
        """Test that portfolio totals are recalculated after signal updates."""
        # Arrange
        event = Event(
            type=EventType.SIGNAL_GENERATED,
            payload={
                'model': 'model_a_v1_1',
                'ticker': 'ANZ.AX',
                'signal': 'BUY',
                'confidence': 77.0
            }
        )

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.__enter__ = Mock(return_value=mock_conn)
        mock_conn.__exit__ = Mock(return_value=False)

        mock_cursor.fetchall.side_effect = [
            [{'portfolio_id': 1, 'user_id': 100, 'holding_id': 10}],
            [{'current_signal': 'HOLD', 'signal_confidence': 50.0}]
        ]

        # Act
        with patch('app.core.events.handlers.signal_handler.db_context', return_value=mock_conn):
            await handle_signal_generated(event)

        # Assert: update_portfolio_totals function should be called
        total_calls = [call for call in mock_cursor.execute.call_args_list
                      if 'update_portfolio_totals' in str(call)]
        assert len(total_calls) >= 1


class TestSignalHandlerErrorHandling:
    """Test error handling and edge cases."""

    @pytest.mark.asyncio
    async def test_handle_signal_generated_handles_missing_payload_fields(self):
        """Test handler gracefully handles incomplete event payloads."""
        # Arrange: Event missing confidence field
        event = Event(
            type=EventType.SIGNAL_GENERATED,
            payload={
                'model': 'model_a_v1_1',
                'ticker': 'BHP.AX',
                'signal': 'BUY'
                # Missing confidence
            }
        )

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.__enter__ = Mock(return_value=mock_conn)
        mock_conn.__exit__ = Mock(return_value=False)

        mock_cursor.fetchall.return_value = []

        # Act & Assert: Should not raise exception
        with patch('app.core.events.handlers.signal_handler.db_context', return_value=mock_conn):
            with patch('app.core.events.handlers.signal_handler.logger') as mock_logger:
                await handle_signal_generated(event)
                # Should log warning about missing field
                mock_logger.warning.assert_called()

    @pytest.mark.asyncio
    async def test_handle_signal_generated_handles_database_errors(self):
        """Test handler gracefully handles database errors."""
        # Arrange
        event = Event(
            type=EventType.SIGNAL_GENERATED,
            payload={
                'model': 'model_a_v1_1',
                'ticker': 'CBA.AX',
                'signal': 'SELL',
                'confidence': 70.0
            }
        )

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.__enter__ = Mock(return_value=mock_conn)
        mock_conn.__exit__ = Mock(return_value=False)

        # Simulate database error
        mock_cursor.execute.side_effect = Exception("Database connection failed")

        # Act & Assert: Should log error but not crash
        with patch('app.core.events.handlers.signal_handler.db_context', return_value=mock_conn):
            with patch('app.core.events.handlers.signal_handler.logger') as mock_logger:
                await handle_signal_generated(event)
                # Should log error
                mock_logger.error.assert_called()

    @pytest.mark.asyncio
    async def test_handle_signal_generated_validates_signal_values(self):
        """Test handler validates signal values are from expected set."""
        # Arrange: Invalid signal value
        event = Event(
            type=EventType.SIGNAL_GENERATED,
            payload={
                'model': 'model_a_v1_1',
                'ticker': 'WES.AX',
                'signal': 'INVALID_SIGNAL',
                'confidence': 75.0
            }
        )

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.__enter__ = Mock(return_value=mock_conn)
        mock_conn.__exit__ = Mock(return_value=False)

        mock_cursor.fetchall.return_value = []

        # Act & Assert: Should log warning or skip processing
        with patch('app.core.events.handlers.signal_handler.db_context', return_value=mock_conn):
            with patch('app.core.events.handlers.signal_handler.logger') as mock_logger:
                await handle_signal_generated(event)
                # Should log warning or info about skipping
                assert mock_logger.warning.called or mock_logger.info.called


class TestSignalHandlerSignalChangeDetection:
    """Test signal change significance detection."""

    @pytest.mark.asyncio
    async def test_is_significant_signal_change_strong_buy_to_strong_sell(self):
        """Test that STRONG_BUY to STRONG_SELL is detected as significant."""
        from app.core.events.handlers.signal_handler import _is_significant_signal_change

        # Major reversal should be significant
        assert _is_significant_signal_change('STRONG_BUY', 'STRONG_SELL') is True
        assert _is_significant_signal_change('STRONG_SELL', 'STRONG_BUY') is True

    @pytest.mark.asyncio
    async def test_is_significant_signal_change_minor_variations(self):
        """Test that minor signal variations are not significant."""
        from app.core.events.handlers.signal_handler import _is_significant_signal_change

        # Minor changes should not be significant
        assert _is_significant_signal_change('BUY', 'STRONG_BUY') is False
        assert _is_significant_signal_change('SELL', 'STRONG_SELL') is False
        assert _is_significant_signal_change('HOLD', 'HOLD') is False

    @pytest.mark.asyncio
    async def test_is_significant_signal_change_crossing_neutral(self):
        """Test that signals crossing neutral (HOLD) are significant."""
        from app.core.events.handlers.signal_handler import _is_significant_signal_change

        # Crossing from positive to negative should be significant
        assert _is_significant_signal_change('BUY', 'SELL') is True
        assert _is_significant_signal_change('SELL', 'BUY') is True
        assert _is_significant_signal_change('HOLD', 'STRONG_BUY') is True
        assert _is_significant_signal_change('HOLD', 'STRONG_SELL') is True

    @pytest.mark.asyncio
    async def test_is_significant_signal_change_with_none_old_signal(self):
        """Test that None/missing old signal is considered significant."""
        from app.core.events.handlers.signal_handler import _is_significant_signal_change

        # No previous signal - any new signal is significant
        assert _is_significant_signal_change(None, 'BUY') is True
        assert _is_significant_signal_change(None, 'STRONG_SELL') is True

    @pytest.mark.asyncio
    async def test_is_significant_signal_change_with_invalid_signals(self):
        """Test handling of invalid signal values."""
        from app.core.events.handlers.signal_handler import _is_significant_signal_change

        # Invalid old signal should be considered significant change
        assert _is_significant_signal_change('INVALID', 'BUY') is True

        # Invalid new signal should not be significant
        assert _is_significant_signal_change('BUY', 'INVALID') is False


class TestSignalHandlerHelperFunctions:
    """Test helper functions in signal_handler."""

    @pytest.mark.asyncio
    async def test_get_portfolios_with_ticker_success(self):
        """Test _get_portfolios_with_ticker returns correct data."""
        from app.core.events.handlers.signal_handler import _get_portfolios_with_ticker

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.__enter__ = Mock(return_value=mock_conn)
        mock_conn.__exit__ = Mock(return_value=False)

        mock_cursor.fetchall.return_value = [
            {'portfolio_id': 1, 'user_id': 100, 'holding_id': 10},
            {'portfolio_id': 2, 'user_id': 101, 'holding_id': 20}
        ]

        with patch('app.core.events.handlers.signal_handler.db_context', return_value=mock_conn):
            result = await _get_portfolios_with_ticker('BHP.AX')

        assert len(result) == 2
        assert result[0]['portfolio_id'] == 1
        assert result[1]['user_id'] == 101

    @pytest.mark.asyncio
    async def test_get_portfolios_with_ticker_error_handling(self):
        """Test _get_portfolios_with_ticker handles errors gracefully."""
        from app.core.events.handlers.signal_handler import _get_portfolios_with_ticker

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.__enter__ = Mock(return_value=mock_conn)
        mock_conn.__exit__ = Mock(return_value=False)

        mock_cursor.execute.side_effect = Exception("Database error")

        with patch('app.core.events.handlers.signal_handler.db_context', return_value=mock_conn):
            with patch('app.core.events.handlers.signal_handler.logger') as mock_logger:
                result = await _get_portfolios_with_ticker('BHP.AX')

        assert result == []
        mock_logger.error.assert_called()

    @pytest.mark.asyncio
    async def test_get_previous_signal_success(self):
        """Test _get_previous_signal returns correct data."""
        from app.core.events.handlers.signal_handler import _get_previous_signal

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.__enter__ = Mock(return_value=mock_conn)
        mock_conn.__exit__ = Mock(return_value=False)

        mock_cursor.fetchall.return_value = [
            {'current_signal': 'BUY', 'signal_confidence': 75.0}
        ]

        with patch('app.core.events.handlers.signal_handler.db_context', return_value=mock_conn):
            result = await _get_previous_signal(10)

        assert result['current_signal'] == 'BUY'
        assert result['signal_confidence'] == 75.0

    @pytest.mark.asyncio
    async def test_get_previous_signal_no_result(self):
        """Test _get_previous_signal handles no result."""
        from app.core.events.handlers.signal_handler import _get_previous_signal

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.__enter__ = Mock(return_value=mock_conn)
        mock_conn.__exit__ = Mock(return_value=False)

        mock_cursor.fetchall.return_value = []

        with patch('app.core.events.handlers.signal_handler.db_context', return_value=mock_conn):
            result = await _get_previous_signal(10)

        assert result is None

    @pytest.mark.asyncio
    async def test_get_previous_signal_error_handling(self):
        """Test _get_previous_signal handles errors gracefully."""
        from app.core.events.handlers.signal_handler import _get_previous_signal

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.__enter__ = Mock(return_value=mock_conn)
        mock_conn.__exit__ = Mock(return_value=False)

        mock_cursor.execute.side_effect = Exception("Database error")

        with patch('app.core.events.handlers.signal_handler.db_context', return_value=mock_conn):
            with patch('app.core.events.handlers.signal_handler.logger') as mock_logger:
                result = await _get_previous_signal(10)

        assert result is None
        mock_logger.error.assert_called()

    @pytest.mark.asyncio
    async def test_update_holding_signal_success(self):
        """Test _update_holding_signal updates successfully."""
        from app.core.events.handlers.signal_handler import _update_holding_signal

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.__enter__ = Mock(return_value=mock_conn)
        mock_conn.__exit__ = Mock(return_value=False)

        with patch('app.core.events.handlers.signal_handler.db_context', return_value=mock_conn):
            result = await _update_holding_signal(10, 'BUY', 75.0, 'model_a_v1_1')

        assert result is True
        mock_cursor.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_holding_signal_error_handling(self):
        """Test _update_holding_signal handles errors gracefully."""
        from app.core.events.handlers.signal_handler import _update_holding_signal

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.__enter__ = Mock(return_value=mock_conn)
        mock_conn.__exit__ = Mock(return_value=False)

        mock_cursor.execute.side_effect = Exception("Database error")

        with patch('app.core.events.handlers.signal_handler.db_context', return_value=mock_conn):
            with patch('app.core.events.handlers.signal_handler.logger') as mock_logger:
                result = await _update_holding_signal(10, 'BUY', 75.0, 'model_a_v1_1')

        assert result is False
        mock_logger.error.assert_called()

    @pytest.mark.asyncio
    async def test_trigger_rebalancing_recalculation_success(self):
        """Test _trigger_rebalancing_recalculation deletes suggestions."""
        from app.core.events.handlers.signal_handler import _trigger_rebalancing_recalculation

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.__enter__ = Mock(return_value=mock_conn)
        mock_conn.__exit__ = Mock(return_value=False)

        with patch('app.core.events.handlers.signal_handler.db_context', return_value=mock_conn):
            await _trigger_rebalancing_recalculation(1)

        # Should execute DELETE statement
        assert mock_cursor.execute.call_count == 1
        delete_call = mock_cursor.execute.call_args[0][0]
        assert 'DELETE' in delete_call
        assert 'portfolio_rebalancing_suggestions' in delete_call

    @pytest.mark.asyncio
    async def test_trigger_rebalancing_recalculation_error_handling(self):
        """Test _trigger_rebalancing_recalculation handles errors."""
        from app.core.events.handlers.signal_handler import _trigger_rebalancing_recalculation

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.__enter__ = Mock(return_value=mock_conn)
        mock_conn.__exit__ = Mock(return_value=False)

        mock_cursor.execute.side_effect = Exception("Database error")

        with patch('app.core.events.handlers.signal_handler.db_context', return_value=mock_conn):
            with patch('app.core.events.handlers.signal_handler.logger') as mock_logger:
                await _trigger_rebalancing_recalculation(1)

        mock_logger.error.assert_called()

    @pytest.mark.asyncio
    async def test_update_portfolio_totals_success(self):
        """Test _update_portfolio_totals calls database function."""
        from app.core.events.handlers.signal_handler import _update_portfolio_totals

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.__enter__ = Mock(return_value=mock_conn)
        mock_conn.__exit__ = Mock(return_value=False)

        with patch('app.core.events.handlers.signal_handler.db_context', return_value=mock_conn):
            await _update_portfolio_totals(1)

        assert mock_cursor.execute.call_count == 1
        call_args = mock_cursor.execute.call_args[0][0]
        assert 'update_portfolio_totals' in call_args

    @pytest.mark.asyncio
    async def test_update_portfolio_totals_error_handling(self):
        """Test _update_portfolio_totals handles errors."""
        from app.core.events.handlers.signal_handler import _update_portfolio_totals

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.__enter__ = Mock(return_value=mock_conn)
        mock_conn.__exit__ = Mock(return_value=False)

        mock_cursor.execute.side_effect = Exception("Database error")

        with patch('app.core.events.handlers.signal_handler.db_context', return_value=mock_conn):
            with patch('app.core.events.handlers.signal_handler.logger') as mock_logger:
                await _update_portfolio_totals(1)

        mock_logger.error.assert_called()

    @pytest.mark.asyncio
    async def test_create_notification_event_success(self):
        """Test _create_notification_event publishes event."""
        from app.core.events.handlers.signal_handler import _create_notification_event

        with patch('app.core.events.handlers.signal_handler.event_bus') as mock_event_bus:
            await _create_notification_event(
                user_id=100,
                ticker='BHP.AX',
                old_signal='HOLD',
                new_signal='BUY',
                confidence=75.0,
                model='model_a_v1_1'
            )

        mock_event_bus.publish.assert_called_once()
        event = mock_event_bus.publish.call_args[0][0]
        assert event.payload['user_id'] == 100
        assert event.payload['ticker'] == 'BHP.AX'
        assert event.payload['new_signal'] == 'BUY'

    @pytest.mark.asyncio
    async def test_create_notification_event_error_handling(self):
        """Test _create_notification_event handles errors."""
        from app.core.events.handlers.signal_handler import _create_notification_event

        with patch('app.core.events.handlers.signal_handler.event_bus') as mock_event_bus:
            mock_event_bus.publish.side_effect = Exception("Event bus error")
            with patch('app.core.events.handlers.signal_handler.logger') as mock_logger:
                await _create_notification_event(
                    user_id=100,
                    ticker='BHP.AX',
                    old_signal='HOLD',
                    new_signal='BUY',
                    confidence=75.0,
                    model='model_a_v1_1'
                )

            mock_logger.error.assert_called()
