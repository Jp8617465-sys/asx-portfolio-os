"""
Tests for RebalancingService

Following TDD principles:
1. Write tests FIRST (Red)
2. Implement minimal code to pass (Green)
3. Refactor and improve (Refactor)

This test suite covers:
- generate_rebalancing_suggestions() - main orchestration
- _calculate_target_weights() - signal-based weight calculation
- _generate_actions() - buy/sell/hold/trim/add logic
- _prioritize_suggestions() - ranking by impact
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from typing import List, Dict, Any

# Import will fail until we create the service - that's expected in TDD!
# from app.features.portfolio.services.rebalancing_service import RebalancingService
from app.core.events.event_bus import EventType


class TestRebalancingService:
    """Test suite for RebalancingService"""

    @pytest.fixture
    def mock_repository(self):
        """Mock repository for database operations"""
        repo = Mock()
        repo.get_portfolio = Mock(return_value={
            'id': 1,
            'user_id': 'user123',
            'total_value': 100000.00,
            'cash_balance': 10000.00
        })
        repo.get_holdings = Mock(return_value=[])
        repo.save_suggestions = Mock()
        repo.clear_old_suggestions = Mock()
        return repo

    @pytest.fixture
    def service(self, mock_repository):
        """Create service instance with mocked dependencies"""
        from app.features.portfolio.services.rebalancing_service import RebalancingService
        return RebalancingService(repository=mock_repository)

    @pytest.fixture
    def sample_holdings(self):
        """Sample holdings data for testing"""
        return [
            {
                'ticker': 'BHP.AX',
                'shares': 100.0,
                'current_price': 45.50,
                'current_value': 4550.00,
                'current_signal': 'STRONG_BUY',
                'signal_confidence': 85.0
            },
            {
                'ticker': 'CBA.AX',
                'shares': 50.0,
                'current_price': 105.00,
                'current_value': 5250.00,
                'current_signal': 'HOLD',
                'signal_confidence': 55.0
            },
            {
                'ticker': 'WES.AX',
                'shares': 200.0,
                'current_price': 32.00,
                'current_value': 6400.00,
                'current_signal': 'STRONG_SELL',
                'signal_confidence': 75.0
            },
            {
                'ticker': 'NAB.AX',
                'shares': 150.0,
                'current_price': 28.00,
                'current_value': 4200.00,
                'current_signal': 'SELL',
                'signal_confidence': 65.0
            }
        ]

    # =============================================================================
    # Test generate_rebalancing_suggestions() - Main orchestration method
    # =============================================================================

    @pytest.mark.asyncio
    async def test_generate_suggestions_with_no_holdings(self, service, mock_repository):
        """Should return empty suggestions when portfolio has no holdings"""
        mock_repository.get_holdings.return_value = []

        result = await service.generate_rebalancing_suggestions(
            portfolio_id=1,
            holdings=[]
        )

        assert result['status'] == 'ok'
        assert result['suggestions'] == []
        assert result['portfolio_id'] == 1
        assert 'No holdings' in result['message']

    @pytest.mark.asyncio
    async def test_generate_suggestions_with_zero_total_value(self, service, mock_repository):
        """Should handle portfolio with zero total value gracefully"""
        mock_repository.get_portfolio.return_value = {
            'id': 1,
            'total_value': 0.00
        }

        result = await service.generate_rebalancing_suggestions(
            portfolio_id=1,
            holdings=[]
        )

        assert result['status'] == 'ok'
        assert result['suggestions'] == []
        assert 'no value' in result['message'].lower()

    @pytest.mark.asyncio
    async def test_generate_suggestions_publishes_event(self, service, mock_repository, sample_holdings):
        """Should publish PORTFOLIO_CHANGED event after generating suggestions"""
        mock_repository.get_holdings.return_value = sample_holdings

        with patch.object(service, 'publish_event', new_callable=AsyncMock) as mock_publish:
            result = await service.generate_rebalancing_suggestions(
                portfolio_id=1,
                holdings=sample_holdings
            )

            # Verify event was published
            mock_publish.assert_called_once()
            call_args = mock_publish.call_args
            assert call_args[0][0] == EventType.PORTFOLIO_CHANGED
            assert 'portfolio_id' in call_args[0][1]
            assert 'suggestions_count' in call_args[0][1]

    @pytest.mark.asyncio
    async def test_generate_suggestions_clears_old_suggestions(self, service, mock_repository, sample_holdings):
        """Should clear old suggestions before generating new ones"""
        mock_repository.get_holdings.return_value = sample_holdings

        await service.generate_rebalancing_suggestions(
            portfolio_id=1,
            holdings=sample_holdings
        )

        mock_repository.clear_old_suggestions.assert_called_once_with(portfolio_id=1)

    @pytest.mark.asyncio
    async def test_generate_suggestions_saves_to_database(self, service, mock_repository, sample_holdings):
        """Should save generated suggestions to database"""
        mock_repository.get_holdings.return_value = sample_holdings

        await service.generate_rebalancing_suggestions(
            portfolio_id=1,
            holdings=sample_holdings
        )

        # Verify suggestions were saved
        mock_repository.save_suggestions.assert_called_once()
        saved_suggestions = mock_repository.save_suggestions.call_args[1]['suggestions']
        assert isinstance(saved_suggestions, list)
        assert len(saved_suggestions) > 0

    @pytest.mark.asyncio
    async def test_generate_suggestions_with_regenerate_flag(self, service, mock_repository, sample_holdings):
        """Should always generate new suggestions when regenerate=True"""
        mock_repository.get_holdings.return_value = sample_holdings

        # First call
        result1 = await service.generate_rebalancing_suggestions(
            portfolio_id=1,
            holdings=sample_holdings,
            regenerate=True
        )

        # Second call should also generate new ones
        result2 = await service.generate_rebalancing_suggestions(
            portfolio_id=1,
            holdings=sample_holdings,
            regenerate=True
        )

        # Both should generate suggestions
        assert result1['suggestions']
        assert result2['suggestions']
        # Should clear old suggestions twice
        assert mock_repository.clear_old_suggestions.call_count == 2

    # =============================================================================
    # Test _calculate_target_weights() - Signal-based weight calculation
    # =============================================================================

    def test_calculate_target_weights_strong_buy(self, service, sample_holdings):
        """Should increase weight for STRONG_BUY signals"""
        holdings = [h for h in sample_holdings if h['ticker'] == 'BHP.AX']
        total_value = 100000.00
        current_weight = (holdings[0]['current_value'] / total_value) * 100  # 4.55%

        target_weights = service._calculate_target_weights(
            holdings=holdings,
            total_value=total_value
        )

        # Target weight should be higher for strong buy
        assert 'BHP.AX' in target_weights
        assert target_weights['BHP.AX'] > current_weight
        assert target_weights['BHP.AX'] <= 10.0  # Max 10% per holding rule

    def test_calculate_target_weights_strong_sell(self, service, sample_holdings):
        """Should set weight to 0 for STRONG_SELL signals"""
        holdings = [h for h in sample_holdings if h['ticker'] == 'WES.AX']

        target_weights = service._calculate_target_weights(
            holdings=holdings,
            total_value=100000.00
        )

        # Strong sell should target 0% weight
        assert 'WES.AX' in target_weights
        assert target_weights['WES.AX'] == 0.0

    def test_calculate_target_weights_hold(self, service, sample_holdings):
        """Should maintain current weight for HOLD signals"""
        holdings = [h for h in sample_holdings if h['ticker'] == 'CBA.AX']
        total_value = 100000.00
        current_weight = (holdings[0]['current_value'] / total_value) * 100  # 5.25%

        target_weights = service._calculate_target_weights(
            holdings=holdings,
            total_value=total_value
        )

        # Hold should keep current weight
        assert 'CBA.AX' in target_weights
        assert abs(target_weights['CBA.AX'] - current_weight) < 0.5  # Within 0.5%

    def test_calculate_target_weights_respects_max_position_size(self, service):
        """Should enforce max 10% position size rule"""
        holdings = [
            {
                'ticker': 'BHP.AX',
                'current_value': 15000.00,  # 15% of portfolio
                'current_signal': 'STRONG_BUY',
                'signal_confidence': 95.0,
                'current_price': 45.50
            }
        ]

        target_weights = service._calculate_target_weights(
            holdings=holdings,
            total_value=100000.00
        )

        # Even with strong buy, should cap at 10%
        assert target_weights['BHP.AX'] <= 10.0

    def test_calculate_target_weights_respects_min_position_size(self, service):
        """Should enforce min 2% position size for active holdings"""
        holdings = [
            {
                'ticker': 'STO.AX',
                'current_value': 1000.00,  # 1% of portfolio
                'current_signal': 'BUY',
                'signal_confidence': 70.0,
                'current_price': 5.00
            }
        ]

        target_weights = service._calculate_target_weights(
            holdings=holdings,
            total_value=100000.00
        )

        # Buy signal with small position should increase to min 2%
        assert target_weights['STO.AX'] >= 2.0 or target_weights['STO.AX'] == 0.0

    def test_calculate_target_weights_with_no_signal(self, service):
        """Should handle holdings with no signal data"""
        holdings = [
            {
                'ticker': 'UNKNOWN.AX',
                'current_value': 5000.00,
                'current_signal': None,
                'signal_confidence': None,
                'current_price': 10.00
            }
        ]

        target_weights = service._calculate_target_weights(
            holdings=holdings,
            total_value=100000.00
        )

        # No signal should default to maintaining current weight
        assert 'UNKNOWN.AX' in target_weights
        current_weight = (5000.00 / 100000.00) * 100
        assert abs(target_weights['UNKNOWN.AX'] - current_weight) < 0.5

    # =============================================================================
    # Test _generate_actions() - Buy/Sell/Hold/Trim/Add action generation
    # =============================================================================

    def test_generate_actions_sell_action(self, service):
        """Should generate SELL action when target weight is 0"""
        current_weights = {'WES.AX': 5.0}
        target_weights = {'WES.AX': 0.0}
        holdings = [
            {
                'ticker': 'WES.AX',
                'shares': 100.0,
                'current_price': 32.00,
                'current_value': 3200.00,
                'current_signal': 'STRONG_SELL',
                'signal_confidence': 75.0
            }
        ]

        actions = service._generate_actions(
            current_weights=current_weights,
            target_weights=target_weights,
            holdings=holdings,
            total_value=100000.00
        )

        assert len(actions) == 1
        assert actions[0]['action'] == 'SELL'
        assert actions[0]['ticker'] == 'WES.AX'
        assert actions[0]['suggested_quantity'] == 100.0
        assert 'STRONG_SELL' in actions[0]['reason'] or 'sell' in actions[0]['reason'].lower()

    def test_generate_actions_trim_action(self, service):
        """Should generate TRIM action when target weight is lower but not 0"""
        current_weights = {'BHP.AX': 12.0}
        target_weights = {'BHP.AX': 8.0}
        holdings = [
            {
                'ticker': 'BHP.AX',
                'shares': 200.0,
                'current_price': 60.00,
                'current_value': 12000.00,
                'current_signal': 'SELL',
                'signal_confidence': 65.0
            }
        ]

        actions = service._generate_actions(
            current_weights=current_weights,
            target_weights=target_weights,
            holdings=holdings,
            total_value=100000.00
        )

        assert len(actions) == 1
        assert actions[0]['action'] == 'TRIM'
        assert actions[0]['ticker'] == 'BHP.AX'
        assert actions[0]['suggested_quantity'] > 0
        assert actions[0]['suggested_quantity'] < 200.0  # Less than full position

    def test_generate_actions_add_action(self, service):
        """Should generate ADD action when target weight is higher"""
        current_weights = {'CBA.AX': 5.0}
        target_weights = {'CBA.AX': 8.0}
        holdings = [
            {
                'ticker': 'CBA.AX',
                'shares': 50.0,
                'current_price': 100.00,
                'current_value': 5000.00,
                'current_signal': 'STRONG_BUY',
                'signal_confidence': 85.0
            }
        ]

        actions = service._generate_actions(
            current_weights=current_weights,
            target_weights=target_weights,
            holdings=holdings,
            total_value=100000.00
        )

        assert len(actions) == 1
        assert actions[0]['action'] == 'ADD'
        assert actions[0]['ticker'] == 'CBA.AX'
        assert actions[0]['suggested_quantity'] > 0
        assert actions[0]['target_weight_pct'] > actions[0]['current_weight_pct']

    def test_generate_actions_hold_action(self, service):
        """Should generate HOLD action when weights are similar"""
        current_weights = {'NAB.AX': 5.0}
        target_weights = {'NAB.AX': 5.2}  # Small difference
        holdings = [
            {
                'ticker': 'NAB.AX',
                'shares': 100.0,
                'current_price': 50.00,
                'current_value': 5000.00,
                'current_signal': 'HOLD',
                'signal_confidence': 60.0
            }
        ]

        actions = service._generate_actions(
            current_weights=current_weights,
            target_weights=target_weights,
            holdings=holdings,
            total_value=100000.00,
            threshold=0.5  # 0.5% threshold
        )

        # Should not generate action for small difference
        # Or should generate HOLD action
        if len(actions) > 0:
            assert actions[0]['action'] == 'HOLD'

    def test_generate_actions_buy_new_position(self, service):
        """Should generate BUY action for new positions"""
        current_weights = {}  # Not in portfolio yet
        target_weights = {'RIO.AX': 5.0}
        holdings = []  # New holding

        actions = service._generate_actions(
            current_weights=current_weights,
            target_weights=target_weights,
            holdings=holdings,
            total_value=100000.00
        )

        # This should be handled differently - new positions are BUY
        # For existing holdings, we ADD
        assert isinstance(actions, list)

    def test_generate_actions_includes_confidence_score(self, service):
        """Should include confidence score based on signal strength"""
        current_weights = {'BHP.AX': 5.0}
        target_weights = {'BHP.AX': 8.0}
        holdings = [
            {
                'ticker': 'BHP.AX',
                'shares': 100.0,
                'current_price': 50.00,
                'current_value': 5000.00,
                'current_signal': 'STRONG_BUY',
                'signal_confidence': 90.0
            }
        ]

        actions = service._generate_actions(
            current_weights=current_weights,
            target_weights=target_weights,
            holdings=holdings,
            total_value=100000.00
        )

        assert len(actions) > 0
        assert 'confidence_score' in actions[0]
        assert actions[0]['confidence_score'] >= 80.0  # High confidence for strong buy

    # =============================================================================
    # Test _prioritize_suggestions() - Ranking by impact
    # =============================================================================

    def test_prioritize_suggestions_by_confidence(self, service):
        """Should prioritize suggestions with higher confidence"""
        suggestions = [
            {
                'ticker': 'BHP.AX',
                'action': 'ADD',
                'confidence_score': 60.0,
                'suggested_value': 1000.00
            },
            {
                'ticker': 'CBA.AX',
                'action': 'SELL',
                'confidence_score': 90.0,
                'suggested_value': 5000.00
            },
            {
                'ticker': 'WES.AX',
                'action': 'TRIM',
                'confidence_score': 75.0,
                'suggested_value': 2000.00
            }
        ]

        prioritized = service._prioritize_suggestions(suggestions)

        # Higher confidence should come first
        assert prioritized[0]['confidence_score'] >= prioritized[1]['confidence_score']
        assert prioritized[1]['confidence_score'] >= prioritized[2]['confidence_score']

    def test_prioritize_suggestions_by_impact_value(self, service):
        """Should consider suggested value (impact) in prioritization"""
        suggestions = [
            {
                'ticker': 'BHP.AX',
                'action': 'ADD',
                'confidence_score': 80.0,
                'suggested_value': 1000.00
            },
            {
                'ticker': 'CBA.AX',
                'action': 'SELL',
                'confidence_score': 80.0,
                'suggested_value': 10000.00
            }
        ]

        prioritized = service._prioritize_suggestions(suggestions)

        # With same confidence, higher value should be prioritized
        assert prioritized[0]['suggested_value'] >= prioritized[1]['suggested_value']

    def test_prioritize_suggestions_assigns_priority_numbers(self, service):
        """Should assign sequential priority numbers starting from 1"""
        suggestions = [
            {'ticker': 'A.AX', 'action': 'SELL', 'confidence_score': 90.0, 'suggested_value': 5000.00},
            {'ticker': 'B.AX', 'action': 'BUY', 'confidence_score': 85.0, 'suggested_value': 3000.00},
            {'ticker': 'C.AX', 'action': 'TRIM', 'confidence_score': 70.0, 'suggested_value': 2000.00}
        ]

        prioritized = service._prioritize_suggestions(suggestions)

        # Should have priority 1, 2, 3
        assert prioritized[0]['priority'] == 1
        assert prioritized[1]['priority'] == 2
        assert prioritized[2]['priority'] == 3

    def test_prioritize_suggestions_sell_over_trim(self, service):
        """Should prioritize SELL actions over TRIM with similar confidence"""
        suggestions = [
            {
                'ticker': 'BHP.AX',
                'action': 'TRIM',
                'confidence_score': 75.0,
                'suggested_value': 3000.00
            },
            {
                'ticker': 'CBA.AX',
                'action': 'SELL',
                'confidence_score': 75.0,
                'suggested_value': 3000.00
            }
        ]

        prioritized = service._prioritize_suggestions(suggestions)

        # SELL should be prioritized over TRIM when confidence is similar
        sell_actions = [s for s in prioritized if s['action'] == 'SELL']
        trim_actions = [s for s in prioritized if s['action'] == 'TRIM']

        if sell_actions and trim_actions:
            sell_priority = sell_actions[0]['priority']
            trim_priority = trim_actions[0]['priority']
            assert sell_priority < trim_priority

    def test_prioritize_suggestions_empty_list(self, service):
        """Should handle empty suggestions list"""
        suggestions = []

        prioritized = service._prioritize_suggestions(suggestions)

        assert prioritized == []

    # =============================================================================
    # Integration Tests - Full workflow
    # =============================================================================

    @pytest.mark.asyncio
    async def test_full_workflow_with_mixed_signals(self, service, mock_repository):
        """Test complete workflow with various signal types"""
        holdings = [
            {
                'ticker': 'BHP.AX',
                'shares': 100.0,
                'current_price': 45.00,
                'current_value': 4500.00,
                'current_signal': 'STRONG_BUY',
                'signal_confidence': 88.0
            },
            {
                'ticker': 'WES.AX',
                'shares': 300.0,
                'current_price': 50.00,
                'current_value': 15000.00,
                'current_signal': 'STRONG_SELL',
                'signal_confidence': 82.0
            },
            {
                'ticker': 'CBA.AX',
                'shares': 80.0,
                'current_price': 100.00,
                'current_value': 8000.00,
                'current_signal': 'HOLD',
                'signal_confidence': 60.0
            }
        ]

        mock_repository.get_portfolio.return_value = {
            'id': 1,
            'total_value': 27500.00
        }
        mock_repository.get_holdings.return_value = holdings

        result = await service.generate_rebalancing_suggestions(
            portfolio_id=1,
            holdings=holdings
        )

        # Should generate multiple suggestions
        assert result['status'] == 'ok'
        assert len(result['suggestions']) >= 2  # At least SELL and ADD

        # Should have prioritized suggestions
        priorities = [s['priority'] for s in result['suggestions']]
        assert priorities == sorted(priorities)  # Ascending priority order

        # Should include required fields
        for suggestion in result['suggestions']:
            assert 'ticker' in suggestion
            assert 'action' in suggestion
            assert 'reason' in suggestion
            assert 'confidence_score' in suggestion
            assert 'priority' in suggestion

    @pytest.mark.asyncio
    async def test_handles_overweight_positions(self, service, mock_repository):
        """Should identify and suggest trimming overweight positions"""
        holdings = [
            {
                'ticker': 'OVERWEIGHT.AX',
                'shares': 500.0,
                'current_price': 40.00,
                'current_value': 20000.00,  # 20% of portfolio
                'current_signal': 'HOLD',
                'signal_confidence': 60.0
            }
        ]

        mock_repository.get_portfolio.return_value = {
            'id': 1,
            'total_value': 100000.00
        }
        mock_repository.get_holdings.return_value = holdings

        result = await service.generate_rebalancing_suggestions(
            portfolio_id=1,
            holdings=holdings
        )

        # Should suggest trimming overweight position (>15%)
        assert len(result['suggestions']) > 0
        suggestion = result['suggestions'][0]
        assert suggestion['ticker'] == 'OVERWEIGHT.AX'
        assert suggestion['action'] in ['TRIM', 'SELL']
        assert 'overweight' in suggestion['reason'].lower() or 'concentration' in suggestion['reason'].lower()

    @pytest.mark.asyncio
    async def test_error_handling_database_failure(self, service, mock_repository):
        """Should handle database errors gracefully"""
        mock_repository.get_holdings.side_effect = Exception("Database connection failed")

        with pytest.raises(Exception) as exc_info:
            await service.generate_rebalancing_suggestions(
                portfolio_id=1,
                holdings=[]
            )

        assert "Database" in str(exc_info.value) or "connection" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_caches_suggestions_for_24_hours(self, service, mock_repository):
        """Should cache suggestions and return cached version if recent"""
        # This test assumes caching logic exists
        # Implementation depends on service design
        pass  # TODO: Implement when caching is added
