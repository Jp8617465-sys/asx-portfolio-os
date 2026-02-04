# API Caching Guide

**Date**: January 27, 2026
**Purpose**: Improve API performance with in-memory caching

---

## Overview

Simple in-memory caching system to reduce database load and improve response times. Suitable for single-instance deployments (Render free/hobby tiers).

**For production scale**: Replace with Redis or Memcached for multi-instance deployments.

---

## Quick Start

### 1. Apply Database Indexes (One-Time)

```bash
psql $DATABASE_URL -f schemas/add_indexes.sql
```

**Expected improvements**:
- Price queries: 2s → 200ms
- Signal queries: 1s → 100ms
- Dashboard load: 3s → 500ms

---

### 2. Add Caching to API Routes

**Example**: Cache dashboard endpoint for 5 minutes

```python
# app/routes/model.py
from services.cache import cached

@router.get("/dashboard/model_a_v1_1")
@cached(ttl=300)  # Cache for 5 minutes
async def get_dashboard():
    # Expensive database queries
    signals = fetch_signals()  # 2 seconds
    summary = compute_summary()  # 1 second
    return {"signals": signals, "summary": summary}
```

**Result**: Subsequent requests return in < 50ms

---

## Cache Configuration

### TTL (Time-To-Live) Recommendations

| Endpoint | TTL | Reasoning |
|----------|-----|-----------|
| `/dashboard/model_a_v1_1` | 300s (5 min) | Signals update daily, 5min is safe |
| `/signals/live` | 300s (5 min) | Same as dashboard |
| `/jobs/history` | 60s (1 min) | Jobs update frequently |
| `/model/status/summary` | 600s (10 min) | Model metrics change slowly |
| `/portfolio/attribution` | 1800s (30 min) | User-specific, changes infrequently |

---

## Usage Examples

### Basic Caching

```python
from services.cache import cached

@cached(ttl=300)
def expensive_function(symbol: str):
    # This will be cached for 5 minutes
    return fetch_data_from_db(symbol)
```

### Manual Cache Clearing

```python
from services.cache import clear_cache

# Clear all caches
clear_cache()

# Clear specific pattern
clear_cache("dashboard")  # Clears all dashboard-related caches
```

### Cache Statistics

```python
from services.cache import get_cache_stats

stats = get_cache_stats()
# Returns: {"size": 10, "keys": ["dashboard_...", "signals_..."]}
```

---

## Performance Gains

### Before Caching

```
GET /dashboard/model_a_v1_1
├─ Query prices table: 2.0s
├─ Compute features: 1.5s
├─ Fetch signals: 0.5s
└─ Total: 4.0s
```

### After Indexes

```
GET /dashboard/model_a_v1_1
├─ Query prices table: 0.2s (indexed)
├─ Compute features: 1.5s
├─ Fetch signals: 0.1s (indexed)
└─ Total: 1.8s
```

### After Indexes + Caching

```
GET /dashboard/model_a_v1_1 (first request)
└─ Total: 1.8s (computes and caches)

GET /dashboard/model_a_v1_1 (subsequent requests within 5 min)
└─ Total: 0.05s (from cache)
```

---

## Limitations

### Current Implementation (In-Memory)

**Pros**:
- Simple, no external dependencies
- Fast (RAM-based)
- Suitable for single-instance

**Cons**:
- Cache lost on restart
- Not shared across instances
- Limited by RAM

### For Production Scale (Redis)

If deploying multiple instances:

```python
# services/cache.py (replace implementation)
import redis

redis_client = redis.Redis(host='localhost', port=6379)

@cached(ttl=300)
def expensive_function(x):
    key = f"cache:{function_name}:{x}"
    cached = redis_client.get(key)
    if cached:
        return json.loads(cached)

    result = compute(x)
    redis_client.setex(key, ttl, json.dumps(result))
    return result
```

---

## Monitoring

### Check Cache Hit Rate

```python
# Add to monitoring endpoint
from services.cache import get_cache_stats

@router.get("/cache/stats")
async def cache_stats():
    return get_cache_stats()
```

### Clear Cache on Deployment

```bash
# In deployment script
curl -X POST https://api.example.com/cache/clear
```

---

## When NOT to Cache

Don't cache:
- ❌ Real-time data (< 1 minute freshness required)
- ❌ User-specific authentication responses
- ❌ Write operations (POST/PUT/DELETE)
- ❌ Data that changes frequently (> 1 update/minute)

---

## Testing Cache Behavior

```python
import pytest
from services.cache import cached, clear_cache

def test_caching():
    call_count = 0

    @cached(ttl=60)
    def test_function(x):
        nonlocal call_count
        call_count += 1
        return x * 2

    # First call - computes
    result1 = test_function(5)
    assert result1 == 10
    assert call_count == 1

    # Second call - from cache
    result2 = test_function(5)
    assert result2 == 10
    assert call_count == 1  # Not incremented

    # Clear cache
    clear_cache()

    # Third call - computes again
    result3 = test_function(5)
    assert result3 == 10
    assert call_count == 2
```

---

## Deployment Checklist

- [ ] Apply database indexes: `psql $DATABASE_URL -f schemas/add_indexes.sql`
- [ ] Add `@cached` decorator to high-traffic endpoints
- [ ] Set appropriate TTL values (5 minutes for dashboard)
- [ ] Test cache clearing on signal regeneration
- [ ] Monitor cache hit rates
- [ ] Consider Redis for multi-instance deployment

---

## Example: Full Dashboard Route with Caching

```python
# app/routes/model.py
from fastapi import APIRouter, HTTPException
from services.cache import cached, clear_cache
import pandas as pd

router = APIRouter()


@cached(ttl=300)  # Cache for 5 minutes
def fetch_latest_signals_cached():
    """Cached version of signal fetching"""
    # This expensive query now runs once per 5 minutes
    query = """
        SELECT symbol, signal, prob_up, expected_return, confidence, rank
        FROM model_a_ml_signals
        WHERE as_of = (SELECT MAX(as_of) FROM model_a_ml_signals)
        ORDER BY rank ASC
        LIMIT 100
    """
    return pd.read_sql(query, db_connection).to_dict('records')


@router.get("/dashboard/model_a_v1_1")
async def get_dashboard():
    """
    Get Model A dashboard with caching
    Response time: ~50ms (cached) or ~1.8s (fresh)
    """
    try:
        signals = fetch_latest_signals_cached()

        return {
            "signals": signals,
            "summary": {
                "total": len(signals),
                "strong_buy": sum(1 for s in signals if s['signal'] == 'STRONG_BUY')
            },
            "generated_at": "2026-01-27T10:00:00Z"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cache/clear")
async def clear_dashboard_cache():
    """Clear dashboard cache (call after signal regeneration)"""
    clear_cache("fetch_latest_signals")
    return {"status": "cleared"}
```

---

**Prepared**: January 27, 2026
**Status**: Ready to implement
