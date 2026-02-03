# V2 Quick Start Guide

Quick reference for running the V2 (Model B + Ensemble) pipeline.

## Prerequisites

1. **Database Access**: Ensure DATABASE_URL is set and accessible
2. **Dependencies**: yfinance installed (`pip install yfinance`)
3. **Model A**: Existing Model A signals should be available

## One-Time Setup

### 1. Apply Database Schemas

```bash
# Apply V2 schema changes (fundamentals, model_b_ml_signals, ensemble_signals)
python apply_schemas.py
```

This creates:
- Extended `fundamentals` table with V2 metrics
- `model_b_ml_signals` table
- `ensemble_signals` table

### 2. Configure Environment Variables

Add to `.env`:

```bash
# Data source for fundamentals (default: yfinance is free)
FUNDAMENTALS_DATA_SOURCE=yfinance

# Or use EODHD (paid, requires API key)
# FUNDAMENTALS_DATA_SOURCE=eodhd
# EODHD_API_KEY=your_key_here

# Fundamentals mode
FUNDAMENTALS_MODE=full  # or 'sample' for testing
FUNDAMENTALS_MAX_TICKERS=500  # limit to top 500 stocks

# Throttling (important for yfinance to avoid rate limits)
EODHD_FUNDAMENTALS_SLEEP=2.0  # 2 seconds between requests
```

## Daily Pipeline (Production)

### Run Full Pipeline

```bash
#!/bin/bash
# V2 daily pipeline

echo "1. Fetch fundamentals..."
python jobs/load_fundamentals_pipeline.py

echo "2. Build extended feature set..."
python jobs/build_extended_feature_set.py

echo "3. Generate Model B signals..."
python jobs/generate_signals_model_b.py

echo "4. Generate ensemble signals..."
python jobs/generate_ensemble_signals.py

echo "✅ V2 pipeline complete!"
```

### Individual Steps

#### Step 1: Fetch Fundamentals (yfinance or EODHD)

```bash
# Fetch fundamentals for top 500 ASX stocks
FUNDAMENTALS_MODE=full \
FUNDAMENTALS_MAX_TICKERS=500 \
python jobs/load_fundamentals_pipeline.py
```

**Expected Output**:
- ✅ Pulled fundamentals for 500 stocks
- ✅ Persisted fundamentals rows: 500
- Takes: ~15-20 minutes with yfinance (2s throttle)

#### Step 2: Build Features

```bash
# Build extended feature set (includes V2 fundamental features)
python jobs/build_extended_feature_set.py
```

**Expected Output**:
- Creates `outputs/featureset_extended_latest.parquet`
- Includes: pe_inverse, financial_health_score, value_score, quality_score_v2

#### Step 3: Generate Model B Signals

```bash
# Generate Model B signals using trained classifier
python jobs/generate_signals_model_b.py
```

**Expected Output**:
- ✅ Processing N symbols with >80% feature coverage
- ✅ Persisted N Model B signals
- Signal distribution: BUY, HOLD, SELL
- Quality scores: A, B, C, D, F

#### Step 4: Generate Ensemble Signals

```bash
# Combine Model A + Model B → Ensemble
python jobs/generate_ensemble_signals.py
```

**Expected Output**:
- ✅ Generated N ensemble signals
- Agreement rate: 60-70% (target)
- Conflicts: <20% (conservative HOLD on conflict)

## Training Model B (One-Time or Periodic)

### Initial Training

```bash
# Train Model B on 36 months of data
LOOKBACK_MONTHS=36 \
CV_FOLDS=5 \
python models/train_model_b_fundamentals.py
```

**Expected Output**:
- Cross-validation ROC-AUC: ~0.62-0.70
- Top quintile precision: ~65-75%
- Saves: `models/model_b_v1_0_classifier.pkl`

**Retraining Schedule**:
- **Initial**: Train once with 36 months of data
- **Quarterly**: Retrain every 3 months with new data
- **On-Demand**: Retrain if performance degrades

## Testing the Pipeline

### Quick Test (Sample Mode)

```bash
# Test with small sample (5 stocks)
FUNDAMENTALS_MODE=sample \
FUNDAMENTALS_TICKERS=CBA,BHP,CSL,WES,NAB \
python jobs/load_fundamentals_pipeline.py

# Generate signals for sample
python jobs/generate_signals_model_b.py
python jobs/generate_ensemble_signals.py
```

### Verify Database

```bash
# Check Model B signals
psql $DATABASE_URL -c "SELECT symbol, signal, quality_score, confidence FROM model_b_ml_signals WHERE as_of = CURRENT_DATE LIMIT 10;"

# Check ensemble signals
psql $DATABASE_URL -c "SELECT symbol, signal, ensemble_score, conflict, signals_agree FROM ensemble_signals WHERE as_of = CURRENT_DATE LIMIT 10;"

# Check agreement rate
psql $DATABASE_URL -c "SELECT
    COUNT(*) as total,
    SUM(CASE WHEN signals_agree THEN 1 ELSE 0 END) as agreed,
    SUM(CASE WHEN conflict THEN 1 ELSE 0 END) as conflicts
FROM ensemble_signals
WHERE as_of = CURRENT_DATE;"
```

## Monitoring

### Check Job History

```bash
psql $DATABASE_URL -c "SELECT job_name, status, started_at, completed_at FROM job_history WHERE job_name LIKE '%model_b%' OR job_name LIKE '%ensemble%' ORDER BY started_at DESC LIMIT 10;"
```

### Performance Metrics

```bash
# Model B metrics
cat models/model_b_v1_0_metrics.json | jq '.cv_auc_mean, .top_quintile_precision'

# Feature importance
cat models/model_b_v1_0_feature_importance.json | jq '.features[0:5], .importance[0:5]'
```

## Troubleshooting

### Issue: yfinance Rate Limiting

**Symptoms**: Timeouts, failed fetches

**Solution**:
```bash
# Increase throttle time
EODHD_FUNDAMENTALS_SLEEP=3.0 python jobs/load_fundamentals_pipeline.py
```

### Issue: Low Fundamental Coverage

**Symptoms**: "No stocks with sufficient fundamental data"

**Solution**:
```bash
# Check coverage
psql $DATABASE_URL -c "SELECT
    COUNT(*) as total,
    SUM(CASE WHEN pe_ratio IS NOT NULL THEN 1 ELSE 0 END) as has_pe,
    SUM(CASE WHEN roe IS NOT NULL THEN 1 ELSE 0 END) as has_roe
FROM fundamentals
WHERE updated_at >= NOW() - INTERVAL '7 days';"

# Re-fetch fundamentals
FUNDAMENTALS_MODE=full python jobs/load_fundamentals_pipeline.py
```

### Issue: Model B Not Found

**Symptoms**: "FileNotFoundError: model_b_v1_0_classifier.pkl"

**Solution**:
```bash
# Train Model B first
python models/train_model_b_fundamentals.py
```

### Issue: No Model A Signals

**Symptoms**: "No signals from Model A"

**Solution**:
```bash
# Generate Model A signals first
python jobs/generate_signals.py

# Then generate ensemble
python jobs/generate_ensemble_signals.py
```

## API Testing (Once APIs Are Deployed)

```bash
# Test fundamentals endpoint
curl "http://localhost:8000/fundamentals/metrics?ticker=CBA" -H "x-api-key: $API_KEY"

# Test Model B signals
curl "http://localhost:8000/signals/model_b/latest?limit=10" -H "x-api-key: $API_KEY"

# Test ensemble signals
curl "http://localhost:8000/signals/ensemble/latest?limit=10" -H "x-api-key: $API_KEY"

# Compare all models
curl "http://localhost:8000/signals/compare?ticker=CBA" -H "x-api-key: $API_KEY"
```

## Cron Schedule (Production)

Add to crontab or scheduler:

```cron
# Run fundamentals sync weekly (Sundays at 2 AM)
0 2 * * 0 cd /path/to/project && python jobs/load_fundamentals_pipeline.py

# Build features daily (after fundamentals)
30 2 * * * cd /path/to/project && python jobs/build_extended_feature_set.py

# Generate Model B signals daily (after features)
0 3 * * * cd /path/to/project && python jobs/generate_signals_model_b.py

# Generate ensemble daily (after Model B)
15 3 * * * cd /path/to/project && python jobs/generate_ensemble_signals.py

# Retrain Model B quarterly (1st of Jan, Apr, Jul, Oct at 1 AM)
0 1 1 1,4,7,10 * cd /path/to/project && python models/train_model_b_fundamentals.py
```

## Success Checklist

- [ ] Fundamentals synced for 500+ stocks
- [ ] Extended features built with V2 metrics
- [ ] Model B trained (ROC-AUC > 0.62)
- [ ] Model B signals generated
- [ ] Ensemble signals generated
- [ ] Agreement rate 60-70%
- [ ] Conflict rate < 20%
- [ ] API latency < 500ms
- [ ] Job history shows success
- [ ] Frontend displays dual signals

## Support

**Issues**: Check `V2_IMPLEMENTATION_STATUS.md` for known blockers
**Logs**: Check `logs/` directory for detailed execution logs
**Metrics**: Review `models/model_b_v1_0_metrics.json` for performance
