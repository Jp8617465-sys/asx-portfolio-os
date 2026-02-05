"""
Tests for RiskMetricsService

Following TDD principles:
1. Write tests FIRST (Red)
2. Implement minimal code to pass (Green)
3. Refactor and improve (Refactor)

This test suite covers:
- calculate_risk_metrics() - main orchestration
- _calculate_sharpe_ratio() - risk-adjusted returns
- _calculate_volatility() - annualized standard deviation
- _calculate_beta() - market correlation
- _calculate_max_drawdown() - worst peak-to-trough decline
- _calculate_correlation_matrix() - diversification analysis
"""

import pytest
import numpy as np
import pandas as pd
from datetime import datetime, timedelta, date
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from typing import List, Dict, Any

# Import will fail until we create the service - that's expected in TDD!
# from app.features.portfolio.services.risk_service import RiskMetricsService
from app.core.events.event_bus import EventType


class TestRiskMetricsService:
    """Test suite for RiskMetricsService"""

    @pytest.fixture
    def mock_repository(self):
        """Mock repository for database operations"""
        repo = Mock()
        repo.get_portfolio = Mock(return_value={
            'id': 1,
            'user_id': 'user123',
            'total_value': 100000.00
        })
        repo.get_holdings = Mock(return_value=[])
        repo.get_historical_prices = Mock(return_value=[])
        repo.get_benchmark_prices = Mock(return_value=[])
        repo.save_risk_metrics = Mock()
        repo.get_cached_metrics = Mock(return_value=None)
        return repo

    @pytest.fixture
    def service(self, mock_repository):
        """Create service instance with mocked dependencies"""
        from app.features.portfolio.services.risk_service import RiskMetricsService
        return RiskMetricsService(repository=mock_repository)

    @pytest.fixture
    def sample_holdings(self):
        """Sample holdings for testing"""
        return [
            {
                'ticker': 'BHP.AX',
                'shares': 100.0,
                'current_price': 45.50,
                'current_value': 4550.00,
                'unrealized_pl_pct': 12.5,
                'current_signal': 'BUY'
            },
            {
                'ticker': 'CBA.AX',
                'shares': 50.0,
                'current_price': 105.00,
                'current_value': 5250.00,
                'unrealized_pl_pct': -5.2,
                'current_signal': 'HOLD'
            },
            {
                'ticker': 'WES.AX',
                'shares': 200.0,
                'current_price': 32.00,
                'current_value': 6400.00,
                'unrealized_pl_pct': 8.3,
                'current_signal': 'SELL'
            }
        ]

    @pytest.fixture
    def sample_price_history(self):
        """Sample price history for 252 trading days (1 year)"""
        dates = pd.date_range(end=datetime.now(), periods=252, freq='B')

        # Generate realistic price movements
        np.random.seed(42)
        returns = np.random.normal(0.0005, 0.015, 252)  # 0.05% mean, 1.5% std
        prices = 100 * (1 + returns).cumprod()

        return pd.DataFrame({
            'date': dates,
            'close': prices
        })

    @pytest.fixture
    def sample_returns(self):
        """Sample daily returns for testing"""
        np.random.seed(42)
        return np.random.normal(0.0005, 0.015, 252)

    # =============================================================================
    # Test calculate_risk_metrics() - Main orchestration method
    # =============================================================================

    @pytest.mark.asyncio
    async def test_calculate_metrics_with_no_holdings(self, service, mock_repository):
        """Should handle portfolio with no holdings"""
        mock_repository.get_holdings.return_value = []

        with pytest.raises(Exception) as exc_info:
            await service.calculate_risk_metrics(portfolio_id=1)

        assert "No holdings" in str(exc_info.value) or "cannot calculate" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_calculate_metrics_returns_all_metrics(self, service, mock_repository, sample_holdings, sample_price_history):
        """Should return all risk metrics"""
        mock_repository.get_holdings.return_value = sample_holdings
        mock_repository.get_historical_prices.return_value = sample_price_history

        result = await service.calculate_risk_metrics(portfolio_id=1)

        # Verify all metrics are present
        assert 'as_of' in result
        assert 'total_return_pct' in result
        assert 'volatility' in result
        assert 'sharpe_ratio' in result
        assert 'beta' in result
        assert 'max_drawdown_pct' in result
        assert 'top_holding_weight_pct' in result
        assert 'signal_distribution' in result

    @pytest.mark.asyncio
    async def test_calculate_metrics_uses_cached_if_recent(self, service, mock_repository):
        """Should use cached metrics if calculated today"""
        cached = {
            'as_of': date.today().isoformat(),
            'volatility': 15.5,
            'sharpe_ratio': 1.2,
            'beta': 0.95
        }
        mock_repository.get_cached_metrics.return_value = cached

        result = await service.calculate_risk_metrics(
            portfolio_id=1,
            recalculate=False
        )

        assert result == cached
        # Should not fetch historical prices if using cache
        mock_repository.get_historical_prices.assert_not_called()

    @pytest.mark.asyncio
    async def test_calculate_metrics_recalculates_when_forced(self, service, mock_repository, sample_holdings, sample_price_history):
        """Should recalculate even if cache exists when recalculate=True"""
        cached = {
            'as_of': date.today().isoformat(),
            'volatility': 15.5
        }
        mock_repository.get_cached_metrics.return_value = cached
        mock_repository.get_holdings.return_value = sample_holdings
        mock_repository.get_historical_prices.return_value = sample_price_history

        result = await service.calculate_risk_metrics(
            portfolio_id=1,
            recalculate=True
        )

        # Should have fetched new data
        mock_repository.get_historical_prices.assert_called()

    @pytest.mark.asyncio
    async def test_calculate_metrics_saves_to_database(self, service, mock_repository, sample_holdings, sample_price_history):
        """Should save calculated metrics to database"""
        mock_repository.get_holdings.return_value = sample_holdings
        mock_repository.get_historical_prices.return_value = sample_price_history

        await service.calculate_risk_metrics(portfolio_id=1)

        mock_repository.save_risk_metrics.assert_called_once()

    @pytest.mark.asyncio
    async def test_calculate_metrics_publishes_event(self, service, mock_repository, sample_holdings, sample_price_history):
        """Should publish event after calculating metrics"""
        mock_repository.get_holdings.return_value = sample_holdings
        mock_repository.get_historical_prices.return_value = sample_price_history

        with patch.object(service, 'publish_event', new_callable=AsyncMock) as mock_publish:
            await service.calculate_risk_metrics(portfolio_id=1)

            # Verify event was published
            mock_publish.assert_called_once()

    # =============================================================================
    # Test _calculate_sharpe_ratio() - Risk-adjusted returns
    # =============================================================================

    def test_sharpe_ratio_positive_returns(self, service):
        """Should calculate correct Sharpe ratio for positive returns"""
        # Annualized return: 10%, Risk-free rate: 2%, Volatility: 15%
        # Sharpe = (10 - 2) / 15 = 0.533
        returns = np.array([0.0004] * 252)  # ~10% annual
        risk_free_rate = 2.0
        volatility = 15.0

        sharpe = service._calculate_sharpe_ratio(
            returns=returns,
            risk_free_rate=risk_free_rate,
            volatility=volatility
        )

        assert sharpe is not None
        assert isinstance(sharpe, float)
        assert sharpe > 0  # Positive returns should give positive Sharpe

    def test_sharpe_ratio_negative_returns(self, service):
        """Should calculate correct Sharpe ratio for negative returns"""
        # Annualized return: -5%, Risk-free rate: 2%, Volatility: 15%
        # Sharpe = (-5 - 2) / 15 = -0.467
        returns = np.array([-0.0002] * 252)  # ~-5% annual
        risk_free_rate = 2.0
        volatility = 15.0

        sharpe = service._calculate_sharpe_ratio(
            returns=returns,
            risk_free_rate=risk_free_rate,
            volatility=volatility
        )

        assert sharpe is not None
        assert sharpe < 0  # Negative returns should give negative Sharpe

    def test_sharpe_ratio_zero_volatility(self, service):
        """Should handle zero volatility gracefully"""
        returns = np.array([0.0] * 252)  # No volatility
        risk_free_rate = 2.0
        volatility = 0.0

        sharpe = service._calculate_sharpe_ratio(
            returns=returns,
            risk_free_rate=risk_free_rate,
            volatility=volatility
        )

        assert sharpe is None or sharpe == 0.0  # Undefined or zero

    def test_sharpe_ratio_high_volatility_low_returns(self, service):
        """Should give low Sharpe ratio for high volatility with low returns"""
        returns = np.array([0.0001] * 252)  # ~2.5% annual
        risk_free_rate = 2.0
        volatility = 30.0  # High volatility

        sharpe = service._calculate_sharpe_ratio(
            returns=returns,
            risk_free_rate=risk_free_rate,
            volatility=volatility
        )

        assert sharpe is not None
        assert sharpe < 0.5  # Low Sharpe for poor risk-adjusted returns

    def test_sharpe_ratio_uses_default_risk_free_rate(self, service):
        """Should use default risk-free rate if not provided"""
        returns = np.array([0.0004] * 252)
        volatility = 15.0

        sharpe = service._calculate_sharpe_ratio(
            returns=returns,
            volatility=volatility
            # No risk_free_rate provided
        )

        assert sharpe is not None

    # =============================================================================
    # Test _calculate_volatility() - Annualized standard deviation
    # =============================================================================

    def test_volatility_calculation(self, service, sample_returns):
        """Should calculate annualized volatility correctly"""
        volatility = service._calculate_volatility(sample_returns)

        assert volatility is not None
        assert isinstance(volatility, float)
        assert volatility > 0
        # Annualized volatility = std * sqrt(252)
        expected = np.std(sample_returns) * np.sqrt(252) * 100
        assert abs(volatility - expected) < 0.01

    def test_volatility_zero_variance(self, service):
        """Should handle zero variance (constant returns)"""
        returns = np.array([0.0001] * 252)  # Constant returns

        volatility = service._calculate_volatility(returns)

        assert volatility == 0.0 or volatility < 0.001

    def test_volatility_high_variance(self, service):
        """Should calculate high volatility for volatile returns"""
        np.random.seed(42)
        returns = np.random.normal(0, 0.05, 252)  # High std dev

        volatility = service._calculate_volatility(returns)

        assert volatility > 50.0  # Should be high volatility

    def test_volatility_empty_returns(self, service):
        """Should handle empty returns array"""
        returns = np.array([])

        volatility = service._calculate_volatility(returns)

        assert volatility is None or volatility == 0.0

    def test_volatility_single_return(self, service):
        """Should handle single return value"""
        returns = np.array([0.001])

        volatility = service._calculate_volatility(returns)

        # Single value has no variance
        assert volatility is None or volatility == 0.0

    # =============================================================================
    # Test _calculate_beta() - Market correlation
    # =============================================================================

    def test_beta_positive_correlation(self, service):
        """Should calculate positive beta for positively correlated returns"""
        # Create correlated returns
        np.random.seed(42)
        benchmark_returns = np.random.normal(0.0005, 0.01, 252)
        portfolio_returns = benchmark_returns * 1.2 + np.random.normal(0, 0.005, 252)

        beta = service._calculate_beta(
            portfolio_returns=portfolio_returns,
            benchmark_returns=benchmark_returns
        )

        assert beta is not None
        assert beta > 0  # Positive correlation

    def test_beta_negative_correlation(self, service):
        """Should calculate negative beta for negatively correlated returns"""
        np.random.seed(42)
        benchmark_returns = np.random.normal(0.0005, 0.01, 252)
        portfolio_returns = -benchmark_returns * 0.8 + np.random.normal(0, 0.005, 252)

        beta = service._calculate_beta(
            portfolio_returns=portfolio_returns,
            benchmark_returns=benchmark_returns
        )

        assert beta is not None
        assert beta < 0  # Negative correlation

    def test_beta_defensive_portfolio(self, service):
        """Should calculate beta < 1 for defensive portfolio"""
        np.random.seed(42)
        benchmark_returns = np.random.normal(0.0005, 0.01, 252)
        # Portfolio moves less than market
        portfolio_returns = benchmark_returns * 0.5 + np.random.normal(0, 0.003, 252)

        beta = service._calculate_beta(
            portfolio_returns=portfolio_returns,
            benchmark_returns=benchmark_returns
        )

        assert beta is not None
        assert 0 < beta < 1  # Defensive

    def test_beta_aggressive_portfolio(self, service):
        """Should calculate beta > 1 for aggressive portfolio"""
        np.random.seed(42)
        benchmark_returns = np.random.normal(0.0005, 0.01, 252)
        # Portfolio moves more than market
        portfolio_returns = benchmark_returns * 1.5 + np.random.normal(0, 0.015, 252)

        beta = service._calculate_beta(
            portfolio_returns=portfolio_returns,
            benchmark_returns=benchmark_returns
        )

        assert beta is not None
        assert beta > 1  # Aggressive

    def test_beta_zero_benchmark_variance(self, service):
        """Should handle zero benchmark variance"""
        portfolio_returns = np.random.normal(0.001, 0.01, 252)
        benchmark_returns = np.array([0.0005] * 252)  # Constant

        beta = service._calculate_beta(
            portfolio_returns=portfolio_returns,
            benchmark_returns=benchmark_returns
        )

        assert beta is None or beta == 0.0

    def test_beta_uses_xjo_as_default_benchmark(self, service, mock_repository):
        """Should use XJO.AX as default benchmark"""
        # This tests the integration with repository
        pass  # TODO: Implement when integration is complete

    # =============================================================================
    # Test _calculate_max_drawdown() - Worst peak-to-trough decline
    # =============================================================================

    def test_max_drawdown_with_decline(self, service):
        """Should calculate max drawdown correctly"""
        # Cumulative returns: 1.0, 1.1, 1.2, 0.9, 1.0, 1.15
        # Max drawdown: (1.2 - 0.9) / 1.2 = 25%
        cumulative_returns = np.array([1.0, 1.1, 1.2, 0.9, 1.0, 1.15])

        max_dd = service._calculate_max_drawdown(cumulative_returns)

        assert max_dd is not None
        expected = -25.0  # -25% drawdown
        assert abs(max_dd - expected) < 1.0

    def test_max_drawdown_always_increasing(self, service):
        """Should return 0 for always increasing returns"""
        cumulative_returns = np.array([1.0, 1.1, 1.2, 1.3, 1.4, 1.5])

        max_dd = service._calculate_max_drawdown(cumulative_returns)

        assert max_dd == 0.0

    def test_max_drawdown_severe_decline(self, service):
        """Should calculate severe drawdown correctly"""
        # 50% crash
        cumulative_returns = np.array([1.0, 1.5, 2.0, 1.0, 1.2])

        max_dd = service._calculate_max_drawdown(cumulative_returns)

        assert max_dd is not None
        assert max_dd < -40.0  # At least 40% drawdown

    def test_max_drawdown_multiple_declines(self, service):
        """Should find the maximum among multiple drawdowns"""
        # Two drawdowns: 20% and 30%
        cumulative_returns = np.array([1.0, 1.2, 1.0, 1.4, 0.98, 1.1])

        max_dd = service._calculate_max_drawdown(cumulative_returns)

        assert max_dd is not None
        assert max_dd < -25.0  # Should find the 30% drawdown

    def test_max_drawdown_empty_array(self, service):
        """Should handle empty array"""
        cumulative_returns = np.array([])

        max_dd = service._calculate_max_drawdown(cumulative_returns)

        assert max_dd is None or max_dd == 0.0

    def test_max_drawdown_single_value(self, service):
        """Should handle single value"""
        cumulative_returns = np.array([1.0])

        max_dd = service._calculate_max_drawdown(cumulative_returns)

        assert max_dd == 0.0

    # =============================================================================
    # Test _calculate_correlation_matrix() - Diversification analysis
    # =============================================================================

    def test_correlation_matrix_multiple_holdings(self, service, mock_repository):
        """Should calculate correlation matrix for multiple holdings"""
        # Mock price data for 3 stocks
        dates = pd.date_range(end=datetime.now(), periods=100, freq='B')

        price_data = {
            'BHP.AX': pd.DataFrame({'date': dates, 'close': np.random.randn(100).cumsum() + 100}),
            'CBA.AX': pd.DataFrame({'date': dates, 'close': np.random.randn(100).cumsum() + 100}),
            'WES.AX': pd.DataFrame({'date': dates, 'close': np.random.randn(100).cumsum() + 50})
        }

        mock_repository.get_historical_prices.side_effect = lambda ticker: price_data[ticker]

        holdings = [
            {'ticker': 'BHP.AX'},
            {'ticker': 'CBA.AX'},
            {'ticker': 'WES.AX'}
        ]

        corr_matrix = service._calculate_correlation_matrix(
            holdings=holdings,
            repository=mock_repository
        )

        assert corr_matrix is not None
        assert isinstance(corr_matrix, (dict, pd.DataFrame, np.ndarray))

        # Should have 3x3 matrix
        if isinstance(corr_matrix, dict):
            assert len(corr_matrix) == 3

    def test_correlation_matrix_single_holding(self, service, mock_repository):
        """Should handle single holding (no diversification)"""
        holdings = [{'ticker': 'BHP.AX'}]

        corr_matrix = service._calculate_correlation_matrix(
            holdings=holdings,
            repository=mock_repository
        )

        # Single holding has correlation of 1 with itself
        assert corr_matrix is not None

    def test_correlation_matrix_perfectly_correlated(self, service):
        """Should show high correlation for perfectly correlated stocks"""
        # This would require mocking identical price movements
        pass  # TODO: Implement with detailed mocks

    def test_correlation_matrix_uncorrelated(self, service):
        """Should show low correlation for uncorrelated stocks"""
        # This would require mocking independent price movements
        pass  # TODO: Implement with detailed mocks

    # =============================================================================
    # Integration Tests - Full workflow
    # =============================================================================

    @pytest.mark.asyncio
    async def test_full_workflow_realistic_data(self, service, mock_repository, sample_holdings):
        """Test complete workflow with realistic data"""
        # Setup realistic price history
        dates = pd.date_range(end=datetime.now(), periods=252, freq='B')
        np.random.seed(42)

        # BHP: Moderately volatile mining stock
        bhp_returns = np.random.normal(0.0006, 0.018, 252)
        bhp_prices = 40 * (1 + bhp_returns).cumprod()

        # CBA: Stable bank stock
        cba_returns = np.random.normal(0.0004, 0.012, 252)
        cba_prices = 90 * (1 + cba_returns).cumprod()

        # WES: Retail stock
        wes_returns = np.random.normal(0.0005, 0.015, 252)
        wes_prices = 30 * (1 + wes_returns).cumprod()

        # XJO: Benchmark
        xjo_returns = np.random.normal(0.0005, 0.01, 252)
        xjo_prices = 7000 * (1 + xjo_returns).cumprod()

        price_data = {
            'BHP.AX': pd.DataFrame({'date': dates, 'close': bhp_prices}),
            'CBA.AX': pd.DataFrame({'date': dates, 'close': cba_prices}),
            'WES.AX': pd.DataFrame({'date': dates, 'close': wes_prices}),
            'XJO.AX': pd.DataFrame({'date': dates, 'close': xjo_prices})
        }

        mock_repository.get_holdings.return_value = sample_holdings
        mock_repository.get_historical_prices.side_effect = lambda ticker: price_data.get(ticker, pd.DataFrame())

        result = await service.calculate_risk_metrics(portfolio_id=1)

        # Verify comprehensive metrics
        assert result['as_of'] is not None
        assert result['volatility'] is not None
        assert result['volatility'] > 0
        assert result['sharpe_ratio'] is not None
        assert result['beta'] is not None
        assert result['max_drawdown_pct'] is not None
        assert result['max_drawdown_pct'] <= 0  # Drawdown is negative
        assert result['top_holding_weight_pct'] is not None
        assert result['signal_distribution'] is not None

    @pytest.mark.asyncio
    async def test_calculates_concentration_metrics(self, service, mock_repository, sample_holdings):
        """Should calculate portfolio concentration metrics"""
        total_value = sum(h['current_value'] for h in sample_holdings)
        mock_repository.get_portfolio.return_value = {
            'id': 1,
            'total_value': total_value
        }
        mock_repository.get_holdings.return_value = sample_holdings

        # Mock minimal price data to avoid errors
        mock_repository.get_historical_prices.return_value = pd.DataFrame({
            'date': pd.date_range(end=datetime.now(), periods=10, freq='B'),
            'close': np.linspace(100, 110, 10)
        })

        result = await service.calculate_risk_metrics(portfolio_id=1)

        assert 'top_holding_weight_pct' in result
        assert result['top_holding_weight_pct'] > 0

        # Top holding should be WES.AX with 6400/16200 = 39.5%
        expected_top_weight = (6400.00 / total_value) * 100
        assert abs(result['top_holding_weight_pct'] - expected_top_weight) < 1.0

    @pytest.mark.asyncio
    async def test_calculates_signal_distribution(self, service, mock_repository, sample_holdings):
        """Should calculate distribution of signals in portfolio"""
        mock_repository.get_holdings.return_value = sample_holdings
        mock_repository.get_historical_prices.return_value = pd.DataFrame({
            'date': pd.date_range(end=datetime.now(), periods=10, freq='B'),
            'close': np.linspace(100, 110, 10)
        })

        result = await service.calculate_risk_metrics(portfolio_id=1)

        assert 'signal_distribution' in result
        signal_dist = result['signal_distribution']

        assert 'BUY' in signal_dist or signal_dist.get('BUY', 0) >= 0
        assert 'HOLD' in signal_dist or signal_dist.get('HOLD', 0) >= 0
        assert 'SELL' in signal_dist or signal_dist.get('SELL', 0) >= 0

    @pytest.mark.asyncio
    async def test_handles_insufficient_price_history(self, service, mock_repository, sample_holdings):
        """Should handle case where price history is insufficient"""
        mock_repository.get_holdings.return_value = sample_holdings

        # Only 10 days of data (insufficient for annual metrics)
        short_history = pd.DataFrame({
            'date': pd.date_range(end=datetime.now(), periods=10, freq='B'),
            'close': np.random.randn(10).cumsum() + 100
        })
        mock_repository.get_historical_prices.return_value = short_history

        result = await service.calculate_risk_metrics(portfolio_id=1)

        # Should still return result, but some metrics might be None or estimated
        assert result is not None
        assert 'volatility' in result

    @pytest.mark.asyncio
    async def test_error_handling_missing_benchmark(self, service, mock_repository, sample_holdings):
        """Should handle missing benchmark data gracefully"""
        mock_repository.get_holdings.return_value = sample_holdings
        mock_repository.get_historical_prices.side_effect = lambda ticker: pd.DataFrame() if ticker == 'XJO.AX' else pd.DataFrame({
            'date': pd.date_range(end=datetime.now(), periods=100, freq='B'),
            'close': np.random.randn(100).cumsum() + 100
        })

        result = await service.calculate_risk_metrics(portfolio_id=1)

        # Beta might be None or use fallback value
        assert result is not None
        # Beta should be None or default to 1.0
        assert result.get('beta') is None or result.get('beta') == 1.0

    @pytest.mark.asyncio
    async def test_performance_with_large_dataset(self, service, mock_repository):
        """Should handle large datasets efficiently"""
        # 5 years of daily data
        dates = pd.date_range(end=datetime.now(), periods=1260, freq='B')

        holdings = [
            {
                'ticker': f'STOCK{i}.AX',
                'shares': 100.0,
                'current_price': 50.0,
                'current_value': 5000.0,
                'unrealized_pl_pct': 5.0,
                'current_signal': 'HOLD'
            }
            for i in range(20)
        ]

        mock_repository.get_holdings.return_value = holdings
        mock_repository.get_historical_prices.return_value = pd.DataFrame({
            'date': dates,
            'close': np.random.randn(1260).cumsum() + 100
        })

        # Should complete in reasonable time
        import time
        start = time.time()
        result = await service.calculate_risk_metrics(portfolio_id=1)
        duration = time.time() - start

        assert duration < 5.0  # Should complete in under 5 seconds
        assert result is not None
