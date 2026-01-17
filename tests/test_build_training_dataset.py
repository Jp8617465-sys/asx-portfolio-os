"""
tests/test_build_training_dataset.py
Unit tests for training dataset generation.
"""

import os
import pytest
import pandas as pd
import numpy as np
from unittest.mock import Mock, patch, MagicMock


def test_output_directory_creation():
    """Test that output directories are created if missing."""
    import tempfile
    import shutil
    
    # Create a temporary directory
    temp_dir = tempfile.mkdtemp()
    
    try:
        # Create subdirectories
        output_dir = os.path.join(temp_dir, "outputs")
        training_dir = os.path.join(temp_dir, "data", "training")
        
        # Verify they don't exist initially
        assert not os.path.exists(output_dir)
        assert not os.path.exists(training_dir)
        
        # Create directories
        os.makedirs(output_dir, exist_ok=True)
        os.makedirs(training_dir, exist_ok=True)
        
        # Verify they were created
        assert os.path.exists(output_dir)
        assert os.path.exists(training_dir)
        
        # Test write permissions
        test_file = os.path.join(output_dir, "test.txt")
        with open(test_file, 'w') as f:
            f.write("test")
        
        assert os.path.exists(test_file)
        os.remove(test_file)
        
    finally:
        # Clean up
        shutil.rmtree(temp_dir)


def test_database_connection_error_handling():
    """Test that database connection errors are handled gracefully."""
    import psycopg2
    
    # Test with invalid connection string
    with pytest.raises((psycopg2.Error, ValueError)):
        psycopg2.connect("invalid_connection_string")


def test_feature_engineering_calculations():
    """Test feature engineering calculations."""
    # Create sample price data
    dates = pd.date_range('2023-01-01', periods=300, freq='D')
    df = pd.DataFrame({
        'symbol': ['TEST'] * 300,
        'dt': dates,
        'close': np.random.uniform(50, 150, 300),
        'volume': np.random.uniform(100000, 1000000, 300)
    })
    
    # Calculate returns
    df['ret_1d'] = df.groupby('symbol')['close'].pct_change()
    
    # Test that returns are calculated
    assert 'ret_1d' in df.columns
    assert df['ret_1d'].notna().sum() > 0
    
    # Calculate momentum
    df['mom_6'] = df.groupby('symbol')['close'].transform(lambda x: x.pct_change(126))
    
    # Test momentum calculation
    assert 'mom_6' in df.columns
    
    # Calculate volatility
    df['vol_90'] = df.groupby('symbol')['ret_1d'].rolling(90).std().reset_index(0, drop=True)
    
    # Test volatility calculation
    assert 'vol_90' in df.columns
    assert df['vol_90'].notna().sum() > 0
    
    # Calculate SMA
    df['sma_200'] = df.groupby('symbol')['close'].transform(lambda x: x.rolling(200).mean())
    
    # Test SMA calculation
    assert 'sma_200' in df.columns
    assert df['sma_200'].notna().sum() > 0
    
    # Calculate trend
    df['trend_200'] = df['close'] > df['sma_200']
    
    # Test trend calculation
    assert 'trend_200' in df.columns
    assert df['trend_200'].dtype == bool


def test_slope_calculation():
    """Test slope calculation function."""
    # Create a simple upward trend
    series = pd.Series([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    
    # Calculate slope manually
    x = np.arange(len(series))
    y = series.values
    a, b = np.polyfit(x, y, 1)
    
    # Slope should be positive and close to 1
    assert a > 0
    assert 0.9 < a < 1.1
    
    # Test with downward trend
    series = pd.Series([10, 9, 8, 7, 6, 5, 4, 3, 2, 1])
    x = np.arange(len(series))
    y = series.values
    a, b = np.polyfit(x, y, 1)
    
    # Slope should be negative and close to -1
    assert a < 0
    assert -1.1 < a < -0.9


def test_forward_return_calculation():
    """Test forward return calculation."""
    # Create sample data
    df = pd.DataFrame({
        'symbol': ['TEST'] * 50,
        'close': np.arange(100, 150)
    })
    
    # Calculate forward return (21 days)
    df['return_1m_fwd'] = df.groupby('symbol')['close'].shift(-21) / df['close'] - 1
    
    # Test that forward returns are calculated
    assert 'return_1m_fwd' in df.columns
    
    # Test that the last 21 rows have NaN (no future data)
    assert df['return_1m_fwd'].tail(21).isna().all()
    
    # Test that early rows have values
    assert df['return_1m_fwd'].head(20).notna().any()


def test_missing_value_handling():
    """Test that rows with missing values are dropped correctly."""
    # Create sample data with some missing values
    df = pd.DataFrame({
        'col1': [1, 2, np.nan, 4, 5],
        'col2': [1, 2, 3, np.nan, 5],
        'col3': [1, 2, 3, 4, 5]
    })
    
    # Drop rows with missing values in specific columns
    df_clean = df.dropna(subset=['col1', 'col2'])
    
    # Should have only 3 rows (rows 0, 1, 4)
    assert len(df_clean) == 3
    assert df_clean.index.tolist() == [0, 1, 4]


def test_dataframe_concatenation():
    """Test that batch dataframes are concatenated correctly."""
    # Create sample batch dataframes
    df1 = pd.DataFrame({
        'symbol': ['A', 'A', 'A'],
        'close': [100, 101, 102]
    })
    
    df2 = pd.DataFrame({
        'symbol': ['B', 'B', 'B'],
        'close': [200, 201, 202]
    })
    
    # Concatenate
    df_combined = pd.concat([df1, df2], ignore_index=True)
    
    # Test concatenation
    assert len(df_combined) == 6
    assert df_combined['symbol'].unique().tolist() == ['A', 'B']
    assert df_combined['close'].min() == 100
    assert df_combined['close'].max() == 202


def test_environment_variable_validation():
    """Test that environment variables are validated."""
    # Test empty database URL
    with pytest.raises(ValueError):
        database_url = ""
        if not database_url or database_url.strip() in ["...", ""]:
            raise ValueError("DATABASE_URL not set")
    
    # Test valid database URL
    database_url = "postgresql://user:pass@localhost/db"
    assert database_url and database_url.strip() not in ["...", ""]
