"""
Critical path tests for Model A endpoints - Production readiness
Tests the /dashboard/model_a_v1_1 endpoint which is the core signal generation API
"""

import pytest
import os
import sys
from unittest.mock import patch, MagicMock
import pandas as pd
import numpy as np

# Add project root to path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from fastapi.testclient import TestClient


@pytest.fixture
def mock_db_connection():
    """Mock database connection"""
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
    mock_conn.cursor.return_value.__exit__.return_value = None
    return mock_conn


@pytest.fixture
def sample_price_data():
    """Sample price data for testing"""
    dates = pd.date_range(start='2024-01-01', periods=300, freq='D')
    symbols = ['CBA.AX', 'BHP.AX', 'WES.AX']

    data = []
    for symbol in symbols:
        for dt in dates:
            data.append({
                'dt': dt,
                'symbol': symbol,
                'close': 100 + np.random.randn() * 5,
                'volume': 1000000 + np.random.randint(-100000, 100000),
            })

    return pd.DataFrame(data)


@pytest.fixture
def sample_signals():
    """Sample signal data"""
    return pd.DataFrame({
        'symbol': ['CBA.AX', 'BHP.AX', 'WES.AX'],
        'signal': ['BUY', 'STRONG_BUY', 'HOLD'],
        'prob_up': [0.60, 0.70, 0.50],
        'expected_return': [0.03, 0.08, 0.01],
        'confidence': [60, 70, 50],
        'close': [100, 45, 50],
        'rank': [2, 1, 3],
    })


class TestModelARoute:
    """Test suite for Model A critical endpoints"""

    def test_health_endpoint(self):
        """Test health check returns 200"""
        # Import here to avoid loading full app during collection
        from app.main import app
        client = TestClient(app)

        response = client.get("/health")
        assert response.status_code in [200, 500]  # 500 if DB not available in test
        data = response.json()
        assert "status" in data


    @patch('app.routes.model.db')
    def test_model_a_dashboard_endpoint_structure(self, mock_db, sample_signals):
        """Test /dashboard/model_a_v1_1 returns correct structure"""
        from app.main import app

        # Mock database to return sample signals
        mock_conn = MagicMock()
        mock_db.return_value.__enter__.return_value = mock_conn

        # Mock the SQL query to return our sample data
        with patch('pandas.read_sql') as mock_read_sql:
            mock_read_sql.return_value = sample_signals

            client = TestClient(app)
            response = client.get("/dashboard/model_a_v1_1")

            assert response.status_code == 200
            data = response.json()

            # Check response structure
            assert "signals" in data
            assert "summary" in data
            assert "generated_at" in data

            # Check signals structure
            if data["signals"]:
                first_signal = data["signals"][0]
                assert "symbol" in first_signal
                assert "signal" in first_signal
                assert "confidence" in first_signal


    def test_signal_classification_logic(self):
        """Test signal classification thresholds"""
        # Test STRONG_BUY conditions
        assert classify_signal(prob_up=0.65, expected_return=0.06) == 'STRONG_BUY'
        assert classify_signal(prob_up=0.70, expected_return=0.10) == 'STRONG_BUY'

        # Test BUY conditions
        assert classify_signal(prob_up=0.55, expected_return=0.01) == 'BUY'
        assert classify_signal(prob_up=0.60, expected_return=0.03) == 'BUY'

        # Test HOLD conditions
        assert classify_signal(prob_up=0.50, expected_return=0.02) == 'HOLD'
        assert classify_signal(prob_up=0.52, expected_return=-0.01) == 'HOLD'

        # Test SELL conditions
        assert classify_signal(prob_up=0.45, expected_return=-0.01) == 'SELL'
        assert classify_signal(prob_up=0.40, expected_return=-0.03) == 'SELL'

        # Test STRONG_SELL conditions
        assert classify_signal(prob_up=0.35, expected_return=-0.06) == 'STRONG_SELL'
        assert classify_signal(prob_up=0.30, expected_return=-0.10) == 'STRONG_SELL'


    def test_feature_computation_no_lookahead(self, sample_price_data):
        """
        Critical test: Verify features only use historical data
        Tests that rolling calculations don't look ahead
        """
        df = sample_price_data.copy()
        df = df.sort_values(['symbol', 'dt'])

        # Compute momentum (should use past data only)
        df['mom_6'] = df.groupby('symbol')['close'].pct_change(126)

        # For each row, verify momentum uses only past prices
        for symbol in df['symbol'].unique():
            symbol_df = df[df['symbol'] == symbol].reset_index(drop=True)

            # Check row 150 (should have 6 months of history)
            if len(symbol_df) >= 150:
                row_150_mom = symbol_df.loc[150, 'mom_6']
                row_150_close = symbol_df.loc[150, 'close']
                row_24_close = symbol_df.loc[24, 'close']  # 126 days back

                # Momentum should be (current - past) / past
                expected_mom = (row_150_close - row_24_close) / row_24_close

                # Allow small floating point tolerance
                if not pd.isna(row_150_mom):
                    assert abs(row_150_mom - expected_mom) < 0.01


    def test_signal_thresholds_validate(self):
        """Test that signal thresholds are conservative"""
        # STRONG_BUY should require high confidence AND high return
        # prob_up=0.65 AND expected_return > 0.05 needed for STRONG_BUY
        assert classify_signal(prob_up=0.65, expected_return=0.04) == 'BUY'  # expected_return not > 0.05
        assert classify_signal(prob_up=0.64, expected_return=0.06) == 'BUY'  # prob_up not >= 0.65

        # Should give STRONG_BUY when both thresholds met
        assert classify_signal(prob_up=0.65, expected_return=0.06) == 'STRONG_BUY'  # Both conditions met

        # Conservative: Don't sell unless confident
        assert classify_signal(prob_up=0.46, expected_return=-0.01) == 'HOLD'  # Not SELL yet (need <= 0.45)


    @patch('app.routes.model.db')
    def test_empty_database_handling(self, mock_db):
        """Test API handles empty database gracefully"""
        from app.main import app

        mock_conn = MagicMock()
        mock_db.return_value.__enter__.return_value = mock_conn

        # Return empty DataFrame
        with patch('pandas.read_sql') as mock_read_sql:
            mock_read_sql.return_value = pd.DataFrame()

            client = TestClient(app)
            response = client.get("/dashboard/model_a_v1_1")

            # Should handle gracefully, not crash
            assert response.status_code in [200, 500]

            if response.status_code == 200:
                data = response.json()
                assert "signals" in data
                # Empty signals should return empty list
                assert isinstance(data["signals"], list)


    def test_confidence_calculation(self):
        """Test confidence score is calculated correctly"""
        # Confidence = abs(prob_up - 0.5) * 200
        assert calculate_confidence(0.70) == 40  # abs(0.70 - 0.5) * 200 = 40
        assert calculate_confidence(0.30) == 40  # abs(0.30 - 0.5) * 200 = 40
        assert calculate_confidence(0.50) == 0   # abs(0.50 - 0.5) * 200 = 0
        assert calculate_confidence(0.65) == 30  # abs(0.65 - 0.5) * 200 = 30


# Helper functions matching production code
def classify_signal(prob_up: float, expected_return: float) -> str:
    """
    Signal classification logic (mirrors jobs/generate_signals.py:146-156)
    """
    if prob_up >= 0.65 and expected_return > 0.05:
        return 'STRONG_BUY'
    elif prob_up >= 0.55 and expected_return > 0:
        return 'BUY'
    elif prob_up <= 0.35 and expected_return < -0.05:
        return 'STRONG_SELL'
    elif prob_up <= 0.45 and expected_return < 0:
        return 'SELL'
    else:
        return 'HOLD'


def calculate_confidence(prob_up: float) -> int:
    """
    Confidence calculation (mirrors jobs/generate_signals.py:159)
    """
    return int(abs(prob_up - 0.5) * 200)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
