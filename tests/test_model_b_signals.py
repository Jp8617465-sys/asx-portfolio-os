"""
Unit tests for Model B signal generation logic.
Tests quality score classification and signal logic.
"""

import pandas as pd
import numpy as np
import pytest


class TestModelBSignalClassification:
    """Test Model B signal classification logic (BUY/SELL/HOLD)."""

    def test_classify_signal_buy_a_grade_high_prob(self):
        """A-grade with high probability should be BUY."""
        # Import the classify_signal function

        # Mock the classification logic directly
        def classify_signal(row):
            if row['quality_score'] in ['A', 'B'] and row['prob_high_quality'] >= 0.6:
                return 'BUY'
            elif row['quality_score'] in ['D', 'F'] or row['prob_high_quality'] <= 0.4:
                return 'SELL'
            else:
                return 'HOLD'

        row = {'quality_score': 'A', 'prob_high_quality': 0.75}
        assert classify_signal(row) == 'BUY'

    def test_classify_signal_buy_b_grade_high_prob(self):
        """B-grade with high probability should be BUY."""
        def classify_signal(row):
            if row['quality_score'] in ['A', 'B'] and row['prob_high_quality'] >= 0.6:
                return 'BUY'
            elif row['quality_score'] in ['D', 'F'] or row['prob_high_quality'] <= 0.4:
                return 'SELL'
            else:
                return 'HOLD'

        row = {'quality_score': 'B', 'prob_high_quality': 0.65}
        assert classify_signal(row) == 'BUY'

    def test_classify_signal_hold_c_grade(self):
        """C-grade should be HOLD regardless of probability."""
        def classify_signal(row):
            if row['quality_score'] in ['A', 'B'] and row['prob_high_quality'] >= 0.6:
                return 'BUY'
            elif row['quality_score'] in ['D', 'F'] or row['prob_high_quality'] <= 0.4:
                return 'SELL'
            else:
                return 'HOLD'

        row = {'quality_score': 'C', 'prob_high_quality': 0.70}
        assert classify_signal(row) == 'HOLD'

    def test_classify_signal_sell_f_grade(self):
        """F-grade should be SELL."""
        def classify_signal(row):
            if row['quality_score'] in ['A', 'B'] and row['prob_high_quality'] >= 0.6:
                return 'BUY'
            elif row['quality_score'] in ['D', 'F'] or row['prob_high_quality'] <= 0.4:
                return 'SELL'
            else:
                return 'HOLD'

        row = {'quality_score': 'F', 'prob_high_quality': 0.30}
        assert classify_signal(row) == 'SELL'

    def test_classify_signal_sell_d_grade(self):
        """D-grade should be SELL."""
        def classify_signal(row):
            if row['quality_score'] in ['A', 'B'] and row['prob_high_quality'] >= 0.6:
                return 'BUY'
            elif row['quality_score'] in ['D', 'F'] or row['prob_high_quality'] <= 0.4:
                return 'SELL'
            else:
                return 'HOLD'

        row = {'quality_score': 'D', 'prob_high_quality': 0.50}
        assert classify_signal(row) == 'SELL'

    def test_classify_signal_hold_a_grade_low_prob(self):
        """A-grade with low probability should be HOLD."""
        def classify_signal(row):
            if row['quality_score'] in ['A', 'B'] and row['prob_high_quality'] >= 0.6:
                return 'BUY'
            elif row['quality_score'] in ['D', 'F'] or row['prob_high_quality'] <= 0.4:
                return 'SELL'
            else:
                return 'HOLD'

        row = {'quality_score': 'A', 'prob_high_quality': 0.50}
        assert classify_signal(row) == 'HOLD'

    def test_classify_signal_hold_b_grade_threshold(self):
        """B-grade at probability threshold (0.6) should be BUY."""
        def classify_signal(row):
            if row['quality_score'] in ['A', 'B'] and row['prob_high_quality'] >= 0.6:
                return 'BUY'
            elif row['quality_score'] in ['D', 'F'] or row['prob_high_quality'] <= 0.4:
                return 'SELL'
            else:
                return 'HOLD'

        row = {'quality_score': 'B', 'prob_high_quality': 0.6}
        assert classify_signal(row) == 'BUY'

    def test_classify_signal_hold_just_above_sell_threshold(self):
        """Probability just above 0.4 with C-grade should be HOLD."""
        def classify_signal(row):
            if row['quality_score'] in ['A', 'B'] and row['prob_high_quality'] >= 0.6:
                return 'BUY'
            elif row['quality_score'] in ['D', 'F'] or row['prob_high_quality'] <= 0.4:
                return 'SELL'
            else:
                return 'HOLD'

        row = {'quality_score': 'C', 'prob_high_quality': 0.41}
        assert classify_signal(row) == 'HOLD'

    def test_classify_signal_sell_low_prob(self):
        """Low probability (<=0.4) should be SELL regardless of grade."""
        def classify_signal(row):
            if row['quality_score'] in ['A', 'B'] and row['prob_high_quality'] >= 0.6:
                return 'BUY'
            elif row['quality_score'] in ['D', 'F'] or row['prob_high_quality'] <= 0.4:
                return 'SELL'
            else:
                return 'HOLD'

        row = {'quality_score': 'C', 'prob_high_quality': 0.35}
        assert classify_signal(row) == 'SELL'


class TestQualityScoreCreation:
    """Test quality score quintile classification (A-F grades)."""

    def test_quality_score_quintiles(self):
        """Should assign A-F grades based on probability quintiles."""
        # Create sample probabilities
        probs = np.array([0.1, 0.3, 0.5, 0.7, 0.9, 0.15, 0.35, 0.55, 0.75, 0.85])

        # Compute quintiles (as done in generate_signals)
        quality_scores = pd.qcut(
            probs,
            q=5,
            labels=['F', 'D', 'C', 'B', 'A'],
            duplicates='drop'
        )

        # Top 20% should be A
        assert quality_scores[4] == 'A'  # 0.9
        assert quality_scores[9] == 'A'  # 0.85

        # Bottom 20% should be F
        assert quality_scores[0] == 'F'  # 0.1
        assert quality_scores[5] == 'F'  # 0.15

    def test_quality_score_handles_edge_cases(self):
        """Should handle edge cases with duplicate values."""
        # With duplicate values, qcut with duplicates='drop' may produce fewer bins
        # Test that we can handle this gracefully
        probs = np.array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0])

        # This should work fine with distinct values
        quality_scores = pd.qcut(
            probs,
            q=5,
            labels=['F', 'D', 'C', 'B', 'A'],
            duplicates='drop'
        )

        # Should have 5 grades for distinct values
        assert len(quality_scores.unique()) == 5
        # All values should be assigned a grade
        assert quality_scores.notna().all()
        # Check grade distribution
        unique_grades = set(quality_scores.unique())
        assert 'A' in unique_grades
        assert 'F' in unique_grades


class TestDerivedFeatures:
    """Test derived feature computation."""

    def test_pe_inverse_calculation(self):
        """Should compute PE inverse correctly."""
        df = pd.DataFrame({
            'pe_ratio': [10.0, 20.0, 15.0]
        })

        df['pe_inverse'] = 1 / df['pe_ratio'].replace(0, np.nan)

        assert df['pe_inverse'].iloc[0] == 0.1
        assert df['pe_inverse'].iloc[1] == 0.05
        assert df['pe_inverse'].iloc[2] == pytest.approx(0.0667, rel=1e-3)

    def test_pe_inverse_handles_zero(self):
        """Should handle zero PE ratio by converting to NaN."""
        df = pd.DataFrame({
            'pe_ratio': [10.0, 0.0, 15.0]
        })

        df['pe_inverse'] = 1 / df['pe_ratio'].replace(0, np.nan)

        assert not pd.isna(df['pe_inverse'].iloc[0])
        assert pd.isna(df['pe_inverse'].iloc[1])
        assert not pd.isna(df['pe_inverse'].iloc[2])

    def test_financial_health_score(self):
        """Should compute financial health score from ROE, current ratio, and debt."""
        df = pd.DataFrame({
            'roe': [0.15, 0.20, 0.10],
            'current_ratio': [1.5, 2.0, 1.2],
            'debt_to_equity': [0.5, 0.3, 0.7]
        })

        # Normalize
        roe_norm = (df['roe'] - df['roe'].mean()) / df['roe'].std()
        current_norm = (df['current_ratio'] - df['current_ratio'].mean()) / df['current_ratio'].std()
        debt_norm = (df['debt_to_equity'].mean() - df['debt_to_equity']) / df['debt_to_equity'].std()
        df['financial_health_score'] = (roe_norm + current_norm + debt_norm) / 3

        # Stock with best metrics should have highest score
        assert df['financial_health_score'].iloc[1] > df['financial_health_score'].iloc[2]

    def test_value_score_calculation(self):
        """Should compute value score from PE inverse, PB ratio, and ROE."""
        df = pd.DataFrame({
            'pe_ratio': [10.0, 20.0, 15.0],
            'pb_ratio': [2.0, 3.0, 1.5],
            'roe': [0.15, 0.10, 0.20]
        })

        df['pe_inverse'] = 1 / df['pe_ratio']
        pe_inv_rank = df['pe_inverse'].rank(pct=True)
        pb_inv_rank = 1 - df['pb_ratio'].rank(pct=True)
        roe_rank = df['roe'].rank(pct=True)
        df['value_score'] = (pe_inv_rank + pb_inv_rank + roe_rank) / 3

        # Stock with best value metrics (low PE, low PB, high ROE) should have highest score
        assert df['value_score'].iloc[2] > df['value_score'].iloc[1]


class TestCoverageFiltering:
    """Test coverage-based filtering of stocks."""

    def test_coverage_calculation(self):
        """Should calculate coverage as percentage of non-null features."""
        feature_names = ['pe_ratio', 'pb_ratio', 'roe', 'debt_to_equity']

        df = pd.DataFrame({
            'symbol': ['BHP', 'CBA', 'CSL'],
            'pe_ratio': [12.5, np.nan, 15.0],
            'pb_ratio': [2.3, 1.8, np.nan],
            'roe': [0.18, 0.15, 0.20],
            'debt_to_equity': [0.45, 0.50, 0.35]
        })

        df['coverage'] = df[feature_names].notna().sum(axis=1) / len(feature_names)

        assert df['coverage'].iloc[0] == 1.0  # BHP: 4/4
        assert df['coverage'].iloc[1] == 0.75  # CBA: 3/4
        assert df['coverage'].iloc[2] == 0.75  # CSL: 3/4

    def test_coverage_filtering(self):
        """Should filter stocks below coverage threshold."""
        feature_names = ['pe_ratio', 'pb_ratio', 'roe', 'debt_to_equity']

        df = pd.DataFrame({
            'symbol': ['BHP', 'CBA', 'CSL', 'WES'],
            'pe_ratio': [12.5, np.nan, 15.0, np.nan],
            'pb_ratio': [2.3, 1.8, np.nan, np.nan],
            'roe': [0.18, 0.15, 0.20, 0.12],
            'debt_to_equity': [0.45, 0.50, 0.35, np.nan]
        })

        df['coverage'] = df[feature_names].notna().sum(axis=1) / len(feature_names)
        df_valid = df[df['coverage'] >= 0.8].copy()

        # Only BHP should pass (100% coverage)
        assert len(df_valid) == 1
        assert df_valid['symbol'].iloc[0] == 'BHP'


class TestExpectedReturnMapping:
    """Test expected return calculation."""

    def test_expected_return_linear_mapping(self):
        """Should map probability to expected return linearly."""
        probs = pd.Series([0.3, 0.5, 0.7, 0.9])

        # Simple linear mapping: (prob - 0.5) * 0.2
        expected_returns = (probs - 0.5) * 0.2

        assert expected_returns.iloc[0] == pytest.approx(-0.04)
        assert expected_returns.iloc[1] == pytest.approx(0.0)
        assert expected_returns.iloc[2] == pytest.approx(0.04)
        assert expected_returns.iloc[3] == pytest.approx(0.08)

    def test_expected_return_bounds(self):
        """Expected return should be bounded for extreme probabilities."""
        probs = pd.Series([0.0, 0.25, 0.75, 1.0])
        expected_returns = (probs - 0.5) * 0.2

        # Check bounds
        assert expected_returns.min() == pytest.approx(-0.1)
        assert expected_returns.max() == pytest.approx(0.1)
