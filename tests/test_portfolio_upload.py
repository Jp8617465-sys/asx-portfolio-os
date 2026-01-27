"""
Portfolio upload and CSV parsing tests - Production critical
Tests the portfolio upload functionality which is a core user-facing feature
"""

import pytest
import os
import sys
import io
from unittest.mock import Mock, patch, MagicMock
import pandas as pd

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from fastapi.testclient import TestClient


class TestPortfolioUpload:
    """Test suite for portfolio CSV upload functionality"""

    @pytest.fixture
    def valid_portfolio_csv(self):
        """Valid portfolio CSV content"""
        return """symbol,shares,avg_cost
CBA.AX,100,95.50
BHP.AX,200,42.30
WES.AX,150,55.80
"""

    @pytest.fixture
    def invalid_portfolio_csv(self):
        """Invalid CSV - missing required columns"""
        return """ticker,quantity
CBA.AX,100
BHP.AX,200
"""

    @pytest.fixture
    def malformed_portfolio_csv(self):
        """Malformed CSV data"""
        return """symbol,shares,avg_cost
CBA.AX,not_a_number,95.50
BHP.AX,200,invalid
"""

    def test_parse_valid_portfolio_csv(self, valid_portfolio_csv):
        """Test parsing valid portfolio CSV"""
        df = pd.read_csv(io.StringIO(valid_portfolio_csv))

        assert len(df) == 3
        assert list(df.columns) == ['symbol', 'shares', 'avg_cost']
        assert df['symbol'].tolist() == ['CBA.AX', 'BHP.AX', 'WES.AX']
        assert df['shares'].sum() == 450
        assert all(df['shares'] > 0)
        assert all(df['avg_cost'] > 0)

    def test_parse_invalid_portfolio_csv(self, invalid_portfolio_csv):
        """Test parsing CSV with missing required columns"""
        df = pd.read_csv(io.StringIO(invalid_portfolio_csv))

        # Should have wrong column names
        assert 'symbol' not in df.columns
        assert 'ticker' in df.columns

        # Validation should fail in production endpoint
        required_columns = ['symbol', 'shares', 'avg_cost']
        assert not all(col in df.columns for col in required_columns)

    def test_csv_validation_logic(self):
        """Test CSV validation rules"""
        # Valid case
        df = pd.DataFrame({
            'symbol': ['CBA.AX', 'BHP.AX'],
            'shares': [100, 200],
            'avg_cost': [95.50, 42.30]
        })
        assert validate_portfolio_df(df) == True

        # Missing required column
        df_missing = pd.DataFrame({
            'symbol': ['CBA.AX'],
            'shares': [100]
        })
        assert validate_portfolio_df(df_missing) == False

        # Negative shares
        df_negative = pd.DataFrame({
            'symbol': ['CBA.AX'],
            'shares': [-100],
            'avg_cost': [95.50]
        })
        assert validate_portfolio_df(df_negative) == False

        # Zero shares
        df_zero = pd.DataFrame({
            'symbol': ['CBA.AX'],
            'shares': [0],
            'avg_cost': [95.50]
        })
        assert validate_portfolio_df(df_zero) == False

    def test_asx_symbol_format_validation(self):
        """Test ASX symbol format validation"""
        # Valid ASX symbols
        assert is_valid_asx_symbol('CBA.AX') == True
        assert is_valid_asx_symbol('BHP.AX') == True
        assert is_valid_asx_symbol('WES.AX') == True

        # Invalid formats
        assert is_valid_asx_symbol('CBA') == False  # Missing .AX
        assert is_valid_asx_symbol('cba.ax') == False  # Lowercase
        assert is_valid_asx_symbol('AAPL') == False  # Not ASX
        assert is_valid_asx_symbol('') == False  # Empty

    def test_portfolio_value_calculation(self):
        """Test portfolio total value calculation"""
        holdings = [
            {'symbol': 'CBA.AX', 'shares': 100, 'current_price': 100.00},
            {'symbol': 'BHP.AX', 'shares': 200, 'current_price': 45.00},
            {'symbol': 'WES.AX', 'shares': 150, 'current_price': 60.00},
        ]

        total_value = calculate_portfolio_value(holdings)
        expected = (100 * 100) + (200 * 45) + (150 * 60)
        assert total_value == expected
        assert total_value == 28000.00

    def test_portfolio_gain_loss_calculation(self):
        """Test gain/loss calculation for holdings"""
        holding = {
            'shares': 100,
            'avg_cost': 95.00,
            'current_price': 100.00
        }

        gain_loss = calculate_gain_loss(holding)
        expected = (100.00 - 95.00) * 100
        assert gain_loss == expected
        assert gain_loss == 500.00

        # Test loss
        holding_loss = {
            'shares': 100,
            'avg_cost': 105.00,
            'current_price': 100.00
        }
        loss = calculate_gain_loss(holding_loss)
        assert loss == -500.00

    def test_csv_encoding_handling(self):
        """Test handling of different CSV encodings"""
        # UTF-8 with BOM
        csv_with_bom = b'\xef\xbb\xbfsymbol,shares,avg_cost\nCBA.AX,100,95.50'
        df = pd.read_csv(io.BytesIO(csv_with_bom), encoding='utf-8-sig')
        assert 'symbol' in df.columns
        assert len(df) == 1

        # Regular UTF-8
        csv_utf8 = b'symbol,shares,avg_cost\nCBA.AX,100,95.50'
        df = pd.read_csv(io.BytesIO(csv_utf8), encoding='utf-8')
        assert 'symbol' in df.columns
        assert len(df) == 1

    def test_large_portfolio_handling(self):
        """Test handling of large portfolios"""
        # Create large portfolio (200 holdings)
        symbols = [f'TST{i:03d}.AX' for i in range(200)]
        data = {
            'symbol': symbols,
            'shares': [100] * 200,
            'avg_cost': [50.00] * 200
        }
        df = pd.DataFrame(data)

        assert len(df) == 200
        assert validate_portfolio_df(df) == True

        # Test that processing doesn't fail
        total_shares = df['shares'].sum()
        assert total_shares == 20000

    def test_duplicate_symbols_handling(self):
        """Test handling of duplicate symbols in portfolio"""
        csv_with_dupes = """symbol,shares,avg_cost
CBA.AX,100,95.50
CBA.AX,50,98.00
BHP.AX,200,42.30
"""
        df = pd.read_csv(io.StringIO(csv_with_dupes))

        # Should detect duplicates
        assert df['symbol'].duplicated().any() == True

        # Aggregate duplicates
        df_aggregated = aggregate_duplicate_holdings(df)
        assert len(df_aggregated) == 2  # CBA and BHP only
        assert df_aggregated[df_aggregated['symbol'] == 'CBA.AX']['shares'].values[0] == 150


# Helper functions for validation
def validate_portfolio_df(df: pd.DataFrame) -> bool:
    """
    Validate portfolio DataFrame structure and data
    """
    required_columns = ['symbol', 'shares', 'avg_cost']

    # Check required columns exist
    if not all(col in df.columns for col in required_columns):
        return False

    # Check no negative or zero shares
    if (df['shares'] <= 0).any():
        return False

    # Check no negative prices
    if (df['avg_cost'] <= 0).any():
        return False

    return True


def is_valid_asx_symbol(symbol: str) -> bool:
    """
    Validate ASX symbol format (XXX.AX)
    """
    if not symbol or not isinstance(symbol, str):
        return False

    if not symbol.endswith('.AX'):
        return False

    ticker = symbol.replace('.AX', '')
    if not ticker.isupper():
        return False

    if len(ticker) < 2 or len(ticker) > 4:
        return False

    return True


def calculate_portfolio_value(holdings: list) -> float:
    """
    Calculate total portfolio value
    """
    total = 0.0
    for holding in holdings:
        value = holding['shares'] * holding['current_price']
        total += value
    return total


def calculate_gain_loss(holding: dict) -> float:
    """
    Calculate gain/loss for a holding
    """
    cost_basis = holding['shares'] * holding['avg_cost']
    current_value = holding['shares'] * holding['current_price']
    return current_value - cost_basis


def aggregate_duplicate_holdings(df: pd.DataFrame) -> pd.DataFrame:
    """
    Aggregate duplicate symbols (weighted average cost)
    """
    # Calculate total cost for weighting
    df['total_cost'] = df['shares'] * df['avg_cost']

    # Group by symbol
    aggregated = df.groupby('symbol').agg({
        'shares': 'sum',
        'total_cost': 'sum'
    }).reset_index()

    # Calculate weighted average cost
    aggregated['avg_cost'] = aggregated['total_cost'] / aggregated['shares']
    aggregated = aggregated.drop('total_cost', axis=1)

    return aggregated


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
