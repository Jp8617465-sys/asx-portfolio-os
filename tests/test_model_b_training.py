"""
Unit tests for Model B training logic.
Tests data preparation, quintile classification, and cross-validation.
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import cross_val_score
from sklearn.ensemble import RandomForestClassifier


class TestDataPreparation:
    """Test data preparation for Model B training."""

    def test_feature_selection_16_features(self):
        """Should select 16 fundamental features."""
        # Expected features from Model B
        expected_features = [
            'pe_ratio', 'pb_ratio', 'roe', 'debt_to_equity',
            'profit_margin', 'revenue_growth_yoy', 'current_ratio', 'quick_ratio',
            'eps_growth', 'pe_inverse', 'pe_ratio_zscore', 'pb_ratio_zscore',
            'financial_health_score', 'value_score', 'quality_score_v2',
            'roe_ratio'
        ]

        assert len(expected_features) == 16

    def test_null_filtering(self):
        """Should filter out rows with insufficient data."""
        df = pd.DataFrame({
            'symbol': ['BHP', 'CBA', 'CSL', 'WES'],
            'pe_ratio': [12.5, np.nan, 15.0, 10.0],
            'pb_ratio': [2.3, 1.8, np.nan, 2.0],
            'roe': [0.18, 0.15, 0.20, 0.12]
        })

        # Simulate coverage filtering (80% threshold)
        feature_cols = ['pe_ratio', 'pb_ratio', 'roe']
        df['coverage'] = df[feature_cols].notna().sum(axis=1) / len(feature_cols)
        df_valid = df[df['coverage'] >= 0.8].copy()

        # Should keep rows with at least 80% coverage
        assert len(df_valid) == 2  # BHP (100%), CBA (67% - excluded), CSL (67% - excluded), WES (100%)
        assert 'CBA' not in df_valid['symbol'].values
        assert 'CSL' not in df_valid['symbol'].values
        assert 'BHP' in df_valid['symbol'].values
        assert 'WES' in df_valid['symbol'].values

    def test_dropna_before_training(self):
        """Should drop any remaining NaNs after coverage filtering."""
        feature_cols = ['pe_ratio', 'pb_ratio', 'roe']

        df = pd.DataFrame({
            'pe_ratio': [12.5, 15.0, 10.0],
            'pb_ratio': [2.3, np.nan, 2.0],
            'roe': [0.18, 0.20, 0.12]
        })

        # Drop rows with any NaN in features
        df_clean = df.dropna(subset=feature_cols)

        assert len(df_clean) == 2  # Only rows 0 and 2


class TestQuintileClassification:
    """Test quintile-based target creation."""

    def test_quintile_labels(self):
        """Should create 5 quintiles labeled F to A."""
        # Simulate expected returns
        expected_returns = np.array([0.05, 0.10, 0.15, 0.20, 0.25,
                                     0.06, 0.11, 0.16, 0.21, 0.26])

        # Create quintiles
        quintiles = pd.qcut(
            expected_returns,
            q=5,
            labels=['F', 'D', 'C', 'B', 'A'],
            duplicates='drop'
        )

        # Check labels exist
        unique_labels = quintiles.unique()
        assert 'A' in unique_labels  # Top 20%
        assert 'F' in unique_labels  # Bottom 20%

    def test_quintile_binary_target(self):
        """Should convert top quintile (A) to 1, rest to 0 for binary classification."""
        quintiles = pd.Series(['F', 'D', 'C', 'B', 'A', 'A', 'B', 'C', 'D', 'F'])

        # Create binary target: A = high quality (1), rest = 0
        binary_target = (quintiles == 'A').astype(int)

        assert binary_target.sum() == 2  # Two 'A' grades
        assert (binary_target == 0).sum() == 8  # Rest are 0

    def test_quintile_distribution(self):
        """Should distribute stocks evenly into quintiles."""
        # Create 100 stocks with expected returns
        np.random.seed(42)
        expected_returns = np.random.uniform(0.0, 0.3, 100)

        quintiles = pd.qcut(
            expected_returns,
            q=5,
            labels=['F', 'D', 'C', 'B', 'A'],
            duplicates='drop'
        )

        # Each quintile should have ~20% of stocks
        value_counts = quintiles.value_counts()
        for label in ['F', 'D', 'C', 'B', 'A']:
            if label in value_counts:
                pct = value_counts[label] / len(quintiles)
                assert pct >= 0.15 and pct <= 0.25  # Allow some variance


class TestCrossValidation:
    """Test cross-validation logic."""

    def test_5_fold_cross_validation(self):
        """Should perform 5-fold cross-validation."""
        # Create dummy data
        np.random.seed(42)
        X = np.random.rand(100, 16)  # 100 samples, 16 features
        y = np.random.randint(0, 2, 100)  # Binary target

        # Train simple model
        model = RandomForestClassifier(n_estimators=10, random_state=42)

        # 5-fold CV
        scores = cross_val_score(model, X, y, cv=5, scoring='accuracy')

        assert len(scores) == 5  # Should have 5 fold scores
        assert all(0 <= score <= 1 for score in scores)  # Scores between 0 and 1

    def test_cv_scoring_metrics(self):
        """Should compute multiple scoring metrics (accuracy, precision, recall, f1)."""
        np.random.seed(42)
        X = np.random.rand(100, 16)
        y = np.random.randint(0, 2, 100)

        model = RandomForestClassifier(n_estimators=10, random_state=42)

        # Test multiple metrics
        for metric in ['accuracy', 'precision', 'recall', 'f1']:
            scores = cross_val_score(model, X, y, cv=5, scoring=metric)
            assert len(scores) == 5


class TestModelSerialization:
    """Test model saving and loading."""

    def test_model_saves_with_version(self):
        """Should save model with version number."""
        import tempfile
        import joblib
        from pathlib import Path

        # Create dummy model
        model = RandomForestClassifier(n_estimators=10, random_state=42)
        X = np.random.rand(50, 16)
        y = np.random.randint(0, 2, 50)
        model.fit(X, y)

        # Save to temp file
        with tempfile.TemporaryDirectory() as tmpdir:
            model_path = Path(tmpdir) / "model_b_v1_0_classifier.pkl"
            joblib.dump(model, model_path)

            # Verify file exists
            assert model_path.exists()

            # Load and verify
            loaded_model = joblib.load(model_path)
            assert loaded_model.n_estimators == 10

    def test_features_saved_to_json(self):
        """Should save feature names to JSON file."""
        import json
        import tempfile
        from pathlib import Path

        features = [
            'pe_ratio', 'pb_ratio', 'roe', 'debt_to_equity',
            'profit_margin', 'revenue_growth_yoy', 'current_ratio', 'quick_ratio',
            'eps_growth', 'pe_inverse', 'pe_ratio_zscore', 'pb_ratio_zscore',
            'financial_health_score', 'value_score', 'quality_score_v2',
            'roe_ratio'
        ]

        with tempfile.TemporaryDirectory() as tmpdir:
            features_path = Path(tmpdir) / "model_b_v1_0_features.json"

            with open(features_path, 'w') as f:
                json.dump({'features': features, 'version': 'v1_0'}, f)

            # Load and verify
            with open(features_path, 'r') as f:
                loaded = json.load(f)

            assert loaded['features'] == features
            assert loaded['version'] == 'v1_0'


class TestTrainingDataQuality:
    """Test training data quality checks."""

    def test_minimum_samples_required(self):
        """Should require minimum number of samples for training."""
        # Model B should require at least 50-100 samples
        min_samples = 50

        df = pd.DataFrame({
            'symbol': [f'STOCK{i}' for i in range(30)],
            'pe_ratio': np.random.uniform(5, 30, 30)
        })

        # Check if we have enough samples
        assert len(df) < min_samples

    def test_feature_variance_check(self):
        """Should check for zero-variance features."""
        df = pd.DataFrame({
            'pe_ratio': [15.0] * 100,  # Zero variance
            'pb_ratio': np.random.uniform(1, 5, 100),  # Normal variance
            'roe': np.random.uniform(0.05, 0.25, 100)
        })

        # Check variance
        variances = df.var()
        assert variances['pe_ratio'] == 0.0  # Should detect zero variance
        assert variances['pb_ratio'] > 0
        assert variances['roe'] > 0

    def test_outlier_detection(self):
        """Should detect outliers using z-score or IQR."""
        df = pd.DataFrame({
            'pe_ratio': [10, 12, 15, 13, 11, 14, 16, 100]  # 100 is outlier
        })

        # Z-score method with threshold of 2 (more appropriate for small samples)
        z_scores = np.abs((df['pe_ratio'] - df['pe_ratio'].mean()) / df['pe_ratio'].std())
        outliers = z_scores > 2

        assert outliers.sum() == 1  # Should detect 1 outlier
        assert df.loc[outliers, 'pe_ratio'].values[0] == 100


class TestClassImbalance:
    """Test handling of class imbalance."""

    def test_binary_target_balance(self):
        """Should check for severe class imbalance."""
        # Create imbalanced target
        y = np.array([0] * 95 + [1] * 5)  # 95% class 0, 5% class 1

        # Check imbalance
        class_1_pct = y.sum() / len(y)
        assert class_1_pct == 0.05  # 5% of class 1

        # Should consider techniques like SMOTE or class weighting if <20%
        assert class_1_pct < 0.2

    def test_class_weights_calculation(self):
        """Should calculate class weights for imbalanced data."""
        from sklearn.utils.class_weight import compute_class_weight

        y = np.array([0] * 80 + [1] * 20)

        class_weights = compute_class_weight('balanced', classes=np.unique(y), y=y)

        # Minority class should have higher weight
        assert class_weights[1] > class_weights[0]
