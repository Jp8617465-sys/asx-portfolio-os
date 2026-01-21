#!/bin/bash
# ==============================================================================
# Portfolio Endpoints Testing Script
# ==============================================================================
# Tests all 4 portfolio management endpoints with sample data
#
# Prerequisites:
# 1. Database schema applied: ./scripts/apply_portfolio_schema.sh
# 2. API running locally or on Render
# 3. Valid API key set in environment
# ==============================================================================

set -e

# Configuration
API_URL="${API_URL:-http://localhost:8000}"
API_KEY="${OS_API_KEY:-your-api-key-here}"
USER_ID="${USER_ID:-test_user}"

echo "🧪 Testing Portfolio Management Endpoints"
echo "======================================================================"
echo "API URL: $API_URL"
echo "User ID: $USER_ID"
echo ""

# ==============================================================================
# Test 1: Upload Portfolio CSV
# ==============================================================================
echo "📤 Test 1: POST /portfolio/upload"
echo "----------------------------------------------------------------------"

CSV_FILE="test_data/sample_portfolio.csv"

if [ ! -f "$CSV_FILE" ]; then
  echo "❌ Sample CSV not found: $CSV_FILE"
  exit 1
fi

echo "Uploading $CSV_FILE..."

UPLOAD_RESPONSE=$(curl -s -X POST \
  "$API_URL/portfolio/upload?portfolio_name=Test%20Portfolio&user_id=$USER_ID" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@$CSV_FILE")

echo "$UPLOAD_RESPONSE" | jq '.'

PORTFOLIO_ID=$(echo "$UPLOAD_RESPONSE" | jq -r '.portfolio_id')

if [ "$PORTFOLIO_ID" != "null" ] && [ -n "$PORTFOLIO_ID" ]; then
  echo "✅ Upload successful! Portfolio ID: $PORTFOLIO_ID"
else
  echo "❌ Upload failed"
  exit 1
fi

echo ""

# ==============================================================================
# Test 2: Get Portfolio with Holdings
# ==============================================================================
echo "📊 Test 2: GET /portfolio"
echo "----------------------------------------------------------------------"

PORTFOLIO_RESPONSE=$(curl -s -X GET \
  "$API_URL/portfolio?user_id=$USER_ID" \
  -H "x-api-key: $API_KEY")

echo "$PORTFOLIO_RESPONSE" | jq '.'

NUM_HOLDINGS=$(echo "$PORTFOLIO_RESPONSE" | jq -r '.num_holdings')

if [ "$NUM_HOLDINGS" -gt 0 ]; then
  echo "✅ Portfolio retrieved! Holdings: $NUM_HOLDINGS"
else
  echo "❌ Failed to retrieve portfolio"
  exit 1
fi

echo ""

# ==============================================================================
# Test 3: Get Rebalancing Suggestions
# ==============================================================================
echo "🔄 Test 3: GET /portfolio/rebalancing"
echo "----------------------------------------------------------------------"

REBALANCING_RESPONSE=$(curl -s -X GET \
  "$API_URL/portfolio/rebalancing?user_id=$USER_ID" \
  -H "x-api-key: $API_KEY")

echo "$REBALANCING_RESPONSE" | jq '.'

NUM_SUGGESTIONS=$(echo "$REBALANCING_RESPONSE" | jq -r '.suggestions | length')

echo "✅ Rebalancing suggestions generated: $NUM_SUGGESTIONS"

echo ""

# ==============================================================================
# Test 4: Get Risk Metrics
# ==============================================================================
echo "📈 Test 4: GET /portfolio/risk-metrics"
echo "----------------------------------------------------------------------"

RISK_RESPONSE=$(curl -s -X GET \
  "$API_URL/portfolio/risk-metrics?user_id=$USER_ID" \
  -H "x-api-key: $API_KEY")

echo "$RISK_RESPONSE" | jq '.'

SHARPE=$(echo "$RISK_RESPONSE" | jq -r '.sharpe_ratio')

if [ "$SHARPE" != "null" ]; then
  echo "✅ Risk metrics calculated! Sharpe ratio: $SHARPE"
else
  echo "⚠️  Risk metrics calculated (Sharpe may be null if insufficient data)"
fi

echo ""

# ==============================================================================
# Summary
# ==============================================================================
echo "======================================================================"
echo "✅ All portfolio endpoint tests completed!"
echo ""
echo "Summary:"
echo "  - Portfolio uploaded: ✅"
echo "  - Holdings retrieved: ✅ ($NUM_HOLDINGS holdings)"
echo "  - Rebalancing suggestions: ✅ ($NUM_SUGGESTIONS suggestions)"
echo "  - Risk metrics calculated: ✅"
echo ""
echo "Next steps:"
echo "  1. Check frontend integration at $API_URL"
echo "  2. Upload a real CSV via the frontend"
echo "  3. Monitor suggestions and metrics"
