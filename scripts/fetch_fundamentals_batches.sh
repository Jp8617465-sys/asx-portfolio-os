#!/bin/bash
# Automated fundamentals fetch in batches
# Runs until all tickers are fetched

set -e

BATCH_SIZE=200
MAX_BATCHES=15
SLEEP_TIME=1.2

echo "============================================================"
echo "🚀 Automatic Fundamentals Fetch"
echo "============================================================"
echo "Batch size: $BATCH_SIZE tickers"
echo "Max batches: $MAX_BATCHES"
echo "Throttle: ${SLEEP_TIME}s between API calls"
echo ""

for i in $(seq 1 $MAX_BATCHES); do
    echo "============================================================"
    echo "📦 Starting Batch $i/$MAX_BATCHES"
    echo "============================================================"

    source .venv/bin/activate

    FUNDAMENTALS_MODE=full \
    FUNDAMENTALS_SOURCE=universe \
    FUNDAMENTALS_MAX_TICKERS=$BATCH_SIZE \
    EODHD_FUNDAMENTALS_SLEEP=$SLEEP_TIME \
    python jobs/load_fundamentals_pipeline.py

    EXIT_CODE=$?

    if [ $EXIT_CODE -eq 0 ]; then
        echo "✅ Batch $i completed successfully"
    else
        echo "❌ Batch $i failed with exit code $EXIT_CODE"
        echo "⏸️  Pausing for 10 seconds before retry..."
        sleep 10
    fi

    echo ""
    echo "⏸️  Waiting 5 seconds before next batch..."
    sleep 5
done

echo ""
echo "============================================================"
echo "✅ All batches complete!"
echo "============================================================"

# Count final fundamentals
echo ""
echo "📊 Checking database..."
python -c "
import os
import psycopg2
from psycopg2.extras import RealDictCursor

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cursor = conn.cursor(cursor_factory=RealDictCursor)

cursor.execute('SELECT COUNT(DISTINCT symbol) as count FROM features_fundamental')
total = cursor.fetchone()['count']

print(f'✅ Total fundamentals in database: {total}')

cursor.close()
conn.close()
"
