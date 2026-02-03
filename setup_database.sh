#!/bin/bash
# ASX Portfolio OS - Database Schema Setup for Supabase

set -e

echo "========================================="
echo "ASX Portfolio OS - Database Setup"
echo "========================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL not set"
    echo "Run: source .env"
    exit 1
fi

echo "Database: $DATABASE_URL"
echo ""

# Test connection
echo "1. Testing database connection..."
if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed"
    echo "Please check your password and network connection"
    exit 1
fi
echo ""

# Apply schemas in order
echo "2. Applying database schemas..."
echo ""

echo "   → Creating user accounts schema..."
python3 scripts/apply_user_schema.py
echo "   ✅ User accounts schema applied"
echo ""

echo "   → Creating notification schema..."
python3 scripts/apply_notification_schema.py
echo "   ✅ Notification schema applied"
echo ""

echo "   → Creating stock universe reference table..."
psql "$DATABASE_URL" < schemas/stock_universe.sql
echo "   ✅ Stock universe schema applied"
echo ""

echo "   → Creating portfolio management schema..."
psql "$DATABASE_URL" < schemas/portfolio_management.sql
echo "   ✅ Portfolio management schema applied"
echo ""

echo "   → Creating watchlist schema..."
psql "$DATABASE_URL" < schemas/watchlist.sql
echo "   ✅ Watchlist schema applied"
echo ""

# Apply migrations
echo "3. Applying database migrations..."
echo ""

echo "   → Adding foreign key constraints..."
psql "$DATABASE_URL" < schemas/migrations/001_add_foreign_keys.sql
echo "   ✅ Foreign keys added"
echo ""

echo "   → Standardizing timestamps..."
psql "$DATABASE_URL" < schemas/migrations/002_standardize_timestamps.sql
echo "   ✅ Timestamps standardized"
echo ""

echo "   → Adding performance indexes..."
psql "$DATABASE_URL" < schemas/migrations/003_add_performance_indexes.sql
echo "   ✅ Indexes added"
echo ""

echo "   → Adding update triggers..."
psql "$DATABASE_URL" < schemas/migrations/004_add_update_triggers.sql
echo "   ✅ Triggers added"
echo ""

# Verify tables created
echo "4. Verifying tables..."
echo ""

TABLES=$(psql "$DATABASE_URL" -tAc "
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
")

if [ -z "$TABLES" ]; then
    echo "❌ No tables found"
    exit 1
fi

echo "Tables created:"
echo "$TABLES" | while read table; do
    echo "   ✅ $table"
done
echo ""

# Count total tables
TABLE_COUNT=$(echo "$TABLES" | wc -l | tr -d ' ')
echo "Total tables: $TABLE_COUNT"
echo ""

echo "========================================="
echo "✅ Database setup complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Install dependencies: pip install -r requirements.txt"
echo "2. Run verification: bash scripts/verify_production_ready.sh"
echo "3. Start backend: uvicorn app.main:app --reload"
echo ""
