# ASX Portfolio OS - API Documentation

**Version**: 1.0.0-rc1
**Base URL**: `https://asx-portfolio-os.onrender.com`
**Authentication**: API Key header (`x-api-key`)
**Date**: January 27, 2026

---

## Table of Contents

1. [Authentication](#authentication)
2. [Core Endpoints](#core-endpoints)
3. [Model Endpoints](#model-endpoints)
4. [Portfolio Endpoints](#portfolio-endpoints)
5. [Signals Endpoints](#signals-endpoints)
6. [Monitoring Endpoints](#monitoring-endpoints)
7. [Error Handling](#error-handling)
8. [Rate Limits](#rate-limits)
9. [Examples](#examples)

---

## Authentication

All API requests require an API key in the header:

```bash
curl -H "x-api-key: YOUR_API_KEY" https://asx-portfolio-os.onrender.com/health
```

**Header**: `x-api-key`
**Value**: Your API key (contact admin for key)

---

## Core Endpoints

### Health Check

**GET** `/health`

Check API and database connectivity.

**Response**:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-01-27T10:00:00Z"
}
```

**Status Codes**:
- `200`: Service healthy
- `500`: Service unhealthy (database connection failed)

---

## Model Endpoints

### Get Model A Dashboard

**GET** `/dashboard/model_a_v1_1`

Get ranked ASX stock signals from Model A (momentum-based).

**Query Parameters**:
- `limit` (optional): Number of results (default: 100, max: 500)

**Response**:
```json
{
  "signals": [
    {
      "symbol": "BHP.AX",
      "signal": "STRONG_BUY",
      "confidence": 85,
      "prob_up": 0.75,
      "expected_return": 0.08,
      "close": 45.30,
      "rank": 1
    }
  ],
  "summary": {
    "total_signals": 100,
    "strong_buy": 15,
    "buy": 25,
    "hold": 40,
    "sell": 15,
    "strong_sell": 5
  },
  "generated_at": "2026-01-27T06:00:00Z"
}
```

**Signal Types**:
- `STRONG_BUY`: prob_up ≥ 0.65 AND expected_return > 0.05
- `BUY`: prob_up ≥ 0.55 AND expected_return > 0
- `HOLD`: All other cases
- `SELL`: prob_up ≤ 0.45 AND expected_return < 0
- `STRONG_SELL`: prob_up ≤ 0.35 AND expected_return < -0.05

**Status Codes**:
- `200`: Success
- `500`: Internal server error

---

### Get Model Status Summary

**GET** `/model/status/summary`

Get Model A performance metrics and status.

**Response**:
```json
{
  "model_id": "model_a_v1_4",
  "status": "active",
  "last_trained": "2026-01-15T00:00:00Z",
  "last_inference": "2026-01-27T06:00:00Z",
  "metrics": {
    "roc_auc": 0.68,
    "accuracy": 0.62,
    "precision": 0.65
  },
  "features_count": 12
}
```

---

### Get Model Explainability

**GET** `/model/explainability`

Get SHAP feature importance for Model A.

**Query Parameters**:
- `symbol` (optional): Specific stock symbol for individual explanation

**Response**:
```json
{
  "feature_importance": [
    {
      "feature": "mom_12_1",
      "importance": 0.25,
      "rank": 1
    },
    {
      "feature": "vol_90",
      "importance": 0.18,
      "rank": 2
    }
  ],
  "model_id": "model_a_v1_4"
}
```

---

### Compare Models

**GET** `/model/compare`

Compare performance across different model versions (when available).

**Response**:
```json
{
  "models": [
    {
      "model_id": "model_a_v1_4",
      "roc_auc": 0.68,
      "accuracy": 0.62,
      "status": "active"
    },
    {
      "model_id": "model_a_v1_3",
      "roc_auc": 0.65,
      "accuracy": 0.60,
      "status": "deprecated"
    }
  ]
}
```

---

## Portfolio Endpoints

### Upload Portfolio

**POST** `/portfolio/upload`

Upload portfolio holdings via CSV file.

**Request Body**:
- `file`: CSV file with columns: `symbol`, `shares`, `avg_cost`

**CSV Format**:
```csv
symbol,shares,avg_cost
CBA.AX,100,95.50
BHP.AX,200,42.30
WES.AX,150,55.80
```

**Response**:
```json
{
  "status": "success",
  "holdings_count": 3,
  "total_value": 28450.00,
  "message": "Portfolio uploaded successfully"
}
```

**Status Codes**:
- `200`: Upload successful
- `400`: Invalid CSV format
- `413`: File too large (max 10MB)

---

### Get Portfolio Holdings

**GET** `/portfolio/holdings`

Get current portfolio holdings with signals overlay.

**Response**:
```json
{
  "holdings": [
    {
      "symbol": "CBA.AX",
      "shares": 100,
      "avg_cost": 95.50,
      "current_price": 100.00,
      "value": 10000.00,
      "gain_loss": 450.00,
      "gain_loss_pct": 4.71,
      "signal": "BUY",
      "confidence": 65
    }
  ],
  "summary": {
    "total_value": 28450.00,
    "total_gain_loss": 1250.00,
    "total_gain_loss_pct": 4.59
  }
}
```

---

### Get Rebalancing Suggestions

**GET** `/portfolio/rebalancing`

Get AI-powered rebalancing recommendations.

**Response**:
```json
{
  "suggestions": [
    {
      "action": "BUY",
      "symbol": "BHP.AX",
      "current_weight": 0.15,
      "target_weight": 0.20,
      "shares_to_trade": 50,
      "reason": "STRONG_BUY signal with 85% confidence"
    },
    {
      "action": "SELL",
      "symbol": "XYZ.AX",
      "current_weight": 0.10,
      "target_weight": 0.05,
      "shares_to_trade": -25,
      "reason": "SELL signal with declining momentum"
    }
  ],
  "total_rebalancing_cost": 2500.00
}
```

---

### Get Portfolio Attribution

**GET** `/portfolio/attribution`

Get portfolio performance attribution by factor.

**Response**:
```json
{
  "period": "1M",
  "total_return": 0.045,
  "attribution": {
    "momentum": 0.025,
    "volatility": -0.005,
    "trend": 0.015,
    "stock_selection": 0.010
  }
}
```

---

### Get Portfolio Performance

**GET** `/portfolio/performance`

Get historical portfolio performance metrics.

**Query Parameters**:
- `period` (optional): Time period (1M, 3M, 6M, 1Y) - default: 1M

**Response**:
```json
{
  "period": "1M",
  "cumulative_return": 0.045,
  "sharpe_ratio": 1.25,
  "max_drawdown": -0.08,
  "volatility": 0.15,
  "daily_returns": [
    {"date": "2026-01-27", "return": 0.002},
    {"date": "2026-01-26", "return": -0.001}
  ]
}
```

---

## Signals Endpoints

### Get Live Signals

**GET** `/signals/live`

Get current buy/sell signals for all ASX stocks.

**Query Parameters**:
- `signal_type` (optional): Filter by signal (STRONG_BUY, BUY, HOLD, SELL, STRONG_SELL)
- `min_confidence` (optional): Minimum confidence level (0-100)
- `limit` (optional): Number of results (default: 100)

**Response**:
```json
{
  "signals": [
    {
      "symbol": "BHP.AX",
      "signal": "STRONG_BUY",
      "confidence": 85,
      "prob_up": 0.75,
      "expected_return": 0.08,
      "close": 45.30,
      "as_of": "2026-01-27T06:00:00Z"
    }
  ],
  "count": 100,
  "as_of": "2026-01-27T06:00:00Z"
}
```

**Example - Get only STRONG_BUY signals**:
```bash
GET /signals/live?signal_type=STRONG_BUY&min_confidence=80
```

---

## Monitoring Endpoints

### Get Job History

**GET** `/jobs/history`

Get pipeline execution history.

**Query Parameters**:
- `limit` (optional): Number of recent jobs (default: 50)
- `status` (optional): Filter by status (success, failure, running)

**Response**:
```json
{
  "jobs": [
    {
      "job_name": "generate_signals",
      "status": "success",
      "started_at": "2026-01-27T06:00:00Z",
      "completed_at": "2026-01-27T06:05:23Z",
      "duration_seconds": 323,
      "message": "Generated 1,847 signals"
    },
    {
      "job_name": "sync_prices",
      "status": "success",
      "started_at": "2026-01-27T05:00:00Z",
      "completed_at": "2026-01-27T05:12:45Z",
      "duration_seconds": 765,
      "message": "Synced 1,200,345 price records"
    }
  ],
  "summary": {
    "total_jobs": 50,
    "success": 47,
    "failure": 3,
    "success_rate": 0.94
  }
}
```

---

### Get Job Health

**GET** `/jobs/health`

Get aggregated job health metrics.

**Response**:
```json
{
  "status": "healthy",
  "last_successful_signal_generation": "2026-01-27T06:00:00Z",
  "last_successful_price_sync": "2026-01-27T05:00:00Z",
  "failed_jobs_24h": 0,
  "success_rate_7d": 0.98
}
```

---

### Get Drift Summary

**GET** `/drift/summary`

Get feature drift monitoring summary.

**Response**:
```json
{
  "drift_status": "stable",
  "features": [
    {
      "feature": "mom_12_1",
      "psi_score": 0.05,
      "status": "stable",
      "last_audit": "2026-01-27T00:00:00Z"
    },
    {
      "feature": "vol_90",
      "psi_score": 0.12,
      "status": "warning",
      "last_audit": "2026-01-27T00:00:00Z"
    }
  ],
  "threshold": 0.20
}
```

**PSI Thresholds**:
- `< 0.10`: Stable (no drift)
- `0.10 - 0.20`: Warning (monitor)
- `> 0.20`: Alert (significant drift, retrain recommended)

---

## Insights Endpoints

### Get Announcements

**GET** `/insights/announcements`

Get recent ASX company announcements (when available).

**Query Parameters**:
- `symbol` (optional): Filter by stock symbol
- `limit` (optional): Number of announcements (default: 20)

**Response**:
```json
{
  "announcements": [
    {
      "symbol": "BHP.AX",
      "title": "Quarterly Production Report",
      "date": "2026-01-26T09:00:00Z",
      "category": "earnings",
      "url": "https://asx.com.au/..."
    }
  ],
  "count": 20
}
```

---

### Get Feature Importance

**GET** `/insights/feature-importance`

Get current feature importance rankings for Model A.

**Response**:
```json
{
  "features": [
    {
      "name": "mom_12_1",
      "importance": 0.25,
      "description": "12-month momentum (excluding last month)",
      "rank": 1
    },
    {
      "name": "vol_90",
      "importance": 0.18,
      "description": "90-day volatility",
      "rank": 2
    }
  ],
  "model_id": "model_a_v1_4",
  "as_of": "2026-01-15T00:00:00Z"
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "error": "Error message",
  "detail": "Detailed error information",
  "status_code": 400,
  "timestamp": "2026-01-27T10:00:00Z"
}
```

### Common Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid parameters or request format |
| 401 | Unauthorized | Missing or invalid API key |
| 404 | Not Found | Endpoint or resource not found |
| 413 | Payload Too Large | File upload exceeds 10MB |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |
| 503 | Service Unavailable | Service temporarily down |

---

## Rate Limits

**Current Limits**:
- `100 requests per minute` per API key
- `10 MB` maximum file upload size

**Rate Limit Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706345678
```

**Rate Limit Exceeded Response**:
```json
{
  "error": "Rate limit exceeded",
  "retry_after": 60,
  "status_code": 429
}
```

---

## Examples

### Python

```python
import requests

API_KEY = "your_api_key"
BASE_URL = "https://asx-portfolio-os.onrender.com"

headers = {"x-api-key": API_KEY}

# Get live signals
response = requests.get(f"{BASE_URL}/signals/live", headers=headers)
signals = response.json()

# Get dashboard
response = requests.get(
    f"{BASE_URL}/dashboard/model_a_v1_1",
    headers=headers,
    params={"limit": 50}
)
dashboard = response.json()

# Upload portfolio
files = {"file": open("portfolio.csv", "rb")}
response = requests.post(
    f"{BASE_URL}/portfolio/upload",
    headers=headers,
    files=files
)
result = response.json()
```

---

### JavaScript/Node.js

```javascript
const axios = require('axios');

const API_KEY = 'your_api_key';
const BASE_URL = 'https://asx-portfolio-os.onrender.com';

const headers = { 'x-api-key': API_KEY };

// Get live signals
async function getSignals() {
  const response = await axios.get(`${BASE_URL}/signals/live`, { headers });
  return response.data;
}

// Get dashboard
async function getDashboard() {
  const response = await axios.get(`${BASE_URL}/dashboard/model_a_v1_1`, {
    headers,
    params: { limit: 50 }
  });
  return response.data;
}

// Upload portfolio
async function uploadPortfolio(filePath) {
  const FormData = require('form-data');
  const fs = require('fs');

  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));

  const response = await axios.post(
    `${BASE_URL}/portfolio/upload`,
    form,
    { headers: { ...headers, ...form.getHeaders() } }
  );
  return response.data;
}
```

---

### cURL

```bash
# Health check
curl -H "x-api-key: YOUR_KEY" \
  https://asx-portfolio-os.onrender.com/health

# Get signals
curl -H "x-api-key: YOUR_KEY" \
  "https://asx-portfolio-os.onrender.com/signals/live?signal_type=STRONG_BUY"

# Get dashboard
curl -H "x-api-key: YOUR_KEY" \
  https://asx-portfolio-os.onrender.com/dashboard/model_a_v1_1

# Upload portfolio
curl -H "x-api-key: YOUR_KEY" \
  -F "file=@portfolio.csv" \
  https://asx-portfolio-os.onrender.com/portfolio/upload

# Get job history
curl -H "x-api-key: YOUR_KEY" \
  "https://asx-portfolio-os.onrender.com/jobs/history?limit=10"
```

---

## API Versioning

**Current Version**: v1.0.0-rc1

Future versions will be available at:
- `/v1/...` (current endpoints)
- `/v2/...` (future breaking changes)

Current endpoints have no version prefix for simplicity.

---

## Support & Changelog

**Changelog**: See GitHub releases
**Issues**: Report at GitHub Issues
**Contact**: API support via repository

---

## OpenAPI Specification

**Swagger UI**: `https://asx-portfolio-os.onrender.com/docs`
**ReDoc**: `https://asx-portfolio-os.onrender.com/redoc`
**OpenAPI JSON**: `https://asx-portfolio-os.onrender.com/openapi.json`

---

**Last Updated**: January 27, 2026
**API Version**: 1.0.0-rc1
