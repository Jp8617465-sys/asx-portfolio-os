"""
Tests for Portfolio Event Handler - Test-Driven Development (RED Phase)

This test suite drives the implementation of the portfolio change event handler
by defining expected behavior BEFORE implementation.

Handler Responsibilities:
1. Recalculate risk metrics when portfolio changes
2. Generate rebalancing suggestions
3. Check alert conditions (stop loss, target prices)
4. Create notifications for users
"""

# Set environment variables BEFORE any imports
import os
os.environ['DATABASE_URL'] = 'postgresql://test:test@localhost/test'
os.environ['EODHD_API_KEY'] = 'test_key'
os.environ['OS_API_KEY'] = 'test_api_key'
os.environ['JWT_SECRET_KEY'] = 'test_secret_key_for_testing_only'

import pytest
from unittest.mock import Mock, AsyncMock, patch, call
from datetime import datetime, date

from app.core.events import Event, EventType
from app.core.events.handlers.portfolio_handler import (
    handle_portfolio_changed,
    create_notification,
    check_alert_conditions
)


class TestPortfolioHandlerRiskMetrics:
    """Test risk metrics recalculation."""

    @pytest.mark.asyncio
    async def test_handle_portfolio_changed_recalculates_risk(self):
        """Test that portfolio changes trigger risk metrics recalculation."""
        # Arrange
        event = Event(
            type=EventType.PORTFOLIO_CHANGED,
            payload={
                "portfolio_id": 1,
                "user_id": 123,
                "action": "upload"
            },
            source="portfolio_service"
        )

        mock_risk_metrics = {
            'as_of': date.today().isoformat(),
            'total_return_pct': 12.5,
            'volatility': 18.3,
            'sharpe_ratio': 1.45,
            'beta': 1.1,
            'max_drawdown_pct': -8.2
        }

        with patch('app.core.events.handlers.portfolio_handler.RiskMetricsService') as MockRiskService:
            mock_service = MockRiskService.return_value
            mock_service.calculate_risk_metrics = AsyncMock(return_value=mock_risk_metrics)

            # Act
            await handle_portfolio_changed(event)

            # Assert
            mock_service.calculate_risk_metrics.assert_called_once_with(
                portfolio_id=1,
                recalculate=True
            )

    @pytest.mark.asyncio
    async def test_handle_portfolio_changed_logs_risk_calculation(self):
        """Test that risk calculation is logged."""
        event = Event(
            type=EventType.PORTFOLIO_CHANGED,
            payload={"portfolio_id": 1, "user_id": 123},
            source="test"
        )

        with patch('app.core.events.handlers.portfolio_handler.RiskMetricsService') as MockRiskService, \
             patch('app.core.events.handlers.portfolio_handler.logger') as mock_logger:

            mock_service = MockRiskService.return_value
            mock_service.calculate_risk_metrics = AsyncMock(return_value={'volatility': 15.0})

            await handle_portfolio_changed(event)

            # Check that info logging occurred
            assert mock_logger.info.called


class TestPortfolioHandlerRebalancing:
    """Test rebalancing suggestions generation."""

    @pytest.mark.asyncio
    async def test_handle_portfolio_changed_generates_rebalancing(self):
        """Test that portfolio changes trigger rebalancing suggestions."""
        event = Event(
            type=EventType.PORTFOLIO_CHANGED,
            payload={
                "portfolio_id": 2,
                "user_id": 456,
                "action": "analyze"
            },
            source="portfolio_service"
        )

        mock_suggestions = {
            'status': 'ok',
            'portfolio_id': 2,
            'suggestions': [
                {
                    'ticker': 'BHP.AX',
                    'action': 'TRIM',
                    'suggested_quantity': 50,
                    'reason': 'Position overweight',
                    'priority': 1
                }
            ],
            'generated_at': datetime.now().isoformat()
        }

        with patch('app.core.events.handlers.portfolio_handler.RebalancingService') as MockRebalService:
            mock_service = MockRebalService.return_value
            mock_service.generate_rebalancing_suggestions = AsyncMock(return_value=mock_suggestions)

            await handle_portfolio_changed(event)

            mock_service.generate_rebalancing_suggestions.assert_called_once_with(
                portfolio_id=2,
                regenerate=True
            )

    @pytest.mark.asyncio
    async def test_handle_portfolio_changed_handles_no_suggestions(self):
        """Test handling when no rebalancing suggestions are needed."""
        event = Event(
            type=EventType.PORTFOLIO_CHANGED,
            payload={"portfolio_id": 3, "user_id": 789},
            source="test"
        )

        mock_result = {
            'status': 'ok',
            'suggestions': [],
            'message': 'Portfolio is balanced'
        }

        with patch('app.core.events.handlers.portfolio_handler.RebalancingService') as MockRebalService:
            mock_service = MockRebalService.return_value
            mock_service.generate_rebalancing_suggestions = AsyncMock(return_value=mock_result)

            # Should complete without errors
            await handle_portfolio_changed(event)

            assert mock_service.generate_rebalancing_suggestions.called


class TestPortfolioHandlerAlerts:
    """Test alert condition checking."""

    @pytest.mark.asyncio
    async def test_handle_portfolio_changed_checks_alerts(self):
        """Test that alert conditions are checked for holdings."""
        event = Event(
            type=EventType.PORTFOLIO_CHANGED,
            payload={
                "portfolio_id": 4,
                "user_id": 100,
                "action": "analyze"
            },
            source="portfolio_service"
        )

        mock_holdings = [
            {
                'ticker': 'BHP.AX',
                'current_price': 42.50,
                'avg_cost': 50.00,  # 15% loss - potential stop loss
                'unrealized_pl_pct': -15.0,
                'current_signal': 'SELL'
            },
            {
                'ticker': 'CBA.AX',
                'current_price': 110.00,
                'avg_cost': 95.00,  # 15.8% gain - potential take profit
                'unrealized_pl_pct': 15.8,
                'current_signal': 'HOLD'
            }
        ]

        with patch('app.core.events.handlers.portfolio_handler.PortfolioRepository') as MockRepo, \
             patch('app.core.events.handlers.portfolio_handler.RiskMetricsService') as MockRiskService, \
             patch('app.core.events.handlers.portfolio_handler.RebalancingService') as MockRebalService:

            mock_repo = MockRepo.return_value
            mock_repo.get_holdings.return_value = mock_holdings

            mock_risk_service = MockRiskService.return_value
            mock_risk_service.calculate_risk_metrics = AsyncMock(return_value={})

            mock_rebal_service = MockRebalService.return_value
            mock_rebal_service.generate_rebalancing_suggestions = AsyncMock(return_value={'suggestions': []})

            await handle_portfolio_changed(event)

            # Verify holdings were fetched for alert checking
            mock_repo.get_holdings.assert_called_once_with(portfolio_id=4)

    @pytest.mark.asyncio
    async def test_handle_portfolio_changed_detects_stop_loss_conditions(self):
        """Test detection of stop loss alert conditions (>10% loss)."""
        event = Event(
            type=EventType.PORTFOLIO_CHANGED,
            payload={"portfolio_id": 5, "user_id": 200},
            source="test"
        )

        mock_holdings = [
            {
                'ticker': 'BHP.AX',
                'current_price': 40.00,
                'avg_cost': 50.00,
                'unrealized_pl_pct': -20.0,  # Triggers stop loss alert
                'current_signal': 'STRONG_SELL'
            }
        ]

        with patch('app.core.events.handlers.portfolio_handler.PortfolioRepository') as MockRepo, \
             patch('app.core.events.handlers.portfolio_handler.RiskMetricsService') as MockRiskService, \
             patch('app.core.events.handlers.portfolio_handler.RebalancingService') as MockRebalService, \
             patch('app.core.events.handlers.portfolio_handler.create_notification') as mock_create_notif:

            mock_repo = MockRepo.return_value
            mock_repo.get_holdings.return_value = mock_holdings

            mock_risk_service = MockRiskService.return_value
            mock_risk_service.calculate_risk_metrics = AsyncMock(return_value={})

            mock_rebal_service = MockRebalService.return_value
            mock_rebal_service.generate_rebalancing_suggestions = AsyncMock(return_value={'suggestions': []})

            mock_create_notif.return_value = None

            await handle_portfolio_changed(event)

            # Should create notification for stop loss
            assert mock_create_notif.called
            # Check call args contain stop loss info
            call_args = mock_create_notif.call_args_list
            assert any('stop loss' in str(call).lower() or 'loss' in str(call).lower() for call in call_args)

    @pytest.mark.asyncio
    async def test_handle_portfolio_changed_detects_target_price_conditions(self):
        """Test detection of target price alert conditions (>15% gain)."""
        event = Event(
            type=EventType.PORTFOLIO_CHANGED,
            payload={"portfolio_id": 6, "user_id": 300},
            source="test"
        )

        mock_holdings = [
            {
                'ticker': 'CBA.AX',
                'current_price': 120.00,
                'avg_cost': 100.00,
                'unrealized_pl_pct': 20.0,  # Triggers target price alert
                'current_signal': 'HOLD'
            }
        ]

        with patch('app.core.events.handlers.portfolio_handler.PortfolioRepository') as MockRepo, \
             patch('app.core.events.handlers.portfolio_handler.RiskMetricsService') as MockRiskService, \
             patch('app.core.events.handlers.portfolio_handler.RebalancingService') as MockRebalService, \
             patch('app.core.events.handlers.portfolio_handler.create_notification') as mock_create_notif:

            mock_repo = MockRepo.return_value
            mock_repo.get_holdings.return_value = mock_holdings

            mock_risk_service = MockRiskService.return_value
            mock_risk_service.calculate_risk_metrics = AsyncMock(return_value={})

            mock_rebal_service = MockRebalService.return_value
            mock_rebal_service.generate_rebalancing_suggestions = AsyncMock(return_value={'suggestions': []})

            mock_create_notif.return_value = None

            await handle_portfolio_changed(event)

            # Should create notification for target price
            assert mock_create_notif.called
            call_args = mock_create_notif.call_args_list
            assert any('target' in str(call).lower() or 'gain' in str(call).lower() for call in call_args)


class TestPortfolioHandlerNotifications:
    """Test notification creation."""

    @pytest.mark.asyncio
    async def test_handle_portfolio_changed_creates_notifications(self):
        """Test that appropriate notifications are created."""
        event = Event(
            type=EventType.PORTFOLIO_CHANGED,
            payload={
                "portfolio_id": 7,
                "user_id": 400,
                "action": "upload",
                "holdings_count": 5
            },
            source="portfolio_service"
        )

        with patch('app.core.events.handlers.portfolio_handler.RiskMetricsService') as MockRiskService, \
             patch('app.core.events.handlers.portfolio_handler.RebalancingService') as MockRebalService, \
             patch('app.core.events.handlers.portfolio_handler.PortfolioRepository') as MockRepo, \
             patch('app.core.events.handlers.portfolio_handler.create_notification') as mock_create_notif:

            mock_risk_service = MockRiskService.return_value
            mock_risk_service.calculate_risk_metrics = AsyncMock(return_value={'volatility': 15.0})

            mock_rebal_service = MockRebalService.return_value
            mock_rebal_service.generate_rebalancing_suggestions = AsyncMock(return_value={
                'suggestions': [{'ticker': 'BHP.AX', 'action': 'TRIM'}],
                'generated_at': datetime.now().isoformat()
            })

            mock_repo = MockRepo.return_value
            mock_repo.get_holdings.return_value = []

            mock_create_notif.return_value = None

            await handle_portfolio_changed(event)

            # Should create notification for upload completion
            assert mock_create_notif.called

    @pytest.mark.asyncio
    async def test_handle_portfolio_changed_notification_includes_user_id(self):
        """Test that notifications include correct user_id."""
        event = Event(
            type=EventType.PORTFOLIO_CHANGED,
            payload={
                "portfolio_id": 8,
                "user_id": 500,
                "action": "analyze"
            },
            source="test"
        )

        with patch('app.core.events.handlers.portfolio_handler.RiskMetricsService') as MockRiskService, \
             patch('app.core.events.handlers.portfolio_handler.RebalancingService') as MockRebalService, \
             patch('app.core.events.handlers.portfolio_handler.PortfolioRepository') as MockRepo, \
             patch('app.core.events.handlers.portfolio_handler.create_notification') as mock_create_notif:

            mock_risk_service = MockRiskService.return_value
            mock_risk_service.calculate_risk_metrics = AsyncMock(return_value={})

            mock_rebal_service = MockRebalService.return_value
            mock_rebal_service.generate_rebalancing_suggestions = AsyncMock(return_value={'suggestions': []})

            mock_repo = MockRepo.return_value
            mock_repo.get_holdings.return_value = []

            mock_create_notif.return_value = None

            await handle_portfolio_changed(event)

            # Verify user_id is passed to create_notification
            if mock_create_notif.called:
                for call_obj in mock_create_notif.call_args_list:
                    args, kwargs = call_obj
                    # user_id should be in kwargs or args
                    assert 500 in args or kwargs.get('user_id') == 500


class TestPortfolioHandlerErrorHandling:
    """Test error handling and edge cases."""

    @pytest.mark.asyncio
    async def test_handle_portfolio_changed_invalid_portfolio(self):
        """Test handling of invalid portfolio_id."""
        event = Event(
            type=EventType.PORTFOLIO_CHANGED,
            payload={
                "portfolio_id": 9999,  # Non-existent portfolio
                "user_id": 600
            },
            source="test"
        )

        with patch('app.core.events.handlers.portfolio_handler.RiskMetricsService') as MockRiskService, \
             patch('app.core.events.handlers.portfolio_handler.logger') as mock_logger:

            mock_service = MockRiskService.return_value
            # Simulate error when portfolio not found
            mock_service.calculate_risk_metrics = AsyncMock(
                side_effect=Exception("Portfolio not found")
            )

            # Should not raise - should log error instead
            await handle_portfolio_changed(event)

            # Verify error was logged
            assert mock_logger.error.called

    @pytest.mark.asyncio
    async def test_handle_portfolio_changed_missing_user_id(self):
        """Test handling when user_id is missing from payload."""
        event = Event(
            type=EventType.PORTFOLIO_CHANGED,
            payload={
                "portfolio_id": 10
                # Missing user_id
            },
            source="test"
        )

        with patch('app.core.events.handlers.portfolio_handler.RiskMetricsService') as MockRiskService, \
             patch('app.core.events.handlers.portfolio_handler.logger') as mock_logger:

            mock_service = MockRiskService.return_value
            mock_service.calculate_risk_metrics = AsyncMock(return_value={})

            # Should handle gracefully
            await handle_portfolio_changed(event)

            # Should still process (user_id optional for some operations)
            assert mock_service.calculate_risk_metrics.called or mock_logger.warning.called

    @pytest.mark.asyncio
    async def test_handle_portfolio_changed_missing_portfolio_id(self):
        """Test handling when portfolio_id is missing from payload."""
        event = Event(
            type=EventType.PORTFOLIO_CHANGED,
            payload={
                "user_id": 700
                # Missing portfolio_id
            },
            source="test"
        )

        with patch('app.core.events.handlers.portfolio_handler.logger') as mock_logger:

            # Should log warning and return early
            await handle_portfolio_changed(event)

            assert mock_logger.warning.called

    @pytest.mark.asyncio
    async def test_handle_portfolio_changed_service_exception(self):
        """Test handling when a service raises an exception."""
        event = Event(
            type=EventType.PORTFOLIO_CHANGED,
            payload={"portfolio_id": 11, "user_id": 800},
            source="test"
        )

        with patch('app.core.events.handlers.portfolio_handler.RiskMetricsService') as MockRiskService, \
             patch('app.core.events.handlers.portfolio_handler.RebalancingService') as MockRebalService, \
             patch('app.core.events.handlers.portfolio_handler.logger') as mock_logger:

            mock_risk_service = MockRiskService.return_value
            mock_risk_service.calculate_risk_metrics = AsyncMock(return_value={})

            mock_rebal_service = MockRebalService.return_value
            # Simulate service error
            mock_rebal_service.generate_rebalancing_suggestions = AsyncMock(
                side_effect=Exception("Database connection failed")
            )

            # Should not propagate exception
            await handle_portfolio_changed(event)

            # Should log the error
            assert mock_logger.error.called

    @pytest.mark.asyncio
    async def test_handle_portfolio_changed_continues_after_risk_error(self):
        """Test that handler continues processing even if risk calculation fails."""
        event = Event(
            type=EventType.PORTFOLIO_CHANGED,
            payload={"portfolio_id": 12, "user_id": 900},
            source="test"
        )

        with patch('app.core.events.handlers.portfolio_handler.RiskMetricsService') as MockRiskService, \
             patch('app.core.events.handlers.portfolio_handler.RebalancingService') as MockRebalService, \
             patch('app.core.events.handlers.portfolio_handler.logger') as mock_logger:

            mock_risk_service = MockRiskService.return_value
            mock_risk_service.calculate_risk_metrics = AsyncMock(
                side_effect=Exception("Risk calculation failed")
            )

            mock_rebal_service = MockRebalService.return_value
            mock_rebal_service.generate_rebalancing_suggestions = AsyncMock(
                return_value={'suggestions': []}
            )

            await handle_portfolio_changed(event)

            # Should still attempt rebalancing even if risk calc failed
            assert mock_rebal_service.generate_rebalancing_suggestions.called
            assert mock_logger.error.called


class TestPortfolioHandlerIntegration:
    """Integration tests for full workflow."""

    @pytest.mark.asyncio
    async def test_handle_portfolio_changed_full_workflow(self):
        """Test complete workflow: risk calc, rebalancing, alerts, notifications."""
        event = Event(
            type=EventType.PORTFOLIO_CHANGED,
            payload={
                "portfolio_id": 1,
                "user_id": 1000,
                "action": "upload",
                "holdings_count": 3
            },
            source="portfolio_service"
        )

        mock_holdings = [
            {
                'ticker': 'BHP.AX',
                'current_price': 45.00,
                'avg_cost': 50.00,
                'unrealized_pl_pct': -10.0,
                'current_signal': 'SELL'
            }
        ]

        with patch('app.core.events.handlers.portfolio_handler.RiskMetricsService') as MockRiskService, \
             patch('app.core.events.handlers.portfolio_handler.RebalancingService') as MockRebalService, \
             patch('app.core.events.handlers.portfolio_handler.PortfolioRepository') as MockRepo, \
             patch('app.core.events.handlers.portfolio_handler.create_notification') as mock_create_notif:

            mock_risk_service = MockRiskService.return_value
            mock_risk_service.calculate_risk_metrics = AsyncMock(return_value={
                'volatility': 18.5,
                'sharpe_ratio': 1.2
            })

            mock_rebal_service = MockRebalService.return_value
            mock_rebal_service.generate_rebalancing_suggestions = AsyncMock(return_value={
                'suggestions': [
                    {'ticker': 'BHP.AX', 'action': 'SELL', 'priority': 1}
                ]
            })

            mock_repo = MockRepo.return_value
            mock_repo.get_holdings.return_value = mock_holdings

            mock_create_notif.return_value = None

            await handle_portfolio_changed(event)

            # Verify all components were called
            assert mock_risk_service.calculate_risk_metrics.called
            assert mock_rebal_service.generate_rebalancing_suggestions.called
            assert mock_repo.get_holdings.called
            # Notifications may or may not be created depending on conditions


class TestCreateNotification:
    """Test notification creation function."""

    def test_create_notification_success(self):
        """Test successful notification creation."""
        with patch('app.core.events.handlers.portfolio_handler.db_context') as mock_db_context:
            # Setup mock database connection
            mock_conn = Mock()
            mock_cur = Mock()
            mock_conn.cursor.return_value = mock_cur
            mock_db_context.return_value.__enter__.return_value = mock_conn

            # Table exists check
            mock_cur.fetchone.side_effect = [
                [True],  # Table exists
                [123]    # Notification ID
            ]

            # Call function
            notification_id = create_notification(
                user_id=100,
                notification_type='portfolio_alert',
                title='Test Notification',
                message='Test message',
                data={'key': 'value'},
                priority='high'
            )

            # Assertions
            assert notification_id == 123
            assert mock_cur.execute.call_count == 2  # Table check + insert
            assert mock_conn.commit.called

    def test_create_notification_table_not_exists(self):
        """Test handling when notifications table doesn't exist."""
        with patch('app.core.events.handlers.portfolio_handler.db_context') as mock_db_context:
            # Setup mock database connection
            mock_conn = Mock()
            mock_cur = Mock()
            mock_conn.cursor.return_value = mock_cur
            mock_db_context.return_value.__enter__.return_value = mock_conn

            # Table doesn't exist
            mock_cur.fetchone.return_value = [False]

            # Call function
            notification_id = create_notification(
                user_id=100,
                notification_type='portfolio_alert',
                title='Test',
                message='Test'
            )

            # Should return None without creating notification
            assert notification_id is None
            # Only table existence check, no insert
            assert mock_cur.execute.call_count == 1

    def test_create_notification_database_error(self):
        """Test handling of database errors."""
        with patch('app.core.events.handlers.portfolio_handler.db_context') as mock_db_context:
            # Setup mock to raise exception
            mock_db_context.return_value.__enter__.side_effect = Exception("Database error")

            # Call function
            notification_id = create_notification(
                user_id=100,
                notification_type='portfolio_alert',
                title='Test',
                message='Test'
            )

            # Should return None on error
            assert notification_id is None


class TestCheckAlertConditions:
    """Test alert condition checking function."""

    @pytest.mark.asyncio
    async def test_check_alert_conditions_no_alerts(self):
        """Test when no alert conditions are met."""
        holdings = [
            {
                'ticker': 'BHP.AX',
                'unrealized_pl_pct': 5.0,  # Within normal range
                'current_signal': 'HOLD'
            }
        ]

        with patch('app.core.events.handlers.portfolio_handler.create_notification') as mock_create:
            await check_alert_conditions(holdings, user_id=100, portfolio_id=1)

            # No notifications should be created
            assert not mock_create.called

    @pytest.mark.asyncio
    async def test_check_alert_conditions_empty_holdings(self):
        """Test with empty holdings list."""
        with patch('app.core.events.handlers.portfolio_handler.create_notification') as mock_create:
            await check_alert_conditions([], user_id=100, portfolio_id=1)

            # Should handle gracefully without errors
            assert not mock_create.called

    @pytest.mark.asyncio
    async def test_check_alert_conditions_no_user_id(self):
        """Test when user_id is None."""
        holdings = [{'ticker': 'BHP.AX', 'unrealized_pl_pct': -15.0}]

        with patch('app.core.events.handlers.portfolio_handler.create_notification') as mock_create:
            await check_alert_conditions(holdings, user_id=None, portfolio_id=1)

            # Should not create notifications without user_id
            assert not mock_create.called
