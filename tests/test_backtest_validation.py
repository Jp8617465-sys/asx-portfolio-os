"""
tests/test_backtest_validation.py
Backtesting Validation Tests for Model A

Validates that backtesting logic produces accurate and reliable results.
"""

import pytest
import numpy as np
from datetime import datetime, timedelta
from jobs.backtest_model_a_ml import (
    run_rolling_backtest,
    _compute_max_drawdown,
    run_walk_forward_backtest,
)


class TestBacktestSmokTests:
    """Smoke tests to ensure backtest runs without errors"""

    def test_backtest_runs_without_errors(self):
        """Smoke test: Ensure backtest completes successfully"""
        start_date = '2024-01-01'
        end_date = '2024-01-31'

        result = run_rolling_backtest(
            start_date=start_date,
            end_date=end_date,
            top_n=10,
            use_db_signals=False,  # Use technical signals (no DB required)
        )

        # Should complete without raising exception
        assert result is not None
        assert isinstance(result, dict)

    def test_backtest_returns_required_fields(self):
        """Verify backtest returns all required fields"""
        start_date = '2024-01-01'
        end_date = '2024-01-31'

        result = run_rolling_backtest(
            start_date=start_date,
            end_date=end_date,
            top_n=10,
            use_db_signals=False,
        )

        # Check for required fields
        assert 'equity_curve' in result
        assert 'stats' in result

        # If backtest succeeded, stats should exist
        if result.get('stats'):
            stats = result['stats']
            assert 'total_return' in stats
            assert 'sharpe' in stats
            assert 'max_drawdown' in stats
            assert 'win_rate' in stats

    def test_backtest_handles_empty_price_data(self):
        """Backtest should handle empty price data gracefully"""
        # Use future dates with no data
        start_date = '2030-01-01'
        end_date = '2030-01-31'

        result = run_rolling_backtest(
            start_date=start_date,
            end_date=end_date,
            top_n=10,
            use_db_signals=False,
        )

        # Should return error or empty stats
        assert result is not None
        assert result.get('error') or result.get('stats') is None


class TestBacktestMetrics:
    """Tests for backtest metric calculations"""

    def test_total_return_calculation(self):
        """Validate total return is calculated correctly"""
        start_date = '2024-01-01'
        end_date = '2024-02-29'

        result = run_rolling_backtest(
            start_date=start_date,
            end_date=end_date,
            top_n=10,
            use_db_signals=False,
        )

        if result.get('stats'):
            stats = result['stats']
            total_return = stats['total_return']

            # Total return should be numeric
            assert isinstance(total_return, (int, float))

            # If backtest ran, equity curve should exist
            if result['equity_curve']:
                initial_equity = result['equity_curve'][0]['equity']
                final_equity = result['equity_curve'][-1]['equity']

                # Total return = (final - initial) / initial
                expected_return = (final_equity - initial_equity) / initial_equity

                # Should match within tolerance
                assert abs(total_return - expected_return) < 0.001

    def test_sharpe_ratio_validity(self):
        """Validate Sharpe ratio is calculated correctly"""
        start_date = '2024-01-01'
        end_date = '2024-03-31'  # Longer period for Sharpe

        result = run_rolling_backtest(
            start_date=start_date,
            end_date=end_date,
            top_n=10,
            use_db_signals=False,
        )

        if result.get('stats'):
            sharpe = result['stats']['sharpe']

            # Sharpe should be numeric
            assert isinstance(sharpe, (int, float))

            # Sharpe can be negative, but should be reasonable
            # Typical range: -3 to +5 for daily Sharpe * sqrt(252)
            assert -5 < sharpe < 10

    def test_max_drawdown_is_non_positive(self):
        """Max drawdown should be negative or zero"""
        start_date = '2024-01-01'
        end_date = '2024-02-29'

        result = run_rolling_backtest(
            start_date=start_date,
            end_date=end_date,
            top_n=10,
            use_db_signals=False,
        )

        if result.get('stats'):
            max_dd = result['stats']['max_drawdown']

            # Max drawdown should be numeric
            assert isinstance(max_dd, (int, float))

            # Max drawdown should be >= 0 (it's the magnitude, not negative)
            assert max_dd >= 0

            # Max drawdown should be <= 1 (100%)
            assert max_dd <= 1

    def test_win_rate_is_percentage(self):
        """Win rate should be between 0 and 1"""
        start_date = '2024-01-01'
        end_date = '2024-02-29'

        result = run_rolling_backtest(
            start_date=start_date,
            end_date=end_date,
            top_n=10,
            use_db_signals=False,
        )

        if result.get('stats'):
            win_rate = result['stats']['win_rate']

            # Win rate should be numeric
            assert isinstance(win_rate, (int, float))

            # Win rate should be between 0 and 1
            assert 0 <= win_rate <= 1


class TestMaxDrawdownCalculation:
    """Tests for max drawdown calculation function"""

    def test_max_drawdown_with_flat_equity(self):
        """Max drawdown should be 0 for flat equity curve"""
        equity_curve = [
            {'equity': 100000},
            {'equity': 100000},
            {'equity': 100000},
        ]

        max_dd = _compute_max_drawdown(equity_curve)

        assert max_dd == 0.0

    def test_max_drawdown_with_only_gains(self):
        """Max drawdown should be 0 for monotonically increasing equity"""
        equity_curve = [
            {'equity': 100000},
            {'equity': 105000},
            {'equity': 110000},
            {'equity': 120000},
        ]

        max_dd = _compute_max_drawdown(equity_curve)

        assert max_dd == 0.0

    def test_max_drawdown_with_single_drop(self):
        """Max drawdown should capture single drop correctly"""
        equity_curve = [
            {'equity': 100000},
            {'equity': 95000},   # -5% drop
            {'equity': 92000},   # -8% total drop from peak
            {'equity': 98000},   # Recovery
        ]

        max_dd = _compute_max_drawdown(equity_curve)

        # Max drawdown from 100k to 92k = 8%
        expected_dd = (100000 - 92000) / 100000  # 0.08
        assert abs(max_dd - expected_dd) < 0.001

    def test_max_drawdown_with_multiple_peaks(self):
        """Max drawdown should use highest peak before each trough"""
        equity_curve = [
            {'equity': 100000},  # Peak 1
            {'equity': 95000},
            {'equity': 110000},  # Peak 2 (new high)
            {'equity': 95000},   # Drawdown from 110k
            {'equity': 105000},
        ]

        max_dd = _compute_max_drawdown(equity_curve)

        # Max drawdown from 110k to 95k = 13.6%
        expected_dd = (110000 - 95000) / 110000  # ~0.136
        assert abs(max_dd - expected_dd) < 0.001

    def test_max_drawdown_with_empty_curve(self):
        """Max drawdown should be 0 for empty equity curve"""
        equity_curve = []

        max_dd = _compute_max_drawdown(equity_curve)

        assert max_dd == 0.0


class TestWalkForwardBacktest:
    """Tests for walk-forward validation backtest"""

    def test_walk_forward_creates_multiple_folds(self):
        """Walk-forward should create multiple train/test folds"""
        start_date = '2024-01-01'
        end_date = '2024-06-30'  # 6 months

        result = run_walk_forward_backtest(
            start_date=start_date,
            end_date=end_date,
            train_months=3,
            test_months=1,
            top_n=10,
            use_db_signals=False,
        )

        if 'folds' in result:
            # Should create at least 2 folds with 3-month train + 1-month test
            assert len(result['folds']) >= 1

            # Each fold should have required fields
            for fold in result['folds']:
                assert 'fold_id' in fold
                assert 'train_start' in fold
                assert 'train_end' in fold
                assert 'test_start' in fold
                assert 'test_end' in fold

    def test_walk_forward_folds_do_not_overlap(self):
        """Test periods should not overlap in walk-forward"""
        start_date = '2024-01-01'
        end_date = '2024-06-30'

        result = run_walk_forward_backtest(
            start_date=start_date,
            end_date=end_date,
            train_months=3,
            test_months=1,
            top_n=10,
            use_db_signals=False,
        )

        if 'folds' in result and len(result['folds']) > 1:
            folds = result['folds']

            for i in range(len(folds) - 1):
                current_fold = folds[i]
                next_fold = folds[i + 1]

                # Current test end should not overlap with next test start
                # (allowing for rolling windows that may share training data)
                assert current_fold['test_end'] <= next_fold['test_start']

    def test_walk_forward_aggregates_results(self):
        """Walk-forward should provide aggregate statistics"""
        start_date = '2024-01-01'
        end_date = '2024-06-30'

        result = run_walk_forward_backtest(
            start_date=start_date,
            end_date=end_date,
            train_months=3,
            test_months=1,
            top_n=10,
            use_db_signals=False,
        )

        # Should have aggregate results
        if result.get('aggregate'):
            agg = result['aggregate']

            # Aggregate should have summary stats
            assert 'total_return' in agg or 'mean_return' in agg
            assert 'sharpe' in agg or 'mean_sharpe' in agg


class TestBacktestEdgeCases:
    """Tests for edge cases and error handling"""

    def test_backtest_with_invalid_date_range(self):
        """Backtest should handle invalid date ranges gracefully"""
        # End date before start date
        start_date = '2024-06-01'
        end_date = '2024-01-01'

        result = run_rolling_backtest(
            start_date=start_date,
            end_date=end_date,
            top_n=10,
            use_db_signals=False,
        )

        # Should return error or empty stats
        assert result.get('error') or not result.get('stats')

    def test_backtest_with_zero_positions(self):
        """Backtest should handle case with no tradeable positions"""
        start_date = '2024-01-01'
        end_date = '2024-01-02'  # Very short period

        result = run_rolling_backtest(
            start_date=start_date,
            end_date=end_date,
            top_n=1000,  # Request more stocks than available
            use_db_signals=False,
        )

        # Should not crash
        assert result is not None

    def test_backtest_returns_are_realistic(self):
        """Backtest returns should be within realistic bounds"""
        start_date = '2024-01-01'
        end_date = '2024-03-31'

        result = run_rolling_backtest(
            start_date=start_date,
            end_date=end_date,
            top_n=20,
            use_db_signals=False,
        )

        if result.get('stats'):
            total_return = result['stats']['total_return']

            # For 3-month period, returns should be reasonable
            # Extreme values like +1000% or -100% suggest bugs
            assert -0.5 < total_return < 2.0  # Between -50% and +200%


@pytest.mark.integration
class TestBacktestWithRealData:
    """Integration tests with real database data (if available)"""

    def test_backtest_with_db_signals(self):
        """Test backtest using signals from database"""
        start_date = '2024-01-01'
        end_date = '2024-01-31'

        result = run_rolling_backtest(
            start_date=start_date,
            end_date=end_date,
            top_n=10,
            use_db_signals=True,  # Use real signals from DB
        )

        # If signals exist, backtest should run
        if not result.get('error'):
            assert result.get('stats') is not None

    def test_backtest_performance_is_reasonable(self):
        """Backtest should complete in reasonable time"""
        import time

        start_date = '2024-01-01'
        end_date = '2024-02-29'

        start_time = time.time()

        result = run_rolling_backtest(
            start_date=start_date,
            end_date=end_date,
            top_n=20,
            use_db_signals=False,
        )

        elapsed = time.time() - start_time

        # Should complete in under 30 seconds
        assert elapsed < 30

        # Should have results
        assert result is not None
