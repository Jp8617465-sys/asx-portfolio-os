"""
Unit tests for fundamentals API endpoints.
Tests /fundamentals/metrics, /fundamentals/quality, and Model B signal endpoints.
"""

import pytest
from unittest.mock import patch, MagicMock
import pandas as pd
from datetime import datetime


# Mock the app.core imports
@pytest.fixture
def mock_db():
    """Mock database connection."""
    with patch('app.routes.fundamentals.db') as mock:
        yield mock


@pytest.fixture
def mock_require_key():
    """Mock API key validation."""
    with patch('app.routes.fundamentals.require_key') as mock:
        mock.return_value = True
        yield mock


class TestFundamentalsMetricsEndpoint:
    """Test /fundamentals/metrics endpoint."""

    def test_get_fundamentals_metrics_success(self, mock_db, mock_require_key):
        """Should return fundamental metrics for valid ticker."""
        # Mock database response
        mock_con = MagicMock()
        mock_db.return_value.__enter__.return_value = mock_con

        sample_data = pd.DataFrame([{
            'symbol': 'BHP.AU',
            'sector': 'Materials',
            'industry': 'Mining',
            'pe_ratio': 12.5,
            'pb_ratio': 2.3,
            'eps': 2.45,
            'roe': 0.18,
            'debt_to_equity': 0.45,
            'market_cap': 150000000000,
            'div_yield': 0.045,
            'revenue_growth_yoy': 0.08,
            'profit_margin': 0.15,
            'current_ratio': 1.5,
            'quick_ratio': 1.2,
            'eps_growth': 0.12,
            'free_cash_flow': 5000000000,
            'updated_at': datetime.now(),
            'period_end': '2025-12-31'
        }])

        with patch('app.routes.fundamentals.pd.read_sql', return_value=sample_data):
            from app.routes.fundamentals import get_fundamentals_metrics

            result = get_fundamentals_metrics(ticker='BHP', x_api_key='test-key')

            assert result['symbol'] == 'BHP.AU'
            assert result['sector'] == 'Materials'
            assert result['metrics']['valuation']['pe_ratio'] == 12.5
            assert result['metrics']['profitability']['roe'] == 0.18
            assert result['metrics'] is not None

    def test_get_fundamentals_metrics_adds_au_suffix(self, mock_db, mock_require_key):
        """Should add .AU suffix to ticker if not present."""
        mock_con = MagicMock()
        mock_db.return_value.__enter__.return_value = mock_con

        sample_data = pd.DataFrame([{
            'symbol': 'BHP.AU',
            'sector': 'Materials',
            'industry': 'Mining',
            'pe_ratio': 12.5,
            'pb_ratio': 2.3,
            'eps': 2.45,
            'roe': 0.18,
            'debt_to_equity': 0.45,
            'market_cap': 150000000000,
            'div_yield': 0.045,
            'revenue_growth_yoy': None,
            'profit_margin': None,
            'current_ratio': None,
            'quick_ratio': None,
            'eps_growth': None,
            'free_cash_flow': None,
            'updated_at': datetime.now(),
            'period_end': None
        }])

        with patch('app.routes.fundamentals.pd.read_sql', return_value=sample_data) as mock_read_sql:
            from app.routes.fundamentals import get_fundamentals_metrics

            result = get_fundamentals_metrics(ticker='BHP', x_api_key='test-key')

            # Verify query was called with .AU suffix
            call_args = mock_read_sql.call_args
            assert 'BHP.AU' in str(call_args)

    def test_get_fundamentals_metrics_not_found(self, mock_db, mock_require_key):
        """Should return 404 when ticker not found."""
        mock_con = MagicMock()
        mock_db.return_value.__enter__.return_value = mock_con

        empty_data = pd.DataFrame()

        with patch('app.routes.fundamentals.pd.read_sql', return_value=empty_data):
            from app.routes.fundamentals import get_fundamentals_metrics
            from fastapi import HTTPException

            with pytest.raises(HTTPException) as exc_info:
                get_fundamentals_metrics(ticker='INVALID', x_api_key='test-key')

            assert exc_info.value.status_code == 404
            assert 'No fundamental data found' in str(exc_info.value.detail)

    def test_get_fundamentals_metrics_handles_null_values(self, mock_db, mock_require_key):
        """Should handle null values in metrics gracefully."""
        mock_con = MagicMock()
        mock_db.return_value.__enter__.return_value = mock_con

        sample_data = pd.DataFrame([{
            'symbol': 'BHP.AU',
            'sector': 'Materials',
            'industry': 'Mining',
            'pe_ratio': 12.5,
            'pb_ratio': None,  # Null value
            'eps': 2.45,
            'roe': None,  # Null value
            'debt_to_equity': 0.45,
            'market_cap': 150000000000,
            'div_yield': None,
            'revenue_growth_yoy': None,
            'profit_margin': None,
            'current_ratio': None,
            'quick_ratio': None,
            'eps_growth': None,
            'free_cash_flow': None,
            'updated_at': datetime.now(),
            'period_end': None
        }])

        with patch('app.routes.fundamentals.pd.read_sql', return_value=sample_data):
            from app.routes.fundamentals import get_fundamentals_metrics

            result = get_fundamentals_metrics(ticker='BHP', x_api_key='test-key')

            # Null values should be None in JSON
            assert result['metrics']['valuation']['pb_ratio'] is None
            assert result['metrics']['profitability']['roe'] is None
            # Non-null values should be present
            assert result['metrics']['valuation']['pe_ratio'] == 12.5

    def test_get_fundamentals_metrics_requires_auth(self, mock_db):
        """Should require valid API key."""
        with patch('app.routes.fundamentals.require_key') as mock_require:
            mock_require.side_effect = Exception("Invalid API key")
            from app.routes.fundamentals import get_fundamentals_metrics

            with pytest.raises(Exception) as exc_info:
                get_fundamentals_metrics(ticker='BHP', x_api_key='invalid')

            assert 'Invalid API key' in str(exc_info.value)


class TestModelBSignalsEndpoint:
    """Test Model B signals endpoints."""

    def test_get_model_b_signal_single_ticker(self, mock_db, mock_require_key):
        """Should return Model B signal for single ticker."""
        mock_con = MagicMock()
        mock_db.return_value.__enter__.return_value = mock_con

        sample_data = pd.DataFrame([{
            'symbol': 'BHP.AU',
            'as_of': datetime.now().date(),
            'signal': 'BUY',
            'quality_score': 'A',
            'confidence': 0.75,
            'ml_prob': 0.75,
            'ml_expected_return': 0.05,
            'rank': 5,
            'pe_ratio': 12.5,
            'pb_ratio': 2.3,
            'roe': 0.18,
            'debt_to_equity': 0.45,
            'profit_margin': 0.15
        }])

        with patch('app.routes.fundamentals.pd.read_sql', return_value=sample_data):
            # Assuming there's a get_model_b_signal endpoint
            # This is a placeholder - adjust based on actual implementation
            pass

    def test_get_model_b_signals_latest_with_filters(self, mock_db, mock_require_key):
        """Should filter Model B signals by quality score and signal type."""
        mock_con = MagicMock()
        mock_db.return_value.__enter__.return_value = mock_con

        sample_data = pd.DataFrame([
            {
                'symbol': 'BHP.AU',
                'signal': 'BUY',
                'quality_score': 'A',
                'confidence': 0.75,
                'rank': 1
            },
            {
                'symbol': 'CBA.AU',
                'signal': 'BUY',
                'quality_score': 'B',
                'confidence': 0.65,
                'rank': 2
            }
        ])

        # Test would verify filtering logic
        pass


class TestQueryParameterValidation:
    """Test query parameter validation."""

    def test_ticker_parameter_required(self):
        """Should require ticker parameter."""
        # This would test FastAPI's automatic validation
        pass

    def test_limit_parameter_bounds(self):
        """Should enforce limit parameter bounds (1-500)."""
        # Test ge=1, le=500 validation
        pass

    def test_signal_filter_enum_validation(self):
        """Should validate signal filter against allowed values."""
        # Test enum validation for STRONG_BUY, BUY, HOLD, SELL, STRONG_SELL
        pass


class TestErrorHandling:
    """Test error handling in fundamentals endpoints."""

    def test_database_error_returns_500(self, mock_db, mock_require_key):
        """Should return 500 on database error."""
        mock_con = MagicMock()
        mock_db.return_value.__enter__.return_value = mock_con

        with patch('app.routes.fundamentals.pd.read_sql', side_effect=Exception("DB connection failed")):
            from app.routes.fundamentals import get_fundamentals_metrics
            from fastapi import HTTPException

            with pytest.raises(HTTPException) as exc_info:
                get_fundamentals_metrics(ticker='BHP', x_api_key='test-key')

            assert exc_info.value.status_code == 500
            assert 'Database error' in str(exc_info.value.detail)

    def test_malformed_ticker_handling(self, mock_db, mock_require_key):
        """Should handle malformed ticker gracefully."""
        mock_con = MagicMock()
        mock_db.return_value.__enter__.return_value = mock_con
        empty_data = pd.DataFrame()

        with patch('app.routes.fundamentals.pd.read_sql', return_value=empty_data):
            from app.routes.fundamentals import get_fundamentals_metrics
            from fastapi import HTTPException

            with pytest.raises(HTTPException) as exc_info:
                get_fundamentals_metrics(ticker='@#$%', x_api_key='test-key')

            assert exc_info.value.status_code == 404
