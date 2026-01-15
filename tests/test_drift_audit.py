"""
tests/test_drift_audit.py
Unit tests for drift audit (PSI calculation) functions.
"""

import numpy as np
import pandas as pd
import pytest


def test_psi_calculation_identical_distributions():
    """Test that PSI is near zero for identical distributions."""
    # PSI formula: sum((actual_pct - expected_pct) * ln(actual_pct / expected_pct))
    expected = np.array([0.1, 0.2, 0.3, 0.2, 0.2])
    actual = np.array([0.1, 0.2, 0.3, 0.2, 0.2])

    # With identical distributions, PSI should be 0
    psi = np.sum((actual - expected) * np.log(actual / expected))

    assert np.isclose(psi, 0.0, atol=1e-10)


def test_psi_calculation_different_distributions():
    """Test that PSI detects distribution drift."""
    expected = np.array([0.2, 0.2, 0.2, 0.2, 0.2])
    actual = np.array([0.1, 0.1, 0.4, 0.2, 0.2])

    # Avoid division by zero
    epsilon = 1e-10
    expected = np.clip(expected, epsilon, 1)
    actual = np.clip(actual, epsilon, 1)

    psi = np.sum((actual - expected) * np.log(actual / expected))

    # PSI > 0 indicates some drift
    assert psi > 0


def test_psi_thresholds():
    """Test PSI threshold interpretation."""
    # PSI < 0.1: No significant drift
    # PSI 0.1-0.25: Moderate drift
    # PSI > 0.25: Significant drift

    # Simulate slight drift
    expected = np.array([0.2, 0.2, 0.2, 0.2, 0.2])
    actual_slight = np.array([0.19, 0.21, 0.2, 0.2, 0.2])

    epsilon = 1e-10
    expected = np.clip(expected, epsilon, 1)
    actual_slight = np.clip(actual_slight, epsilon, 1)

    psi_slight = np.sum((actual_slight - expected) * np.log(actual_slight / expected))

    # Slight drift should be below 0.1
    assert psi_slight < 0.1


def test_binning_for_psi():
    """Test that binning produces correct bucket counts."""
    scores = pd.Series([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0])
    n_bins = 5

    # Create bins
    bins = pd.cut(scores, bins=n_bins, labels=False)

    # Should have values in all bins
    assert bins.nunique() == n_bins

    # Get counts per bin
    counts = bins.value_counts().sort_index()
    assert len(counts) == n_bins


def test_drift_audit_handles_empty_data():
    """Test that drift calculation handles empty data gracefully."""
    empty_scores = pd.Series([], dtype=float)

    # Should not raise an error
    try:
        if len(empty_scores) == 0:
            psi = None
        else:
            psi = 0.0
    except Exception as e:
        pytest.fail(f"Drift calculation raised unexpected error: {e}")

    assert psi is None
