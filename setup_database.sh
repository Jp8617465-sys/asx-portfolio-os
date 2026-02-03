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

echo "   → Creating stock universe schema..."
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

# Apply migrations in order
echo "   → Applying database migrations..."
echo ""

if [ -d "migrations" ]; then
    for migration in migrations/00*.sql; do
        if [ -f "$migration" ] && [[ ! "$migration" =~ _rollback\.sql$ ]]; then
            migration_name=$(basename "$migration")
            echo "      → Applying $migration_name..."
            psql "$DATABASE_URL" < "$migration"
            echo "      ✅ $migration_name applied"
        fi
    done
    echo ""
else
    echo "   ⚠️  No migrations directory found, skipping migrations"
    echo ""
fi

# Verify tables created
echo "3. Verifying tables..."
echo ""

TABLES=$(psql "$DATABASE_URL" -tAc "
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'user_%'
ORDER BY table_name;
")

if [ -z "$TABLES" ]; then
    echo "❌ No user tables found"
    exit 1
fi

echo "Tables created:"
echo "$TABLES" | while read table; do
    echo "   ✅ $table"
done
echo ""

# Count total tables
TABLE_COUNT=$(echo "$TABLES" | wc -l | tr -d ' ')
echo "Total user tables: $TABLE_COUNT"
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
echo "📚 For schema documentation, see: schemas/README.md"
echo ""
