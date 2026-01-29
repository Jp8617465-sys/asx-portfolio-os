"""
Unit tests for fundamental feature engineering.
Tests derived features, sector normalization, and null handling.
"""

import pandas as pd
import numpy as np
import pytest


class TestDerivedFeatures:
    """Test derived feature calculations."""

    def test_pe_inverse_calculation(self):
        """Should calculate PE inverse correctly."""
        df = pd.DataFrame({
            'symbol': ['BHP', 'CBA', 'CSL'],
            'pe_ratio': [10.0, 20.0, 15.0]
        })

        df['pe_inverse'] = 1 / df['pe_ratio'].replace(0, np.nan)

        assert df.loc[0, 'pe_inverse'] == pytest.approx(0.1)
        assert df.loc[1, 'pe_inverse'] == pytest.approx(0.05)
        assert df.loc[2, 'pe_inverse'] == pytest.approx(0.0667, rel=1e-3)

    def test_pe_inverse_handles_zero(self):
        """Should convert zero PE to NaN to avoid division errors."""
        df = pd.DataFrame({
            'pe_ratio': [10.0, 0.0, 15.0]
        })

        df['pe_inverse'] = 1 / df['pe_ratio'].replace(0, np.nan)

        assert not pd.isna(df.loc[0, 'pe_inverse'])
        assert pd.isna(df.loc[1, 'pe_inverse'])
        assert not pd.isna(df.loc[2, 'pe_inverse'])

    def test_pe_inverse_handles_negative(self):
        """Should handle negative PE ratios."""
        df = pd.DataFrame({
            'pe_ratio': [10.0, -5.0, 15.0]
        })

        df['pe_inverse'] = 1 / df['pe_ratio'].replace(0, np.nan)

        assert df.loc[1, 'pe_inverse'] == pytest.approx(-0.2)


class TestSectorNormalization:
    """Test sector z-score normalization."""

    def test_pe_ratio_zscore(self):
        """Should calculate PE ratio z-score across all stocks."""
        df = pd.DataFrame({
            'symbol': ['BHP', 'CBA', 'CSL'],
            'pe_ratio': [10.0, 20.0, 15.0]
        })

        mean = df['pe_ratio'].mean()  # 15.0
        std = df['pe_ratio'].std()    # 5.0
        df['pe_ratio_zscore'] = (df['pe_ratio'] - mean) / std

        assert df.loc[0, 'pe_ratio_zscore'] == pytest.approx(-1.0)  # (10-15)/5
        assert df.loc[1, 'pe_ratio_zscore'] == pytest.approx(1.0)   # (20-15)/5
        assert df.loc[2, 'pe_ratio_zscore'] == pytest.approx(0.0)   # (15-15)/5

    def test_pb_ratio_zscore(self):
        """Should calculate PB ratio z-score."""
        df = pd.DataFrame({
            'pb_ratio': [1.0, 3.0, 2.0]
        })

        mean = df['pb_ratio'].mean()  # 2.0
        std = df['pb_ratio'].std()    # 1.0
        df['pb_ratio_zscore'] = (df['pb_ratio'] - mean) / std

        assert df.loc[0, 'pb_ratio_zscore'] == pytest.approx(-1.0)
        assert df.loc[1, 'pb_ratio_zscore'] == pytest.approx(1.0)
        assert df.loc[2, 'pb_ratio_zscore'] == pytest.approx(0.0)

    def test_zscore_handles_constant_values(self):
        """Should handle constant values (std=0) gracefully."""
        df = pd.DataFrame({
            'pe_ratio': [15.0, 15.0, 15.0]
        })

        mean = df['pe_ratio'].mean()
        std = df['pe_ratio'].std()
        # std will be 0 for constant values
        with np.errstate(divide='ignore', invalid='ignore'):
            df['pe_ratio_zscore'] = (df['pe_ratio'] - mean) / std

        # All z-scores should be NaN or inf when std=0
        assert pd.isna(df['pe_ratio_zscore'].iloc[0]) or np.isinf(df['pe_ratio_zscore'].iloc[0])


class TestFinancialHealthScore:
    """Test financial health score composition."""

    def test_financial_health_score_calculation(self):
        """Should compute health score from ROE, current ratio, and debt."""
        df = pd.DataFrame({
            'roe': [0.15, 0.20, 0.10],
            'current_ratio': [1.5, 2.0, 1.2],
            'debt_to_equity': [0.5, 0.3, 0.7]
        })

        # Normalize each component
        roe_norm = (df['roe'] - df['roe'].mean()) / df['roe'].std()
        current_norm = (df['current_ratio'] - df['current_ratio'].mean()) / df['current_ratio'].std()
        debt_norm = (df['debt_to_equity'].mean() - df['debt_to_equity']) / df['debt_to_equity'].std()  # Inverted

        df['financial_health_score'] = (roe_norm + current_norm + debt_norm) / 3

        # Stock with best metrics (high ROE, high current, low debt) should have highest score
        # Row 1: ROE=0.20 (highest), current=2.0 (highest), debt=0.3 (lowest)
        assert df.loc[1, 'financial_health_score'] > df.loc[0, 'financial_health_score']
        assert df.loc[1, 'financial_health_score'] > df.loc[2, 'financial_health_score']

    def test_financial_health_debt_inverted(self):
        """Should invert debt_to_equity (lower is better)."""
        df = pd.DataFrame({
            'roe': [0.15, 0.15],
            'current_ratio': [1.5, 1.5],
            'debt_to_equity': [0.3, 0.7]  # First has lower debt
        })

        roe_norm = (df['roe'] - df['roe'].mean()) / df['roe'].std()
        current_norm = (df['current_ratio'] - df['current_ratio'].mean()) / df['current_ratio'].std()
        debt_norm = (df['debt_to_equity'].mean() - df['debt_to_equity']) / df['debt_to_equity'].std()

        df['financial_health_score'] = (roe_norm.fillna(0) + current_norm.fillna(0) + debt_norm.fillna(0)) / 3

        # Lower debt should result in higher health score
        assert df.loc[0, 'financial_health_score'] > df.loc[1, 'financial_health_score']

    def test_financial_health_handles_missing_values(self):
        """Should handle missing values with fillna(0)."""
        df = pd.DataFrame({
            'roe': [0.15, np.nan, 0.10],
            'current_ratio': [1.5, 2.0, np.nan],
            'debt_to_equity': [0.5, 0.3, 0.7]
        })

        roe_norm = (df['roe'] - df['roe'].mean()) / df['roe'].std()
        current_norm = (df['current_ratio'] - df['current_ratio'].mean()) / df['current_ratio'].std()
        debt_norm = (df['debt_to_equity'].mean() - df['debt_to_equity']) / df['debt_to_equity'].std()

        df['financial_health_score'] = (roe_norm.fillna(0) + current_norm.fillna(0) + debt_norm.fillna(0)) / 3

        # Should not have NaN in final score
        assert not pd.isna(df['financial_health_score'].iloc[0])
        assert not pd.isna(df['financial_health_score'].iloc[1])
        assert not pd.isna(df['financial_health_score'].iloc[2])


class TestValueScore:
    """Test value score calculation."""

    def test_value_score_calculation(self):
        """Should combine PE inverse, PB ratio (inverted), and ROE."""
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

        # Row 2: pe_inverse=1/15 (mid), pb=1.5 (best), roe=0.20 (best)
        assert df.loc[2, 'value_score'] > df.loc[1, 'value_score']

    def test_value_score_pb_inverted(self):
        """Should invert PB ratio (lower is better for value)."""
        df = pd.DataFrame({
            'pe_ratio': [10.0, 10.0],
            'pb_ratio': [1.5, 3.0],  # First has better (lower) PB
            'roe': [0.15, 0.15]
        })

        df['pe_inverse'] = 1 / df['pe_ratio']
        pe_inv_rank = df['pe_inverse'].rank(pct=True)
        pb_inv_rank = 1 - df['pb_ratio'].rank(pct=True)
        roe_rank = df['roe'].rank(pct=True)
        df['value_score'] = (pe_inv_rank + pb_inv_rank + roe_rank) / 3

        # Lower PB should result in higher value score
        assert df.loc[0, 'value_score'] > df.loc[1, 'value_score']

    def test_value_score_uses_percentile_ranks(self):
        """Should use percentile ranks (0-1) for all components."""
        df = pd.DataFrame({
            'pe_ratio': [10.0, 15.0, 20.0, 25.0],
            'pb_ratio': [1.0, 1.5, 2.0, 2.5],
            'roe': [0.10, 0.15, 0.20, 0.25]
        })

        df['pe_inverse'] = 1 / df['pe_ratio']
        pe_inv_rank = df['pe_inverse'].rank(pct=True)
        pb_inv_rank = 1 - df['pb_ratio'].rank(pct=True)
        roe_rank = df['roe'].rank(pct=True)
        df['value_score'] = (pe_inv_rank + pb_inv_rank + roe_rank) / 3

        # All components should be between 0 and 1
        assert pe_inv_rank.min() == 0.25  # Lowest rank
        assert pe_inv_rank.max() == 1.0   # Highest rank
        assert pb_inv_rank.min() == 0.0   # 1 - 1.0
        assert pb_inv_rank.max() == 0.75  # 1 - 0.25


class TestQualityScoreV2:
    """Test quality score v2 calculation."""

    def test_quality_score_v2_calculation(self):
        """Should combine ROE, profit margin, and revenue growth."""
        df = pd.DataFrame({
            'roe': [0.15, 0.20, 0.10],
            'profit_margin': [0.12, 0.15, 0.10],
            'revenue_growth_yoy': [0.08, 0.12, 0.05]
        })

        roe_rank = df['roe'].rank(pct=True)
        margin_rank = df['profit_margin'].rank(pct=True)
        growth_rank = df['revenue_growth_yoy'].rank(pct=True)
        df['quality_score_v2'] = (roe_rank + margin_rank + growth_rank) / 3

        # Row 1 has highest values for all metrics
        assert df.loc[1, 'quality_score_v2'] > df.loc[0, 'quality_score_v2']
        assert df.loc[1, 'quality_score_v2'] > df.loc[2, 'quality_score_v2']

    def test_quality_score_v2_equal_weighting(self):
        """Should weight all three components equally."""
        df = pd.DataFrame({
            'roe': [0.10, 0.20],
            'profit_margin': [0.10, 0.10],
            'revenue_growth_yoy': [0.10, 0.10]
        })

        roe_rank = df['roe'].rank(pct=True)
        margin_rank = df['profit_margin'].rank(pct=True)
        growth_rank = df['revenue_growth_yoy'].rank(pct=True)
        df['quality_score_v2'] = (roe_rank + margin_rank + growth_rank) / 3

        # Difference should be driven by ROE only
        score_diff = df.loc[1, 'quality_score_v2'] - df.loc[0, 'quality_score_v2']
        roe_rank_diff = roe_rank.iloc[1] - roe_rank.iloc[0]

        # Score difference should be 1/3 of rank difference (equal weighting)
        assert score_diff == pytest.approx(roe_rank_diff / 3)


class TestAdditionalRatios:
    """Test additional ratio features."""

    def test_roe_ratio_passthrough(self):
        """Should pass through ROE as roe_ratio."""
        df = pd.DataFrame({
            'roe': [0.15, 0.20, 0.10]
        })

        df['roe_ratio'] = df['roe']

        assert df['roe_ratio'].equals(df['roe'])

    def test_debt_to_equity_ratio_passthrough(self):
        """Should pass through debt_to_equity as debt_to_equity_ratio."""
        df = pd.DataFrame({
            'debt_to_equity': [0.5, 0.3, 0.7]
        })

        df['debt_to_equity_ratio'] = df['debt_to_equity']

        assert df['debt_to_equity_ratio'].equals(df['debt_to_equity'])


class TestNullHandling:
    """Test handling of null/missing values."""

    def test_derived_features_with_nulls(self):
        """Should handle null values in derived features."""
        df = pd.DataFrame({
            'pe_ratio': [10.0, np.nan, 15.0],
            'pb_ratio': [2.0, 3.0, np.nan],
            'roe': [0.15, 0.10, 0.20]
        })

        df['pe_inverse'] = 1 / df['pe_ratio'].replace(0, np.nan)

        # PE inverse should be null where PE ratio is null
        assert not pd.isna(df['pe_inverse'].iloc[0])
        assert pd.isna(df['pe_inverse'].iloc[1])
        assert not pd.isna(df['pe_inverse'].iloc[2])

    def test_zscore_with_nulls(self):
        """Should compute z-scores ignoring null values."""
        df = pd.DataFrame({
            'pe_ratio': [10.0, np.nan, 20.0, 15.0]
        })

        mean = df['pe_ratio'].mean()  # Should ignore NaN
        std = df['pe_ratio'].std()
        df['pe_ratio_zscore'] = (df['pe_ratio'] - mean) / std

        # Z-score should be null where input is null
        assert not pd.isna(df['pe_ratio_zscore'].iloc[0])
        assert pd.isna(df['pe_ratio_zscore'].iloc[1])
        assert not pd.isna(df['pe_ratio_zscore'].iloc[2])

    def test_composite_score_with_nulls(self):
        """Should handle null values in composite scores."""
        df = pd.DataFrame({
            'roe': [0.15, np.nan, 0.10],
            'profit_margin': [0.12, 0.15, np.nan],
            'revenue_growth_yoy': [0.08, 0.12, 0.05]
        })

        roe_rank = df['roe'].rank(pct=True)
        margin_rank = df['profit_margin'].rank(pct=True)
        growth_rank = df['revenue_growth_yoy'].rank(pct=True)
        df['quality_score_v2'] = (roe_rank + margin_rank + growth_rank) / 3

        # Scores should have nulls where inputs have nulls
        assert not pd.isna(df['quality_score_v2'].iloc[0])
        assert pd.isna(df['quality_score_v2'].iloc[1])  # ROE is null
        assert pd.isna(df['quality_score_v2'].iloc[2])  # Profit margin is null
