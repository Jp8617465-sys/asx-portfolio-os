# Feature Computation Optimization Guide

**Date**: January 27, 2026
**Purpose**: Optimize API performance by pre-computing features
**Expected Gain**: 5-10x performance improvement on dashboard endpoint

---

## Problem Statement

**Current Issue**: API computes features in-memory on every request

```python
# Current flow in app/routes/model.py
def get_dashboard():
    # 1. Query 800K+ price rows from database (2s)
    px = pd.read_sql("SELECT * FROM prices...", con)

    # 2. Compute rolling features in Python (1.5s)
    px["mom_12_1"] = px.groupby("symbol")["close"].pct_change(252)
    px["vol_90"] = px.groupby("symbol")["ret1"].rolling(90).std()
    px["sma_200"] = px.groupby("symbol")["close"].rolling(200).mean()

    # 3. Run inference (0.3s)
    predictions = model.predict(px[features])

    # Total: ~4 seconds per request
```

**Impact**:
- Slow API responses (3-4 seconds)
- High CPU usage
- Poor user experience

---

## Solution: Pre-Compute Features Daily

**New Flow**:
1. **Batch Job** (runs daily at 1 AM): Compute all features → write to `model_a_features_extended` table
2. **API**: Read pre-computed features from database (< 500ms)

---

## Implementation Steps

### Step 1: Update Feature Build Job ✅

**Status**: COMPLETE

The `jobs/build_extended_feature_set.py` script now writes features to the database:

```python
# Line ~335 in build_extended_feature_set.py
df.to_sql(
    "model_a_features_extended",
    con,
    if_exists="replace",
    index=False,
    method="multi",
    chunksize=1000
)
```

---

### Step 2: Schedule Daily Feature Computation

**Option A: Render Cron Jobs** (Recommended)

Add to your Render service:

```yaml
# render.yaml
jobs:
  - name: build-features
    command: python jobs/build_extended_feature_set.py
    schedule: "0 1 * * *"  # Daily at 1 AM UTC
    env: production
```

**Option B: Manual Cron** (if self-hosting)

```bash
# Add to crontab
0 1 * * * cd /path/to/asx-portfolio-os && python jobs/build_extended_feature_set.py
```

**Option C: GitHub Actions** (for testing)

```yaml
# .github/workflows/build-features.yml
name: Build Features Daily
on:
  schedule:
    - cron: '0 1 * * *'
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: python jobs/build_extended_feature_set.py
```

---

### Step 3: Update API Route to Read Pre-Computed Features

**Current Code** (`app/routes/model.py`):

```python
@router.get("/dashboard/model_a_v1_1")
async def get_dashboard():
    # Slow: Computes features on every request
    px = pd.read_sql("SELECT * FROM prices WHERE ...", con)
    px["mom_12_1"] = px.groupby("symbol")["close"].pct_change(252)
    px["vol_90"] = px.groupby("symbol")["ret1"].rolling(90).std()
    # ... more feature computation
```

**Optimized Code** (use pre-computed features):

```python
@router.get("/dashboard/model_a_v1_1")
async def get_dashboard():
    # Fast: Reads pre-computed features
    query = """
        SELECT
            symbol,
            date,
            close,
            mom_12_1,
            mom_9,
            mom_6,
            mom_3,
            vol_30,
            vol_90,
            vol_ratio_30_90,
            adv_20_median,
            adv_ratio_20_60,
            trend_200,
            sma200_slope_pos,
            trend_strength
        FROM model_a_features_extended
        WHERE date = (SELECT MAX(date) FROM model_a_features_extended)
    """
    features_df = pd.read_sql(query, con)

    # Run inference directly (no feature computation needed)
    X = features_df[FEATURE_COLUMNS]
    predictions = model.predict(X)

    # Total: < 500ms
```

**Key Changes**:
1. Read from `model_a_features_extended` instead of `prices`
2. Remove all feature computation code
3. Select only latest date for current signals

---

### Step 4: Apply Database Indexes (Critical)

```bash
# Apply indexes for fast queries
psql $DATABASE_URL -f schemas/add_indexes.sql

# Key index for feature table:
CREATE INDEX IF NOT EXISTS idx_features_date
ON model_a_features_extended(date DESC);

CREATE INDEX IF NOT EXISTS idx_features_symbol_date
ON model_a_features_extended(symbol, date DESC);
```

---

### Step 5: Add Caching (Optional but Recommended)

```python
from services.cache import cached

@router.get("/dashboard/model_a_v1_1")
@cached(ttl=300)  # Cache for 5 minutes
async def get_dashboard():
    # ... read pre-computed features ...
    return signals
```

**Combined Effect**:
- First request: ~500ms (database read)
- Subsequent requests (within 5 min): ~50ms (from cache)

---

## Performance Comparison

### Before Optimization

```
GET /dashboard/model_a_v1_1
├─ Query prices table: 2.0s
├─ Compute features in Python: 1.5s
├─ Load models: 0.2s
├─ Run inference: 0.3s
└─ Total: 4.0s
```

### After Pre-Computation

```
GET /dashboard/model_a_v1_1
├─ Query features table (indexed): 0.3s
├─ Load models: 0.2s
├─ Run inference: 0.1s
└─ Total: 0.6s (6.7x faster)
```

### After Pre-Computation + Caching

```
GET /dashboard/model_a_v1_1 (first request)
└─ Total: 0.6s

GET /dashboard/model_a_v1_1 (subsequent within 5 min)
└─ Total: 0.05s (from cache, 80x faster)
```

---

## Monitoring

### Check Feature Freshness

```sql
-- Check when features were last computed
SELECT MAX(date) as latest_date,
       COUNT(DISTINCT symbol) as symbols_count
FROM model_a_features_extended;

-- Should return today's date if running daily
```

### Monitor Job Execution

```bash
# Check job history
curl -H "x-api-key: $API_KEY" \
  https://asx-portfolio-os.onrender.com/jobs/history?limit=5

# Look for "build_extended_feature_set" job
```

### Alert if Features Are Stale

```python
# Add to API health check
@router.get("/health")
async def health_check():
    # Check feature freshness
    query = "SELECT MAX(date) FROM model_a_features_extended"
    latest_date = pd.read_sql(query, con).iloc[0, 0]

    days_old = (datetime.now().date() - latest_date).days

    return {
        "status": "healthy" if days_old <= 1 else "degraded",
        "features_last_updated": latest_date.isoformat(),
        "features_age_days": days_old
    }
```

---

## Rollback Plan

If optimization causes issues:

```python
# Temporarily revert to on-demand computation
USE_PRECOMPUTED_FEATURES = os.getenv("USE_PRECOMPUTED_FEATURES", "1")

if USE_PRECOMPUTED_FEATURES == "1":
    # Use pre-computed features (optimized)
    features_df = pd.read_sql("SELECT * FROM model_a_features_extended...", con)
else:
    # Fall back to on-demand computation (slow but reliable)
    features_df = compute_features_on_demand()
```

Set environment variable:
```bash
# Disable optimization
export USE_PRECOMPUTED_FEATURES=0

# Re-enable optimization
export USE_PRECOMPUTED_FEATURES=1
```

---

## Testing

### Test Feature Computation

```bash
# Run manually to test
python jobs/build_extended_feature_set.py

# Check database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM model_a_features_extended;"

# Should see 800K+ rows (all stocks × ~400 days)
```

### Test API Performance

```bash
# Benchmark before optimization
time curl -H "x-api-key: $API_KEY" \
  https://asx-portfolio-os.onrender.com/dashboard/model_a_v1_1

# Expected: 3-4 seconds

# Apply optimization, then benchmark again
time curl -H "x-api-key: $API_KEY" \
  https://asx-portfolio-os.onrender.com/dashboard/model_a_v1_1

# Expected: 0.5-1 second (5-8x improvement)
```

---

## Deployment Checklist

- [x] Feature build script updated to write to database
- [ ] Schedule daily feature computation job (Render cron)
- [ ] Apply database indexes: `psql $DATABASE_URL -f schemas/add_indexes.sql`
- [ ] Update API route to read from `model_a_features_extended`
- [ ] Add caching decorator to dashboard endpoint
- [ ] Test feature computation manually
- [ ] Verify API performance improvement
- [ ] Set up monitoring for feature freshness
- [ ] Configure alerts if features > 1 day old

---

## Cost-Benefit Analysis

**Development Time**: 2-4 hours
**Expected Performance Gain**: 5-10x faster API responses
**Infrastructure Cost**: Minimal (daily cron job ~5 minutes)
**User Impact**: Significantly better UX

**ROI**: High - one-time implementation for permanent performance improvement

---

## Example: Full Optimized Endpoint

```python
# app/routes/model.py (optimized version)
from fastapi import APIRouter, HTTPException
from services.cache import cached
import pandas as pd

router = APIRouter()

# Features used by Model A
BASE_FEATURES = [
    "mom_12_1", "mom_9", "mom_6", "mom_3",
    "vol_30", "vol_90", "vol_ratio_30_90",
    "adv_20_median", "adv_ratio_20_60",
    "trend_200", "sma200_slope_pos", "trend_strength"
]

@router.get("/dashboard/model_a_v1_1")
@cached(ttl=300)  # Cache for 5 minutes
async def get_dashboard(limit: int = 100):
    """
    Get Model A ranked signals (optimized with pre-computed features)
    Response time: ~50ms (cached) or ~500ms (fresh)
    """
    try:
        from app.database import db

        # Read pre-computed features (fast)
        query = f"""
            SELECT
                symbol,
                date,
                close,
                {', '.join(BASE_FEATURES)}
            FROM model_a_features_extended
            WHERE date = (SELECT MAX(date) FROM model_a_features_extended)
            AND symbol LIKE '%.AX'
        """

        with db() as con:
            features_df = pd.read_sql(query, con)

        if features_df.empty:
            raise HTTPException(
                status_code=503,
                detail="Features not available - run build_extended_feature_set.py"
            )

        # Load models (cached in memory)
        classifier = load_model("model_a_v1_4_classifier.pkl")
        regressor = load_model("model_a_v1_4_regressor.pkl")

        # Run inference (fast)
        X = features_df[BASE_FEATURES].fillna(0)
        prob_up = classifier.predict_proba(X)[:, 1]
        expected_return = regressor.predict(X)

        # Classify signals
        signals = pd.DataFrame({
            'symbol': features_df['symbol'],
            'close': features_df['close'],
            'prob_up': prob_up,
            'expected_return': expected_return
        })

        signals['signal'] = signals.apply(classify_signal, axis=1)
        signals['confidence'] = (abs(signals['prob_up'] - 0.5) * 200).astype(int)
        signals['rank'] = signals['prob_up'].rank(ascending=False)

        # Return top signals
        top_signals = signals.nsmallest(limit, 'rank')

        return {
            "signals": top_signals.to_dict('records'),
            "summary": {
                "total": len(signals),
                "strong_buy": len(signals[signals['signal'] == 'STRONG_BUY']),
                "buy": len(signals[signals['signal'] == 'BUY']),
                "hold": len(signals[signals['signal'] == 'HOLD']),
                "sell": len(signals[signals['signal'] == 'SELL']),
                "strong_sell": len(signals[signals['signal'] == 'STRONG_SELL'])
            },
            "generated_at": features_df['date'].iloc[0].isoformat()
        }

    except Exception as e:
        logger.error(f"Dashboard endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

---

**Status**: Feature computation optimization ready for deployment
**Next Step**: Schedule daily cron job and update API route
**Expected Impact**: 5-10x performance improvement
