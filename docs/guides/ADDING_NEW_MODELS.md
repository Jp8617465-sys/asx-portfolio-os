# Adding New ML Models to ASX Portfolio OS

**Guide Version:** 1.0
**Last Updated:** 2024-02-05
**Difficulty:** Intermediate

## Overview

This guide shows how to add new model plugins (Model D, E, F, etc.) to the ASX Portfolio OS ensemble system. The plugin architecture makes it easy to add models without modifying existing code.

**Time to Complete:** 2-4 hours (including testing)

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Implement ModelPlugin Interface](#step-1-implement-modelplugin-interface)
3. [Step 2: Update models.yaml Configuration](#step-2-update-modelsyaml-configuration)
4. [Step 3: Register in Model Registry](#step-3-register-in-model-registry)
5. [Step 4: Test the Plugin](#step-4-test-the-plugin)
6. [Step 5: Update Ensemble Weights](#step-5-update-ensemble-weights)
7. [Step 6: Deploy to Production](#step-6-deploy-to-production)
8. [Example: Adding Model D (Sentiment)](#example-adding-model-d-sentiment)

---

## Prerequisites

Before adding a new model, ensure you have:

- [x] Trained ML model with saved artifacts (`.pkl`, `.joblib`, etc.)
- [x] Feature engineering pipeline documented
- [x] Performance metrics (ROC-AUC, accuracy, etc.)
- [x] Understanding of the ModelPlugin interface
- [x] Access to the codebase and database

**Required Reading:**
- [`/docs/architecture/BACKEND_ARCHITECTURE.md`](/docs/architecture/BACKEND_ARCHITECTURE.md) - Plugin System section
- [`/app/features/models/plugins/base.py`](/app/features/models/plugins/base.py) - Interface definition

---

## Step 1: Implement ModelPlugin Interface

Create a new plugin file that implements the `ModelPlugin` abstract base class.

### File Location

```
/app/features/models/plugins/model_d.py
```

### Template

```python
"""
Model D Plugin: [Brief description, e.g., "Sentiment-based signals from news/social media"]

This plugin implements:
- Feature extraction from [data source]
- Signal generation using [algorithm]
- Integration with ensemble system
"""

import pickle
from datetime import date
from typing import List, Dict, Any, Optional
from pathlib import Path

from app.features.models.plugins.base import (
    ModelPlugin,
    ModelOutput,
    SignalType,
    ModelConfig
)
from app.core import logger, db_context
from psycopg2.extras import RealDictCursor


class ModelDPlugin(ModelPlugin):
    """
    Model D: Sentiment-based signals.

    Features:
    - News sentiment analysis (NLP)
    - Social media sentiment (Twitter/Reddit)
    - Company announcement tone
    - Analyst upgrade/downgrade tracking

    Algorithm: Transformer-based sentiment classifier + XGBoost aggregator
    Performance: 68% accuracy, 0.71 ROC-AUC
    """

    def __init__(self, config: ModelConfig):
        """
        Initialize Model D plugin.

        Args:
            config: ModelConfig with model_id, enabled, weight, etc.
        """
        super().__init__(config)

        # Load trained model
        self.model = self._load_model()
        self.sentiment_analyzer = self._load_sentiment_analyzer()

        logger.info(f"Initialized {config.model_id} plugin (version: {config.version})")

    def _load_model(self):
        """Load trained ML model from artifacts."""
        model_path = Path(__file__).parent.parent / "artifacts" / "model_d_v1.pkl"

        if not model_path.exists():
            raise FileNotFoundError(f"Model artifact not found: {model_path}")

        with open(model_path, "rb") as f:
            model = pickle.load(f)

        logger.info(f"Loaded model from {model_path}")
        return model

    def _load_sentiment_analyzer(self):
        """Load sentiment analysis model (e.g., HuggingFace transformer)."""
        # Example: Load pre-trained sentiment model
        from transformers import pipeline

        analyzer = pipeline(
            "sentiment-analysis",
            model="ProsusAI/finbert"  # Financial sentiment model
        )

        logger.info("Loaded FinBERT sentiment analyzer")
        return analyzer

    async def generate_signals(
        self,
        symbols: List[str],
        as_of: date
    ) -> List[ModelOutput]:
        """
        Generate sentiment-based signals for given symbols.

        Process:
        1. Fetch recent news/announcements for each symbol
        2. Run sentiment analysis
        3. Aggregate sentiment scores
        4. Generate ML predictions
        5. Convert to ModelOutput objects

        Args:
            symbols: List of ticker symbols (e.g., ["BHP.AX", "CBA.AX"])
            as_of: Date for signal generation

        Returns:
            List of ModelOutput objects with signals and confidence scores
        """
        logger.info(f"Generating Model D signals for {len(symbols)} symbols on {as_of}")

        outputs = []

        for symbol in symbols:
            try:
                # Step 1: Fetch features (sentiment data)
                features = await self._fetch_features(symbol, as_of)

                if features is None:
                    logger.warning(f"No sentiment data for {symbol}, skipping")
                    continue

                # Step 2: Generate prediction
                prediction = self.model.predict_proba([features])[0]
                confidence = float(prediction[1])  # Probability of positive class

                # Step 3: Convert to signal
                signal = self._confidence_to_signal(confidence)

                # Step 4: Calculate expected return
                expected_return = self._calculate_expected_return(confidence)

                # Create ModelOutput
                output = ModelOutput(
                    symbol=symbol,
                    signal=signal,
                    confidence=confidence,
                    expected_return=expected_return,
                    rank=0  # Will be set after sorting
                )

                outputs.append(output)

            except Exception as e:
                logger.error(f"Error generating signal for {symbol}: {e}")
                continue

        # Sort by confidence (descending)
        outputs.sort(key=lambda x: x.confidence, reverse=True)

        # Assign ranks
        for i, output in enumerate(outputs, start=1):
            output.rank = i

        logger.info(f"Generated {len(outputs)} Model D signals")
        return outputs

    async def _fetch_features(
        self,
        symbol: str,
        as_of: date
    ) -> Optional[Dict[str, float]]:
        """
        Fetch sentiment features for a symbol.

        Features:
        - news_sentiment_7d: Average sentiment of news in last 7 days
        - news_volume_7d: Number of news articles in last 7 days
        - social_sentiment_7d: Average social media sentiment
        - announcement_sentiment_30d: Company announcement sentiment
        - analyst_upgrades_30d: Count of analyst upgrades

        Returns:
            Dictionary of feature values, or None if no data available
        """
        try:
            with db_context() as conn:
                cur = conn.cursor(cursor_factory=RealDictCursor)

                # Query sentiment data from database
                cur.execute(
                    """
                    SELECT
                        AVG(news_sentiment) as news_sentiment_7d,
                        COUNT(*) as news_volume_7d,
                        AVG(social_sentiment) as social_sentiment_7d,
                        SUM(CASE WHEN announcement_type = 'upgrade' THEN 1 ELSE 0 END) as analyst_upgrades_30d
                    FROM sentiment_data
                    WHERE symbol = %s
                      AND date BETWEEN %s - INTERVAL '30 days' AND %s
                    """,
                    (symbol, as_of, as_of)
                )

                row = cur.fetchone()

                if not row or row['news_volume_7d'] == 0:
                    return None

                features = {
                    "news_sentiment_7d": float(row['news_sentiment_7d'] or 0),
                    "news_volume_7d": float(row['news_volume_7d'] or 0),
                    "social_sentiment_7d": float(row['social_sentiment_7d'] or 0),
                    "analyst_upgrades_30d": float(row['analyst_upgrades_30d'] or 0),
                }

                return features

        except Exception as e:
            logger.error(f"Error fetching features for {symbol}: {e}")
            return None

    def _confidence_to_signal(self, confidence: float) -> SignalType:
        """
        Convert confidence score to signal type.

        Thresholds:
        - confidence >= 0.75 → STRONG_BUY
        - confidence >= 0.60 → BUY
        - confidence >= 0.40 → HOLD
        - confidence >= 0.25 → SELL
        - confidence < 0.25  → STRONG_SELL
        """
        if confidence >= 0.75:
            return "STRONG_BUY"
        elif confidence >= 0.60:
            return "BUY"
        elif confidence >= 0.40:
            return "HOLD"
        elif confidence >= 0.25:
            return "SELL"
        else:
            return "STRONG_SELL"

    def _calculate_expected_return(self, confidence: float) -> float:
        """
        Estimate expected return based on confidence.

        This is model-specific and should be calibrated using historical data.

        Args:
            confidence: Model confidence score (0 to 1)

        Returns:
            Expected return (e.g., 0.15 = 15% expected return)
        """
        # Example calibration (adjust based on backtesting)
        if confidence >= 0.75:
            return 0.20  # 20% expected return for high-confidence signals
        elif confidence >= 0.60:
            return 0.10
        elif confidence >= 0.40:
            return 0.0
        elif confidence >= 0.25:
            return -0.10
        else:
            return -0.20

    def get_metadata(self) -> Dict[str, Any]:
        """
        Return model metadata for registry and monitoring.

        Returns:
            Dictionary with model information
        """
        return {
            "model_id": "model_d",
            "name": "Sentiment Analysis Model",
            "version": "v1.0.0",
            "type": "sentiment",
            "algorithm": "FinBERT + XGBoost",
            "features": [
                "news_sentiment_7d",
                "news_volume_7d",
                "social_sentiment_7d",
                "announcement_sentiment_30d",
                "analyst_upgrades_30d"
            ],
            "trained_on": "2022-01-01 to 2024-01-01",
            "performance": {
                "accuracy": 0.68,
                "roc_auc": 0.71,
                "precision": 0.65,
                "recall": 0.72
            },
            "data_sources": [
                "NewsAPI",
                "ASX announcements",
                "Reddit r/ASX_Bets",
                "Twitter financial hashtags"
            ]
        }
```

---

## Step 2: Update models.yaml Configuration

Add your new model to the configuration file.

### File Location

```
/app/features/models/config/models.yaml
```

### Configuration

```yaml
ensemble:
  enabled: true
  conflict_strategy: weighted_majority
  min_agreement: 0.5
  min_confidence: 0.6
  flag_conflicts: true

models:
  # Existing models
  - model_id: model_a
    enabled: true
    weight: 0.50  # Reduced from 0.60 to make room for Model D
    version: v1.2.0
    type: technical
    description: "Momentum-based technical analysis"

  - model_id: model_b
    enabled: true
    weight: 0.30  # Reduced from 0.40
    version: v1.1.0
    type: fundamental
    description: "Fundamental analysis (P/E, revenue, etc.)"

  # NEW MODEL
  - model_id: model_d
    enabled: true
    weight: 0.20
    version: v1.0.0
    type: sentiment
    description: "Sentiment analysis from news and social media"
    config:
      sentiment_threshold: 0.6
      min_news_volume: 3
      lookback_days: 7
```

### Configuration Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `model_id` | string | Unique identifier (must match plugin class) |
| `enabled` | boolean | Whether to include in ensemble |
| `weight` | float | Ensemble weight (all weights should sum to 1.0) |
| `version` | string | Model version for tracking |
| `type` | string | Model category (technical, fundamental, sentiment, etc.) |
| `description` | string | Human-readable description |
| `config` | dict | Model-specific configuration |

---

## Step 3: Register in Model Registry

Register your plugin so it can be discovered by the ensemble system.

### File Location

```
/app/features/models/registry/model_registry.py
```

### Registration Code

```python
# In model_registry.py

from app.features.models.plugins.model_a import ModelAPlugin
from app.features.models.plugins.model_b import ModelBPlugin
from app.features.models.plugins.model_d import ModelDPlugin  # NEW

class ModelRegistry:
    """Singleton registry for model plugins."""

    def __init__(self):
        self._plugins: Dict[str, Type[ModelPlugin]] = {}
        self._config = self._load_config()

        # Register all available plugins
        self._register_plugins()

    def _register_plugins(self):
        """Register all model plugins."""
        self.register("model_a", ModelAPlugin)
        self.register("model_b", ModelBPlugin)
        self.register("model_d", ModelDPlugin)  # NEW

        logger.info(f"Registered {len(self._plugins)} model plugins")

    # ... rest of class
```

---

## Step 4: Test the Plugin

Write comprehensive tests for your new model plugin.

### File Location

```
/app/features/models/plugins/__tests__/test_model_d.py
```

### Test Template

```python
"""
Tests for Model D (Sentiment) Plugin
"""

import pytest
from datetime import date
from unittest.mock import Mock, patch, MagicMock

from app.features.models.plugins.model_d import ModelDPlugin
from app.features.models.plugins.base import ModelConfig, ModelOutput


@pytest.fixture
def mock_model_config():
    """Create mock ModelConfig for testing."""
    return ModelConfig(
        model_id="model_d",
        enabled=True,
        weight=0.20,
        version="v1.0.0",
        type="sentiment"
    )


@pytest.fixture
def mock_db_context():
    """Mock database context."""
    with patch('app.features.models.plugins.model_d.db_context') as mock_ctx:
        mock_conn = MagicMock()
        mock_cursor = MagicMock()

        mock_ctx.return_value.__enter__.return_value = mock_conn
        mock_ctx.return_value.__exit__.return_value = None
        mock_conn.cursor.return_value = mock_cursor

        # Mock sentiment data
        mock_cursor.fetchone.return_value = {
            'news_sentiment_7d': 0.75,
            'news_volume_7d': 10,
            'social_sentiment_7d': 0.65,
            'analyst_upgrades_30d': 2
        }

        yield {'context': mock_ctx, 'conn': mock_conn, 'cursor': mock_cursor}


class TestModelDPlugin:
    """Test suite for Model D plugin."""

    def test_initialization(self, mock_model_config):
        """Test that plugin initializes correctly."""
        with patch.object(ModelDPlugin, '_load_model'), \
             patch.object(ModelDPlugin, '_load_sentiment_analyzer'):

            plugin = ModelDPlugin(mock_model_config)

            assert plugin.config.model_id == "model_d"
            assert plugin.config.weight == 0.20

    @pytest.mark.asyncio
    async def test_generate_signals_success(
        self, mock_model_config, mock_db_context
    ):
        """Test successful signal generation."""
        with patch.object(ModelDPlugin, '_load_model') as mock_load_model, \
             patch.object(ModelDPlugin, '_load_sentiment_analyzer'):

            # Mock model predictions
            mock_model = Mock()
            mock_model.predict_proba.return_value = [[0.3, 0.7]]  # 70% confidence
            mock_load_model.return_value = mock_model

            plugin = ModelDPlugin(mock_model_config)

            # Generate signals
            symbols = ["BHP.AX"]
            as_of = date(2024, 1, 15)

            signals = await plugin.generate_signals(symbols, as_of)

            # Assertions
            assert len(signals) == 1
            assert signals[0].symbol == "BHP.AX"
            assert signals[0].signal == "BUY"  # 0.7 confidence -> BUY
            assert signals[0].confidence == 0.7
            assert signals[0].rank == 1

    def test_confidence_to_signal_thresholds(self, mock_model_config):
        """Test signal threshold conversion."""
        with patch.object(ModelDPlugin, '_load_model'), \
             patch.object(ModelDPlugin, '_load_sentiment_analyzer'):

            plugin = ModelDPlugin(mock_model_config)

            # Test thresholds
            assert plugin._confidence_to_signal(0.80) == "STRONG_BUY"
            assert plugin._confidence_to_signal(0.65) == "BUY"
            assert plugin._confidence_to_signal(0.50) == "HOLD"
            assert plugin._confidence_to_signal(0.30) == "SELL"
            assert plugin._confidence_to_signal(0.20) == "STRONG_SELL"

    def test_get_metadata(self, mock_model_config):
        """Test metadata retrieval."""
        with patch.object(ModelDPlugin, '_load_model'), \
             patch.object(ModelDPlugin, '_load_sentiment_analyzer'):

            plugin = ModelDPlugin(mock_model_config)
            metadata = plugin.get_metadata()

            assert metadata['model_id'] == "model_d"
            assert metadata['type'] == "sentiment"
            assert 'performance' in metadata
            assert 'roc_auc' in metadata['performance']
```

### Run Tests

```bash
# Run Model D tests only
pytest app/features/models/plugins/__tests__/test_model_d.py -v

# Run all model plugin tests
pytest app/features/models/plugins/__tests__/ -v

# Run with coverage
pytest app/features/models/plugins/__tests__/test_model_d.py --cov=app.features.models.plugins.model_d
```

---

## Step 5: Update Ensemble Weights

After adding a new model, rebalance the ensemble weights.

### Weight Adjustment Strategy

**Before (2 models):**
```yaml
model_a: 0.60  # Technical
model_b: 0.40  # Fundamental
```

**After (3 models):**
```yaml
model_a: 0.50  # Technical (reduced)
model_b: 0.30  # Fundamental (reduced)
model_d: 0.20  # Sentiment (new)
```

### Weight Tuning Guidelines

1. **Equal weights** as starting point:
   ```yaml
   model_a: 0.33
   model_b: 0.33
   model_d: 0.33
   ```

2. **Performance-based weighting** (recommended):
   - Weight by historical ROC-AUC or accuracy
   - Example: If Model A has 0.80 AUC, Model B has 0.75 AUC, Model D has 0.71 AUC:
     ```python
     total_auc = 0.80 + 0.75 + 0.71 = 2.26
     model_a_weight = 0.80 / 2.26 = 0.35
     model_b_weight = 0.75 / 2.26 = 0.33
     model_d_weight = 0.71 / 2.26 = 0.31
     ```

3. **Backtesting validation**:
   - Run ensemble with different weight combinations
   - Measure combined performance on holdout set
   - Select weights that maximize Sharpe ratio or returns

### Validation

```python
# In scripts/validate_ensemble_weights.py

def validate_weights():
    """Ensure ensemble weights sum to 1.0."""
    weights = model_registry.get_ensemble_weights()

    total_weight = sum(weights.values())
    assert abs(total_weight - 1.0) < 0.01, f"Weights sum to {total_weight}, not 1.0"

    print(f"✅ Ensemble weights validated: {weights}")
```

---

## Step 6: Deploy to Production

### Pre-Deployment Checklist

- [ ] All tests passing (`pytest app/features/models/plugins/__tests__/test_model_d.py`)
- [ ] Model artifacts uploaded to storage (S3, GCS, etc.)
- [ ] Database migrations applied (if new tables needed)
- [ ] Configuration validated (`models.yaml` weights sum to 1.0)
- [ ] Performance benchmarks meet targets
- [ ] Code review approved
- [ ] Documentation updated

### Deployment Steps

1. **Stage model artifacts:**
   ```bash
   # Upload model to S3/GCS
   aws s3 cp model_d_v1.pkl s3://asx-portfolio-models/model_d/v1.0.0/
   ```

2. **Update environment variables:**
   ```bash
   # In .env or deployment config
   MODEL_D_ARTIFACT_PATH=s3://asx-portfolio-models/model_d/v1.0.0/model_d_v1.pkl
   ```

3. **Deploy code:**
   ```bash
   git checkout -b feature/add-model-d
   git add .
   git commit -m "feat: Add Model D (sentiment analysis) plugin"
   git push origin feature/add-model-d

   # Create pull request and merge after review
   ```

4. **Run database migrations** (if needed):
   ```bash
   alembic upgrade head
   ```

5. **Restart services:**
   ```bash
   # On Render/Heroku/AWS
   render deploy
   ```

6. **Verify deployment:**
   ```bash
   curl https://api.asxportfolio.com/model/status/summary

   # Should show model_d in response
   ```

### Gradual Rollout (Recommended)

1. **Phase 1: Shadow mode** (weight=0.0)
   - Generate signals but don't use in ensemble
   - Monitor for errors

2. **Phase 2: Low weight** (weight=0.05)
   - Minimal impact on ensemble
   - Validate performance

3. **Phase 3: Target weight** (weight=0.20)
   - Full integration after 1-2 weeks of monitoring

---

## Example: Adding Model D (Sentiment)

Let's walk through a complete example of adding a sentiment-based model.

### Scenario

**Goal:** Add a sentiment analysis model that analyzes ASX announcements and news to generate trading signals.

**Data Sources:**
- ASX company announcements
- NewsAPI articles
- Social media (Reddit r/ASX_Bets)

**Algorithm:** FinBERT (Transformer) + XGBoost classifier

### Implementation

#### 1. Create Plugin File

File: `/app/features/models/plugins/model_d.py`

(Use the template from Step 1 above)

#### 2. Update Configuration

File: `/app/features/models/config/models.yaml`

```yaml
models:
  - model_id: model_d
    enabled: true
    weight: 0.20
    version: v1.0.0
    type: sentiment
    config:
      sentiment_threshold: 0.6
      min_news_volume: 3
```

#### 3. Register Plugin

File: `/app/features/models/registry/model_registry.py`

```python
from app.features.models.plugins.model_d import ModelDPlugin

# In _register_plugins method:
self.register("model_d", ModelDPlugin)
```

#### 4. Write Tests

File: `/app/features/models/plugins/__tests__/test_model_d.py`

(Use the test template from Step 4 above)

#### 5. Test Locally

```bash
# Run tests
pytest app/features/models/plugins/__tests__/test_model_d.py -v

# Test ensemble with Model D
python scripts/test_ensemble_locally.py --models model_a,model_b,model_d
```

#### 6. Deploy

```bash
git add .
git commit -m "feat: Add Model D (sentiment analysis)"
git push origin feature/add-model-d

# Create PR, get review, merge, deploy
```

---

## Troubleshooting

### Common Issues

**1. Model artifact not found**
```
FileNotFoundError: Model artifact not found: /path/to/model_d_v1.pkl
```

**Solution:** Verify artifact path and upload model file.

**2. Weights don't sum to 1.0**
```
AssertionError: Ensemble weights sum to 1.05, not 1.0
```

**Solution:** Adjust weights in `models.yaml` to sum to exactly 1.0.

**3. Plugin not registered**
```
KeyError: 'model_d' not found in registry
```

**Solution:** Ensure `_register_plugins()` includes your new model.

**4. Database schema mismatch**
```
psycopg2.errors.UndefinedColumn: column "sentiment_score" does not exist
```

**Solution:** Run database migrations to add required columns.

---

## Summary

Adding a new model involves:

1. ✅ Implement `ModelPlugin` interface
2. ✅ Update `models.yaml` configuration
3. ✅ Register in `ModelRegistry`
4. ✅ Write comprehensive tests
5. ✅ Adjust ensemble weights
6. ✅ Deploy to production

**Next Steps:**
- Monitor model performance in production
- Iterate on weights based on backtesting
- Add Model E, Model F following the same pattern

For architecture details, see: [`/docs/architecture/BACKEND_ARCHITECTURE.md`](/docs/architecture/BACKEND_ARCHITECTURE.md)
For TDD guidelines, see: [`/docs/testing/TDD_GUIDELINES.md`](/docs/testing/TDD_GUIDELINES.md)
