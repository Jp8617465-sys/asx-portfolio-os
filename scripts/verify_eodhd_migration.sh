#!/bin/bash
# Script to verify EODHD migration end-to-end
set -e

echo "🔍 EODHD Migration Verification Script"
echo "========================================"
echo ""

# Check environment variables
echo "1. Checking environment variables..."
if [ -z "$EODHD_API_KEY" ]; then
    echo "⚠️  EODHD_API_KEY not set - please set it first"
    echo "   export EODHD_API_KEY=your_key_here"
    exit 1
fi

if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL not set - please set it first"
    exit 1
fi

echo "✅ Environment variables OK"
echo ""

# Test stocks
TEST_TICKERS="BHP,CBA,CSL,WES,FMG,ANZ,NAB,WBC,MQG,RIO"

echo "2. Testing EODHD fundamentals fetch (10 stocks)..."
export FUNDAMENTALS_DATA_SOURCE=eodhd
export FUNDAMENTALS_MODE=sample
export FUNDAMENTALS_TICKERS=$TEST_TICKERS
export EODHD_FUNDAMENTALS_SLEEP=2.0

python jobs/load_fundamentals_pipeline.py

echo ""
echo "3. Verifying database records..."
psql "$DATABASE_URL" -c "
SELECT
    symbol,
    sector,
    pe_ratio,
    pb_ratio,
    roe,
    debt_to_equity,
    updated_at
FROM fundamentals
WHERE symbol IN ('BHP.AU', 'CBA.AU', 'CSL.AU', 'WES.AU', 'FMG.AU')
ORDER BY symbol;
"

echo ""
echo "4. Checking data coverage..."
psql "$DATABASE_URL" -c "
SELECT
    COUNT(*) as total_records,
    COUNT(pe_ratio) as pe_ratio_count,
    COUNT(pb_ratio) as pb_ratio_count,
    COUNT(roe) as roe_count,
    COUNT(debt_to_equity) as debt_to_equity_count,
    ROUND(100.0 * COUNT(pe_ratio) / COUNT(*), 2) as pe_coverage_pct,
    ROUND(100.0 * COUNT(roe) / COUNT(*), 2) as roe_coverage_pct
FROM fundamentals
WHERE updated_at > NOW() - INTERVAL '1 hour'
AND symbol LIKE '%.AU';
"

echo ""
echo "5. Regenerating Model B signals..."
python jobs/generate_signals_model_b.py

echo ""
echo "6. Regenerating ensemble signals..."
python jobs/generate_ensemble_signals.py

echo ""
echo "7. Testing API endpoints..."
echo "   - Fundamentals metrics endpoint:"
curl -s "http://localhost:8788/fundamentals/metrics?ticker=BHP" \
     -H "x-api-key: ${OS_API_KEY}" | jq -r '.data.symbol, .data.sector, .data.pe_ratio' || echo "⚠️  API not running"

echo ""
echo "   - Model B signals endpoint:"
curl -s "http://localhost:8788/signals/model_b/BHP" \
     -H "x-api-key: ${OS_API_KEY}" | jq -r '.symbol, .signal' || echo "⚠️  API not running"

echo ""
echo "   - Ensemble signals endpoint:"
curl -s "http://localhost:8788/signals/ensemble/BHP" \
     -H "x-api-key: ${OS_API_KEY}" | jq -r '.symbol, .signal' || echo "⚠️  API not running"

echo ""
echo "✅ EODHD Migration Verification Complete!"
echo ""
echo "Next steps:"
echo "  - Review data coverage (target: >90%)"
echo "  - Check signal generation success rate"
echo "  - Verify API responses are correct"
