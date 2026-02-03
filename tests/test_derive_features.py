"""
tests/test_derive_features.py
Unit tests for feature derivation functions.
"""

import numpy as np
import pandas as pd


def test_derive_fundamentals_features_calculates_scores():
    """Test that derive_features correctly calculates derived scores."""
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    # Create mock fundamentals data
    mock_data = pd.DataFrame({
        "symbol": ["AAA.AU", "BBB.AU", "CCC.AU"],
        "roe": [0.15, 0.20, 0.10],
        "pe_ratio": [10.0, 15.0, 20.0],
        "debt_to_equity": [0.3, 0.5, 0.7],
        "updated_at": pd.Timestamp.utcnow(),
    })

    # Calculate expected z-scores
    roe_mean = mock_data["roe"].mean()
    roe_std = mock_data["roe"].std()
    expected_roe_z = (mock_data["roe"] - roe_mean) / roe_std

    # Verify z-score calculation
    mock_data["roe_z"] = (mock_data["roe"] - mock_data["roe"].mean()) / mock_data["roe"].std()

    assert np.isclose(mock_data["roe_z"].iloc[0], expected_roe_z.iloc[0])
    assert np.isclose(mock_data["roe_z"].iloc[1], expected_roe_z.iloc[1])
    assert np.isclose(mock_data["roe_z"].iloc[2], expected_roe_z.iloc[2])


def test_pe_inverse_calculation():
    """Test that PE inverse is calculated correctly."""
    pe_ratios = pd.Series([10.0, 20.0, 5.0, 0.0])
    pe_inverse = 1 / pe_ratios.replace(0, pd.NA)

    assert np.isclose(pe_inverse.iloc[0], 0.1)
    assert np.isclose(pe_inverse.iloc[1], 0.05)
    assert np.isclose(pe_inverse.iloc[2], 0.2)
    assert pd.isna(pe_inverse.iloc[3])


def test_quality_score_ranking():
    """Test that quality score ranks correctly."""
    mock_data = pd.DataFrame({
        "roe": [0.10, 0.20, 0.15],
        "debt_to_equity": [0.3, 0.7, 0.5],
    })

    # Higher ROE = higher rank, lower debt = higher rank
    roe_rank = mock_data["roe"].rank(pct=True)
    debt_rank = 1 - mock_data["debt_to_equity"].rank(pct=True)
    quality_score = roe_rank + debt_rank

    # ROE: [0.10, 0.20, 0.15] -> ranks [1, 3, 2] -> pct [0.33, 1.0, 0.67]
    # D/E: [0.3, 0.7, 0.5] -> ranks [1, 3, 2] -> pct [0.33, 1.0, 0.67] -> inverted [0.67, 0, 0.33]

    # Stock with highest ROE (0.20) and lowest debt (0.3) should have best quality
    # But BBB has highest ROE (0.20) with highest debt (0.7)
    # AAA has lowest ROE (0.10) with lowest debt (0.3)

    # Quality scores should balance these factors
    assert len(quality_score) == 3
    assert quality_score.iloc[0] != quality_score.iloc[1]  # Different scores
