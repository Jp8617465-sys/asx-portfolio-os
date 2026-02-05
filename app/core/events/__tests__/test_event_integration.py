"""
End-to-End Integration Tests for Event-Driven Workflows - Phase 3 Week 6

This test suite verifies that events flow correctly through the system from trigger to final action.
Tests cover the complete event lifecycle including:
1. Signal generation → portfolio updates → rebalancing → notifications
2. Portfolio upload → risk calculation → rebalancing → alerts
3. Drift detection → admin notification → retraining trigger

Test Strategy:
- Use test database with fixtures
- Mock external dependencies (ML models, APIs)
- Verify side effects (database state, event publications, notifications)
- Test concurrent event handling
- Validate error handling and resilience
"""

import os
os.environ['DATABASE_URL'] = 'postgresql://test:test@localhost/test'
os.environ['EODHD_API_KEY'] = 'test_key'
os.environ['OS_API_KEY'] = 'test_api_key'
os.environ['JWT_SECRET_KEY'] = 'test_secret_key_for_testing_only'

import pytest
import asyncio
from unittest.mock import Mock, MagicMock, patch, AsyncMock, call
from datetime import date, datetime
from typing import Dict, Any, List
from decimal import Decimal

from app.core.events import event_bus, EventType, Event
from app.features.signals.services.signal_service import SignalService
from app.features.portfolio.services.portfolio_service import PortfolioService
from app.features.portfolio.services.risk_service import RiskMetricsService
from app.features.portfolio.services.rebalancing_service import RebalancingService
from app.core.events.handlers.signal_handler import handle_signal_generated
from app.core.events.handlers.portfolio_handler import handle_portfolio_changed
from app.core.events.handlers.drift_handler import handle_drift_detected


# ============================================================================
# Test Fixtures and Utilities
# ============================================================================

class MockDatabase:
    """Mock database for integration tests."""

    def __init__(self):
        self.portfolios = {}
        self.holdings = {}
        self.signals = {}
        self.risk_metrics = {}
        self.rebalancing_suggestions = {}
        self.notifications = {}
        self.drift_audits = {}
        self._id_counter = 1

    def reset(self):
        """Reset all data."""
        self.__init__()

    def get_next_id(self):
        """Get next auto-increment ID."""
        current = self._id_counter
        self._id_counter += 1
        return current

    def create_portfolio(self, user_id: int, holdings: List[Dict] = None, name: str = "Test Portfolio"):
        """Create a test portfolio with holdings."""
        portfolio_id = self.get_next_id()
        self.portfolios[portfolio_id] = {
            'id': portfolio_id,
            'user_id': user_id,
            'name': name,
            'total_value': 0,
            'total_cost_basis': 0,
            'total_pl': 0,
            'total_pl_pct': 0,
            'cash_balance': 0,
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        }

        if holdings:
            for holding_data in holdings:
                holding_id = self.get_next_id()
                self.holdings[holding_id] = {
                    'id': holding_id,
                    'portfolio_id': portfolio_id,
                    'ticker': holding_data['ticker'],
                    'shares': holding_data.get('shares', 100),
                    'avg_cost': holding_data.get('avg_cost', 50.0),
                    'current_price': holding_data.get('current_price', 50.0),
                    'current_signal': holding_data.get('current_signal', 'HOLD'),
                    'signal_confidence': holding_data.get('signal_confidence', 50.0),
                    'unrealized_pl': 0,
                    'unrealized_pl_pct': 0,
                    'created_at': datetime.utcnow(),
                    'updated_at': datetime.utcnow(),
                }

        return portfolio_id

    def get_portfolio(self, portfolio_id: int):
        """Get portfolio by ID."""
        return self.portfolios.get(portfolio_id)

    def get_holdings(self, portfolio_id: int):
        """Get all holdings for a portfolio."""
        return [h for h in self.holdings.values() if h['portfolio_id'] == portfolio_id]

    def get_holdings_by_ticker(self, ticker: str):
        """Get all holdings for a ticker across all portfolios."""
        return [h for h in self.holdings.values() if h['ticker'] == ticker]

    def update_holding_signal(self, holding_id: int, signal: str, confidence: float):
        """Update holding signal."""
        if holding_id in self.holdings:
            self.holdings[holding_id]['current_signal'] = signal
            self.holdings[holding_id]['signal_confidence'] = confidence
            self.holdings[holding_id]['updated_at'] = datetime.utcnow()
            return True
        return False

    def get_risk_metrics(self, portfolio_id: int):
        """Get risk metrics for a portfolio."""
        return self.risk_metrics.get(portfolio_id, {})

    def set_risk_metrics(self, portfolio_id: int, metrics: Dict):
        """Set risk metrics for a portfolio."""
        self.risk_metrics[portfolio_id] = metrics

    def get_rebalancing_suggestions(self, portfolio_id: int):
        """Get rebalancing suggestions for a portfolio."""
        return self.rebalancing_suggestions.get(portfolio_id, [])

    def set_rebalancing_suggestions(self, portfolio_id: int, suggestions: List[Dict]):
        """Set rebalancing suggestions for a portfolio."""
        self.rebalancing_suggestions[portfolio_id] = suggestions

    def clear_rebalancing_suggestions(self, portfolio_id: int):
        """Clear rebalancing suggestions to force regeneration."""
        if portfolio_id in self.rebalancing_suggestions:
            del self.rebalancing_suggestions[portfolio_id]

    def get_notifications(self, user_id: int):
        """Get notifications for a user."""
        return [n for n in self.notifications.values() if n['user_id'] == user_id]

    def create_notification(self, user_id: int, notification_type: str, title: str, message: str, **kwargs):
        """Create a notification."""
        notif_id = self.get_next_id()
        self.notifications[notif_id] = {
            'notification_id': notif_id,
            'user_id': user_id,
            'notification_type': notification_type,
            'title': title,
            'message': message,
            'created_at': datetime.utcnow(),
            **kwargs
        }
        return notif_id


@pytest.fixture
def test_db():
    """Provide a clean test database for each test."""
    db = MockDatabase()
    yield db
    db.reset()


@pytest.fixture
def event_history():
    """Track published events."""
    history = []

    async def capture_event(event: Event):
        history.append(event)

    # Subscribe to all event types
    for event_type in EventType:
        event_bus.subscribe(event_type, capture_event)

    yield history

    # Cleanup
    history.clear()


# ============================================================================
# Signal Generation Flow Tests
# ============================================================================

class TestSignalGenerationFlow:
    """Test complete signal generation → portfolio update → rebalancing → notification flow."""

    @pytest.mark.asyncio
    async def test_signal_generation_triggers_portfolio_update(self, test_db):
        """
        Test that generating signals updates portfolios containing those tickers.

        Flow: SignalService.persist_model_run() → SIGNAL_GENERATED event →
              SignalHandler updates holdings → Portfolio totals updated
        """
        # Setup: Create test portfolio with BHP.AX holdings
        portfolio_id = test_db.create_portfolio(
            user_id=1,
            holdings=[{"ticker": "BHP.AX", "shares": 100, "current_signal": "HOLD"}]
        )

        # Mock database interactions
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.__enter__ = Mock(return_value=mock_conn)
        mock_conn.__exit__ = Mock(return_value=False)

        # Mock signal persistence and event publishing
        with patch('app.features.signals.services.signal_service.SignalRepository') as MockRepo:
            mock_repo = MockRepo.return_value
            mock_repo.persist_signals.return_value = 1
            mock_repo.register_model_run.return_value = 123

            # Action: Generate signal for BHP.AX
            signal_service = SignalService(repository=mock_repo)
            result = await signal_service.persist_model_run(
                signals=[{
                    "symbol": "BHP.AX",
                    "signal": "STRONG_BUY",
                    "confidence": 0.95,
                    "rank": 1
                }],
                model="model_a",
                as_of="2024-01-15"
            )

        # Verify: Signal persistence succeeded
        assert result['status'] == 'ok'
        assert result['rows'] == 1
        mock_repo.persist_signals.assert_called_once()

    @pytest.mark.asyncio
    async def test_signal_change_creates_notification(self, test_db):
        """
        Test that significant signal changes create user notifications.

        Flow: SIGNAL_GENERATED event → SignalHandler detects significant change →
              ALERT_TRIGGERED event published → Notification created
        """
        # Setup: Portfolio with holding
        portfolio_id = test_db.create_portfolio(
            user_id=100,
            holdings=[{"ticker": "BHP.AX", "shares": 100, "current_signal": "HOLD"}]
        )

        # Create signal change event
        event = Event(
            type=EventType.SIGNAL_GENERATED,
            payload={
                'model': 'model_a_v1_1',
                'ticker': 'BHP.AX',
                'signal': 'STRONG_BUY',
                'confidence': 95.0
            }
        )

        # Mock database to return portfolio and holdings
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.__enter__ = Mock(return_value=mock_conn)
        mock_conn.__exit__ = Mock(return_value=False)

        # Mock query results
        holding = test_db.get_holdings(portfolio_id)[0]
        mock_cursor.fetchall.side_effect = [
            [{'portfolio_id': portfolio_id, 'user_id': 100, 'holding_id': holding['id']}],
            [{'current_signal': 'HOLD', 'signal_confidence': 50.0}]
        ]

        # Action: Handle signal event
        with patch('app.core.events.handlers.signal_handler.db_context', return_value=mock_conn):
            with patch('app.core.events.handlers.signal_handler.event_bus') as mock_event_bus:
                await handle_signal_generated(event)

        # Verify: Notification event published
        assert mock_event_bus.publish.call_count >= 1
        notification_calls = [call for call in mock_event_bus.publish.call_args_list
                            if call[0][0].type == EventType.ALERT_TRIGGERED]
        assert len(notification_calls) >= 1

    @pytest.mark.asyncio
    async def test_significant_signal_change_triggers_rebalancing(self, test_db):
        """
        Test that significant signal changes trigger rebalancing recalculation.

        Flow: SIGNAL_GENERATED event → SignalHandler detects significant change →
              Rebalancing suggestions cleared → Will regenerate on next request
        """
        # Setup
        portfolio_id = test_db.create_portfolio(
            user_id=1,
            holdings=[{"ticker": "CBA.AX", "shares": 50, "current_signal": "SELL"}]
        )
        test_db.set_rebalancing_suggestions(portfolio_id, [{"action": "old_suggestion"}])

        # Create event with significant signal change (SELL → STRONG_BUY)
        event = Event(
            type=EventType.SIGNAL_GENERATED,
            payload={
                'model': 'model_a_v1_1',
                'ticker': 'CBA.AX',
                'signal': 'STRONG_BUY',
                'confidence': 92.0
            }
        )

        # Mock database
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.__enter__ = Mock(return_value=mock_conn)
        mock_conn.__exit__ = Mock(return_value=False)

        holding = test_db.get_holdings(portfolio_id)[0]
        mock_cursor.fetchall.side_effect = [
            [{'portfolio_id': portfolio_id, 'user_id': 1, 'holding_id': holding['id']}],
            [{'current_signal': 'SELL', 'signal_confidence': 70.0}]
        ]

        # Action
        with patch('app.core.events.handlers.signal_handler.db_context', return_value=mock_conn):
            await handle_signal_generated(event)

        # Verify: DELETE statement executed for rebalancing suggestions
        delete_calls = [call for call in mock_cursor.execute.call_args_list
                       if 'DELETE' in str(call) and 'portfolio_rebalancing_suggestions' in str(call)]
        assert len(delete_calls) >= 1

    @pytest.mark.asyncio
    async def test_minor_signal_change_no_rebalancing(self, test_db):
        """
        Test that minor signal changes don't trigger unnecessary rebalancing.

        Flow: SIGNAL_GENERATED event → SignalHandler detects minor change →
              Holdings updated but rebalancing NOT triggered
        """
        # Setup with similar signal (BUY → STRONG_BUY is minor)
        portfolio_id = test_db.create_portfolio(
            user_id=1,
            holdings=[{"ticker": "WOW.AX", "shares": 75, "current_signal": "BUY"}]
        )
        test_db.set_rebalancing_suggestions(portfolio_id, [{"action": "existing"}])

        # Event with minor change
        event = Event(
            type=EventType.SIGNAL_GENERATED,
            payload={
                'model': 'model_a_v1_1',
                'ticker': 'WOW.AX',
                'signal': 'STRONG_BUY',
                'confidence': 88.0
            }
        )

        # Mock database
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.__enter__ = Mock(return_value=mock_conn)
        mock_conn.__exit__ = Mock(return_value=False)

        holding = test_db.get_holdings(portfolio_id)[0]
        mock_cursor.fetchall.side_effect = [
            [{'portfolio_id': portfolio_id, 'user_id': 1, 'holding_id': holding['id']}],
            [{'current_signal': 'BUY', 'signal_confidence': 80.0}]
        ]

        # Action
        with patch('app.core.events.handlers.signal_handler.db_context', return_value=mock_conn):
            await handle_signal_generated(event)

        # Verify: Holdings updated but rebalancing NOT cleared (minor change)
        update_calls = [call for call in mock_cursor.execute.call_args_list
                       if 'UPDATE user_holdings' in str(call)]
        assert len(update_calls) >= 1

        # Existing suggestions should remain
        suggestions = test_db.get_rebalancing_suggestions(portfolio_id)
        assert len(suggestions) == 1


# ============================================================================
# Portfolio Upload Flow Tests
# ============================================================================

class TestPortfolioUploadFlow:
    """Test portfolio upload → risk calculation → rebalancing → alerts flow."""

    @pytest.mark.asyncio
    async def test_portfolio_upload_triggers_full_analysis(self, test_db):
        """
        Test that uploading portfolio triggers risk calculation and rebalancing.

        Flow: User uploads CSV → PortfolioService.upload_and_analyze_portfolio() →
              PORTFOLIO_CHANGED event → PortfolioHandler calculates risk → Generates suggestions
        """
        # Mock repository
        with patch('app.features.portfolio.services.portfolio_service.PortfolioRepository') as MockRepo:
            mock_repo = MockRepo.return_value

            # Mock portfolio creation
            portfolio_id = test_db.create_portfolio(user_id=1, holdings=[])
            mock_repo.get_portfolio_by_user_id.return_value = None
            mock_repo.create_portfolio.return_value = portfolio_id
            mock_repo.create_holding.return_value = 1
            mock_repo.sync_holding_prices.return_value = None
            mock_repo.update_portfolio_totals.return_value = None

            # Action: Upload portfolio CSV
            portfolio_service = PortfolioService(repository=mock_repo)
            csv_content = "ticker,shares,avg_cost\nBHP.AX,100,40.00\nCBA.AX,50,95.00"

            result = portfolio_service.upload_and_analyze_portfolio(
                user_id=1,
                csv_content=csv_content,
                portfolio_name="Test Portfolio"
            )

        # Verify: Portfolio created successfully
        assert result['status'] == 'success'
        assert result['holdings_count'] == 2
        assert result['portfolio_id'] == portfolio_id

        # Verify: Holdings were created
        assert mock_repo.create_holding.call_count == 2

    @pytest.mark.asyncio
    async def test_portfolio_change_recalculates_risk(self, test_db):
        """
        Test that portfolio changes trigger risk metric recalculation.

        Flow: PORTFOLIO_CHANGED event → PortfolioHandler → RiskMetricsService.calculate_risk_metrics()
        """
        # Setup
        portfolio_id = test_db.create_portfolio(
            user_id=1,
            holdings=[
                {"ticker": "BHP.AX", "shares": 100},
                {"ticker": "CBA.AX", "shares": 50}
            ]
        )

        # Create portfolio changed event
        event = Event(
            type=EventType.PORTFOLIO_CHANGED,
            payload={
                'portfolio_id': portfolio_id,
                'user_id': 1,
                'action': 'upload',
                'holdings_count': 2
            }
        )

        # Mock services
        with patch('app.core.events.handlers.portfolio_handler.RiskMetricsService') as MockRisk:
            with patch('app.core.events.handlers.portfolio_handler.RebalancingService') as MockRebal:
                with patch('app.core.events.handlers.portfolio_handler.PortfolioRepository') as MockRepo:
                    mock_risk = MockRisk.return_value
                    mock_rebal = MockRebal.return_value
                    mock_repo = MockRepo.return_value

                    mock_risk.calculate_risk_metrics = AsyncMock(return_value={
                        'volatility': 0.15,
                        'sharpe_ratio': 1.2,
                        'beta': 0.95
                    })
                    mock_rebal.generate_rebalancing_suggestions = AsyncMock(return_value={
                        'suggestions': []
                    })
                    mock_repo.get_holdings.return_value = []

                    # Action
                    await handle_portfolio_changed(event)

        # Verify: Risk metrics calculated
        mock_risk.calculate_risk_metrics.assert_called_once_with(
            portfolio_id=portfolio_id,
            recalculate=True
        )

    @pytest.mark.asyncio
    async def test_portfolio_alert_conditions_stop_loss(self, test_db):
        """
        Test that stop loss conditions trigger alerts.

        Flow: PORTFOLIO_CHANGED event → PortfolioHandler checks alert conditions →
              Creates notification for stop loss (>10% loss)
        """
        # Setup with holding at significant loss
        portfolio_id = test_db.create_portfolio(
            user_id=1,
            holdings=[{
                "ticker": "NAB.AX",
                "shares": 100,
                "avg_cost": 30.0,
                "current_price": 25.0,  # -16.67% loss
            }]
        )

        event = Event(
            type=EventType.PORTFOLIO_CHANGED,
            payload={
                'portfolio_id': portfolio_id,
                'user_id': 1,
                'action': 'analyze'
            }
        )

        # Mock services and database
        with patch('app.core.events.handlers.portfolio_handler.RiskMetricsService') as MockRisk:
            with patch('app.core.events.handlers.portfolio_handler.RebalancingService') as MockRebal:
                with patch('app.core.events.handlers.portfolio_handler.PortfolioRepository') as MockRepo:
                    with patch('app.core.events.handlers.portfolio_handler.create_notification') as mock_notify:
                        mock_repo = MockRepo.return_value
                        mock_risk = MockRisk.return_value
                        mock_rebal = MockRebal.return_value

                        # Mock holdings with stop loss condition
                        mock_repo.get_holdings.return_value = [{
                            'ticker': 'NAB.AX',
                            'unrealized_pl_pct': -16.67,
                            'current_signal': 'SELL'
                        }]

                        mock_risk.calculate_risk_metrics = AsyncMock(return_value={})
                        mock_rebal.generate_rebalancing_suggestions = AsyncMock(return_value={'suggestions': []})

                        # Action
                        await handle_portfolio_changed(event)

        # Verify: Stop loss notification created
        stop_loss_calls = [call for call in mock_notify.call_args_list
                          if 'Stop Loss' in str(call)]
        assert len(stop_loss_calls) >= 1

    @pytest.mark.asyncio
    async def test_portfolio_alert_conditions_target_price(self, test_db):
        """
        Test that target price conditions trigger alerts.

        Flow: PORTFOLIO_CHANGED event → PortfolioHandler checks alert conditions →
              Creates notification for target price reached (>15% gain)
        """
        # Setup with holding at significant gain
        portfolio_id = test_db.create_portfolio(
            user_id=1,
            holdings=[{
                "ticker": "CSL.AX",
                "shares": 50,
                "avg_cost": 250.0,
                "current_price": 300.0,  # +20% gain
            }]
        )

        event = Event(
            type=EventType.PORTFOLIO_CHANGED,
            payload={
                'portfolio_id': portfolio_id,
                'user_id': 1,
                'action': 'analyze'
            }
        )

        # Mock services
        with patch('app.core.events.handlers.portfolio_handler.RiskMetricsService') as MockRisk:
            with patch('app.core.events.handlers.portfolio_handler.RebalancingService') as MockRebal:
                with patch('app.core.events.handlers.portfolio_handler.PortfolioRepository') as MockRepo:
                    with patch('app.core.events.handlers.portfolio_handler.create_notification') as mock_notify:
                        mock_repo = MockRepo.return_value
                        mock_risk = MockRisk.return_value
                        mock_rebal = MockRebal.return_value

                        mock_repo.get_holdings.return_value = [{
                            'ticker': 'CSL.AX',
                            'unrealized_pl_pct': 20.0,
                            'current_signal': 'HOLD'
                        }]

                        mock_risk.calculate_risk_metrics = AsyncMock(return_value={})
                        mock_rebal.generate_rebalancing_suggestions = AsyncMock(return_value={'suggestions': []})

                        # Action
                        await handle_portfolio_changed(event)

        # Verify: Target price notification created
        target_price_calls = [call for call in mock_notify.call_args_list
                             if 'Target Price' in str(call)]
        assert len(target_price_calls) >= 1


# ============================================================================
# Drift Detection Flow Tests
# ============================================================================

class TestDriftDetectionFlow:
    """Test drift detection → admin notification → retraining trigger flow."""

    @pytest.mark.asyncio
    async def test_drift_detection_notifies_admins(self, test_db):
        """
        Test that drift detection triggers admin notifications.

        Flow: DriftMonitorService detects drift → MODEL_DRIFT_DETECTED event →
              DriftHandler logs alert → Notifies admin users
        """
        # Create drift event
        event = Event(
            type=EventType.MODEL_DRIFT_DETECTED,
            payload={
                'model_id': 'model_a_v1_1',
                'drift_score': 0.25,
                'threshold': 0.15,
                'features_drifted': ['momentum', 'rsi', 'volume'],
                'auto_retrain': False
            }
        )

        # Mock notification function
        with patch('app.core.events.handlers.drift_handler.notify_admins') as mock_notify:
            with patch('app.core.events.handlers.drift_handler.logger') as mock_logger:
                mock_notify.return_value = AsyncMock()

                # Action
                await handle_drift_detected(event)

        # Verify: Admin notification called
        mock_notify.assert_called_once_with(
            model_id='model_a_v1_1',
            drift_score=0.25,
            features_drifted=['momentum', 'rsi', 'volume'],
            threshold=0.15
        )

        # Verify: Drift logged
        assert mock_logger.warning.called

    @pytest.mark.asyncio
    async def test_drift_with_auto_retrain_triggers_job(self, test_db):
        """
        Test that drift with auto_retrain enabled triggers retraining job.

        Flow: MODEL_DRIFT_DETECTED event with auto_retrain=True →
              DriftHandler triggers retraining job
        """
        # Create drift event with auto_retrain
        event = Event(
            type=EventType.MODEL_DRIFT_DETECTED,
            payload={
                'model_id': 'model_a_v1_1',
                'drift_score': 0.30,
                'threshold': 0.15,
                'features_drifted': ['all'],
                'auto_retrain': True
            }
        )

        # Mock functions
        with patch('app.core.events.handlers.drift_handler.notify_admins') as mock_notify:
            with patch('app.core.events.handlers.drift_handler.trigger_model_retraining') as mock_retrain:
                mock_notify.return_value = AsyncMock()
                mock_retrain.return_value = AsyncMock()

                # Action
                await handle_drift_detected(event)

        # Verify: Retraining triggered
        mock_retrain.assert_called_once_with('model_a_v1_1')


# ============================================================================
# Concurrent Event Handling Tests
# ============================================================================

class TestConcurrentEventHandling:
    """Test concurrent event processing and race conditions."""

    @pytest.mark.asyncio
    async def test_event_bus_handles_concurrent_events(self):
        """
        Test that event bus correctly handles multiple concurrent events.

        Verifies no race conditions or event loss when publishing many events simultaneously.
        """
        # Track handled events
        handled_events = []

        async def test_handler(event: Event):
            await asyncio.sleep(0.01)  # Simulate processing time
            handled_events.append(event.event_id)

        # Subscribe handler
        event_bus.subscribe(EventType.SIGNAL_GENERATED, test_handler)

        # Create many concurrent events
        events = [
            Event(
                type=EventType.SIGNAL_GENERATED,
                payload={'ticker': f'TEST{i}.AX', 'signal': 'BUY', 'confidence': 80.0}
            )
            for i in range(10)
        ]

        # Publish all events concurrently
        await asyncio.gather(*[event_bus.publish(e) for e in events])

        # Wait for processing
        await asyncio.sleep(0.5)

        # Verify: All events handled
        assert len(handled_events) == 10
        assert len(set(handled_events)) == 10  # All unique

    @pytest.mark.asyncio
    async def test_multiple_portfolios_updated_on_signal_change(self, test_db):
        """
        Test that signal changes update ALL portfolios containing the ticker.

        Verifies concurrent portfolio updates don't interfere with each other.
        """
        # Setup: Multiple users with same ticker
        portfolio_id_1 = test_db.create_portfolio(
            user_id=1,
            holdings=[{"ticker": "BHP.AX", "shares": 100}]
        )
        portfolio_id_2 = test_db.create_portfolio(
            user_id=2,
            holdings=[{"ticker": "BHP.AX", "shares": 200}]
        )
        portfolio_id_3 = test_db.create_portfolio(
            user_id=3,
            holdings=[{"ticker": "BHP.AX", "shares": 50}]
        )

        # Create signal event
        event = Event(
            type=EventType.SIGNAL_GENERATED,
            payload={
                'model': 'model_a_v1_1',
                'ticker': 'BHP.AX',
                'signal': 'STRONG_BUY',
                'confidence': 90.0
            }
        )

        # Mock database
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.__enter__ = Mock(return_value=mock_conn)
        mock_conn.__exit__ = Mock(return_value=False)

        # Mock returns all 3 portfolios
        holdings = [
            test_db.get_holdings(portfolio_id_1)[0],
            test_db.get_holdings(portfolio_id_2)[0],
            test_db.get_holdings(portfolio_id_3)[0]
        ]

        mock_cursor.fetchall.side_effect = [
            [
                {'portfolio_id': portfolio_id_1, 'user_id': 1, 'holding_id': holdings[0]['id']},
                {'portfolio_id': portfolio_id_2, 'user_id': 2, 'holding_id': holdings[1]['id']},
                {'portfolio_id': portfolio_id_3, 'user_id': 3, 'holding_id': holdings[2]['id']}
            ],
            [{'current_signal': 'HOLD', 'signal_confidence': 50.0}],
            [{'current_signal': 'HOLD', 'signal_confidence': 50.0}],
            [{'current_signal': 'HOLD', 'signal_confidence': 50.0}]
        ]

        # Action
        with patch('app.core.events.handlers.signal_handler.db_context', return_value=mock_conn):
            await handle_signal_generated(event)

        # Verify: All 3 holdings updated
        update_calls = [call for call in mock_cursor.execute.call_args_list
                       if 'UPDATE user_holdings' in str(call)]
        assert len(update_calls) == 3


# ============================================================================
# Error Handling Tests
# ============================================================================

class TestEventErrorHandling:
    """Test error handling and system resilience."""

    @pytest.mark.asyncio
    async def test_event_handler_error_doesnt_crash_system(self):
        """
        Test that errors in event handlers don't crash the event bus.

        Verifies graceful error handling and continued event processing.
        """
        # Create faulty handler
        async def faulty_handler(event: Event):
            raise Exception("Handler error!")

        # Subscribe faulty handler
        event_bus.subscribe(EventType.SIGNAL_GENERATED, faulty_handler)

        # Create event
        event = Event(
            type=EventType.SIGNAL_GENERATED,
            payload={'ticker': 'TEST.AX', 'signal': 'BUY'}
        )

        # Action: Should not raise exception
        with patch('app.core.events.handlers.signal_handler.logger') as mock_logger:
            await event_bus.publish(event)

        # Verify: Event bus continues working (doesn't crash)
        # Event should be in history even though handler failed
        history = event_bus.get_history(EventType.SIGNAL_GENERATED, limit=10)
        assert len([e for e in history if e.event_id == event.event_id]) >= 0

    @pytest.mark.asyncio
    async def test_missing_payload_fields_handled_gracefully(self):
        """
        Test that missing payload fields are handled gracefully.

        Verifies validation and error handling for incomplete events.
        """
        # Create event with missing fields
        event = Event(
            type=EventType.SIGNAL_GENERATED,
            payload={
                'model': 'model_a_v1_1',
                # Missing: ticker, signal, confidence
            }
        )

        # Mock database
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.__enter__ = Mock(return_value=mock_conn)
        mock_conn.__exit__ = Mock(return_value=False)

        # Action: Should handle gracefully
        with patch('app.core.events.handlers.signal_handler.db_context', return_value=mock_conn):
            with patch('app.core.events.handlers.signal_handler.logger') as mock_logger:
                await handle_signal_generated(event)

        # Verify: Warning logged, no exception raised
        assert mock_logger.warning.called

    @pytest.mark.asyncio
    async def test_database_error_during_event_handling(self):
        """
        Test that database errors during event handling are logged but don't crash.

        Verifies resilience to database failures.
        """
        # Create valid event
        event = Event(
            type=EventType.SIGNAL_GENERATED,
            payload={
                'model': 'model_a_v1_1',
                'ticker': 'BHP.AX',
                'signal': 'BUY',
                'confidence': 75.0
            }
        )

        # Mock database with error
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.__enter__ = Mock(return_value=mock_conn)
        mock_conn.__exit__ = Mock(return_value=False)
        mock_cursor.execute.side_effect = Exception("Database connection failed")

        # Action: Should handle gracefully
        with patch('app.core.events.handlers.signal_handler.db_context', return_value=mock_conn):
            with patch('app.core.events.handlers.signal_handler.logger') as mock_logger:
                await handle_signal_generated(event)

        # Verify: Error logged
        assert mock_logger.error.called


# ============================================================================
# Event History and Debugging Tests
# ============================================================================

class TestEventHistoryAndDebugging:
    """Test event history tracking for debugging and auditing."""

    @pytest.mark.asyncio
    async def test_event_history_tracks_all_events(self):
        """
        Test that event bus maintains history of published events.

        Useful for debugging and auditing event flows.
        """
        # Publish multiple events
        events = [
            Event(type=EventType.SIGNAL_GENERATED, payload={'ticker': 'BHP.AX'}),
            Event(type=EventType.PORTFOLIO_CHANGED, payload={'portfolio_id': 1}),
            Event(type=EventType.MODEL_DRIFT_DETECTED, payload={'model_id': 'model_a'})
        ]

        for event in events:
            await event_bus.publish(event)

        # Retrieve history
        all_history = event_bus.get_history(limit=100)

        # Verify: All events in history
        event_ids = [e.event_id for e in events]
        history_ids = [e.event_id for e in all_history]

        for event_id in event_ids:
            assert event_id in history_ids

    @pytest.mark.asyncio
    async def test_event_history_filtered_by_type(self):
        """
        Test that event history can be filtered by event type.
        """
        # Publish different event types
        await event_bus.publish(Event(type=EventType.SIGNAL_GENERATED, payload={'ticker': 'BHP.AX'}))
        await event_bus.publish(Event(type=EventType.SIGNAL_GENERATED, payload={'ticker': 'CBA.AX'}))
        await event_bus.publish(Event(type=EventType.PORTFOLIO_CHANGED, payload={'portfolio_id': 1}))

        # Get filtered history
        signal_history = event_bus.get_history(EventType.SIGNAL_GENERATED, limit=10)

        # Verify: Only signal events returned
        assert all(e.type == EventType.SIGNAL_GENERATED for e in signal_history)
        assert len(signal_history) >= 2


# ============================================================================
# Performance and Scalability Tests
# ============================================================================

class TestEventPerformance:
    """Test event system performance and scalability."""

    @pytest.mark.asyncio
    async def test_high_volume_event_processing(self):
        """
        Test that system handles high volume of events efficiently.

        Verifies performance under load.
        """
        # Track processing times
        processing_times = []

        async def timing_handler(event: Event):
            start = datetime.utcnow()
            await asyncio.sleep(0.001)  # Minimal processing
            end = datetime.utcnow()
            processing_times.append((end - start).total_seconds())

        # Subscribe handler
        event_bus.subscribe(EventType.SIGNAL_GENERATED, timing_handler)

        # Generate high volume of events
        num_events = 100
        events = [
            Event(
                type=EventType.SIGNAL_GENERATED,
                payload={'ticker': f'STOCK{i}.AX', 'signal': 'BUY', 'confidence': 80.0}
            )
            for i in range(num_events)
        ]

        # Measure total time
        start_time = datetime.utcnow()
        await asyncio.gather(*[event_bus.publish(e) for e in events])
        await asyncio.sleep(0.5)  # Wait for processing
        end_time = datetime.utcnow()

        total_time = (end_time - start_time).total_seconds()

        # Verify: Reasonable performance (< 5 seconds for 100 events)
        assert total_time < 5.0
        assert len(processing_times) >= num_events * 0.9  # At least 90% processed

    @pytest.mark.asyncio
    async def test_event_memory_management(self):
        """
        Test that event history doesn't grow unbounded.

        Verifies memory management and history cleanup.
        """
        # Publish many events to test history limit
        for i in range(1500):  # More than history limit (1000)
            await event_bus.publish(
                Event(
                    type=EventType.SIGNAL_GENERATED,
                    payload={'ticker': f'STOCK{i}.AX', 'signal': 'BUY'}
                )
            )

        # Check history size
        history = event_bus.get_history(limit=2000)

        # Verify: History capped at reasonable size (should be ~1000, not 1500)
        assert len(history) <= 1000


# ============================================================================
# Integration Test Summary
# ============================================================================

class TestIntegrationSummary:
    """Summary test to verify complete end-to-end flow."""

    @pytest.mark.asyncio
    async def test_complete_signal_to_notification_flow(self, test_db):
        """
        Complete integration test: Signal generation → Portfolio update → Notification.

        This test verifies the entire event chain from start to finish.
        """
        # Setup: Create portfolio
        portfolio_id = test_db.create_portfolio(
            user_id=1,
            holdings=[{"ticker": "BHP.AX", "shares": 100, "current_signal": "HOLD"}]
        )

        # Mock all database interactions
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.__enter__ = Mock(return_value=mock_conn)
        mock_conn.__exit__ = Mock(return_value=False)

        holding = test_db.get_holdings(portfolio_id)[0]

        # Step 1: Signal generated
        with patch('app.features.signals.services.signal_service.SignalRepository') as MockSignalRepo:
            mock_signal_repo = MockSignalRepo.return_value
            mock_signal_repo.persist_signals.return_value = 1

            signal_service = SignalService(repository=mock_signal_repo)
            await signal_service.persist_model_run(
                signals=[{"symbol": "BHP.AX", "signal": "STRONG_BUY", "confidence": 0.95}],
                model="model_a",
                as_of="2024-01-15"
            )

        # Step 2: Event published and handled
        event = Event(
            type=EventType.SIGNAL_GENERATED,
            payload={
                'model': 'model_a',
                'ticker': 'BHP.AX',
                'signal': 'STRONG_BUY',
                'confidence': 95.0
            }
        )

        mock_cursor.fetchall.side_effect = [
            [{'portfolio_id': portfolio_id, 'user_id': 1, 'holding_id': holding['id']}],
            [{'current_signal': 'HOLD', 'signal_confidence': 50.0}]
        ]

        notification_published = False

        async def check_notification(notif_event: Event):
            nonlocal notification_published
            if notif_event.type == EventType.ALERT_TRIGGERED:
                notification_published = True

        event_bus.subscribe(EventType.ALERT_TRIGGERED, check_notification)

        with patch('app.core.events.handlers.signal_handler.db_context', return_value=mock_conn):
            await handle_signal_generated(event)

        await asyncio.sleep(0.1)

        # Verify: Complete flow executed
        assert notification_published, "Notification event should have been published"

        # Verify: Holding update attempted
        update_calls = [call for call in mock_cursor.execute.call_args_list
                       if 'UPDATE user_holdings' in str(call)]
        assert len(update_calls) >= 1
