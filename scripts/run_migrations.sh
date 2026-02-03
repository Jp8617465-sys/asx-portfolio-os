#!/bin/bash
# Migration Runner Script
# Purpose: Apply database migrations in the correct order with error handling

set -e

echo "========================================="
echo "Database Migration Runner"
echo "========================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL not set"
    echo "Run: export DATABASE_URL='postgresql://user:pass@host:port/db'"
    exit 1
fi

echo "Database: $DATABASE_URL"
echo ""

# Parse command-line arguments
DRY_RUN=false
SKIP_SEED=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-seed)
            SKIP_SEED=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--dry-run] [--skip-seed]"
            exit 1
            ;;
    esac
done

if [ "$DRY_RUN" = true ]; then
    echo "🔍 DRY RUN MODE - No changes will be made"
    echo ""
fi

# Function to run SQL file
run_sql() {
    local file=$1
    local description=$2
    
    echo "→ $description..."
    
    if [ "$DRY_RUN" = true ]; then
        # Dry run: just validate syntax
        if psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction <<EOF > /dev/null 2>&1
BEGIN;
\i $file
ROLLBACK;
EOF
        then
            echo "  ✅ $description validated (dry run)"
            return 0
        else
            echo "  ❌ $description validation failed"
            return 1
        fi
    else
        # Real run: apply migration
        if psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file" > /dev/null 2>&1; then
            echo "  ✅ $description completed"
            return 0
        else
            echo "  ❌ $description failed"
            return 1
        fi
    fi
}

# Test connection
echo "1. Testing database connection..."
if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "   ✅ Database connection successful"
else
    echo "   ❌ Database connection failed"
    exit 1
fi
echo ""

# Check if stock_universe exists
echo "2. Checking stock_universe table..."
if psql "$DATABASE_URL" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'stock_universe');" | grep -q 't'; then
    echo "   ✅ stock_universe table exists"
    STOCK_UNIVERSE_EXISTS=true
else
    echo "   ⚠️  stock_universe table does not exist"
    STOCK_UNIVERSE_EXISTS=false
fi
echo ""

# Create stock_universe if needed
if [ "$STOCK_UNIVERSE_EXISTS" = false ]; then
    echo "3. Creating stock_universe table..."
    run_sql "schemas/stock_universe.sql" "Create stock_universe schema"
    echo ""
    
    if [ "$SKIP_SEED" = false ]; then
        echo "4. Seeding stock_universe with sample data..."
        run_sql "migrations/seed_stock_universe.sql" "Seed stock_universe"
        echo ""
    else
        echo "4. Skipping stock_universe seed (--skip-seed flag)"
        echo "   ⚠️  WARNING: You need to populate stock_universe before running migration 001"
        echo ""
    fi
else
    echo "3. Skipping stock_universe creation (already exists)"
    echo ""
fi

# Check for orphaned records before applying foreign keys
echo "5. Checking for orphaned records..."
ORPHAN_CHECK=$(psql "$DATABASE_URL" -tAc "
SELECT COUNT(*) 
FROM (
    SELECT ticker FROM news_sentiment
    WHERE ticker NOT IN (SELECT ticker FROM stock_universe)
    UNION ALL
    SELECT symbol FROM fundamentals
    WHERE symbol NOT IN (SELECT ticker FROM stock_universe)
    UNION ALL
    SELECT ticker FROM user_holdings
    WHERE ticker NOT IN (SELECT ticker FROM stock_universe)
) orphans;
")

if [ "$ORPHAN_CHECK" -gt 0 ]; then
    echo "   ⚠️  WARNING: Found $ORPHAN_CHECK orphaned records"
    echo "   These records reference tickers not in stock_universe"
    echo "   Migration 001 (foreign keys) will fail unless these are fixed"
    echo ""
    echo "   Options:"
    echo "   1. Add missing tickers to stock_universe"
    echo "   2. Delete orphaned records"
    echo "   3. Skip migration 001"
    echo ""
    read -p "   Continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "   Migration cancelled"
        exit 1
    fi
else
    echo "   ✅ No orphaned records found"
fi
echo ""

# Apply migrations in order
echo "6. Applying migrations..."
echo ""

migration_count=0
failed_count=0

for migration in migrations/00*.sql; do
    if [ -f "$migration" ] && [[ ! "$migration" =~ _rollback\.sql$ ]] && [[ ! "$migration" =~ seed_ ]]; then
        migration_count=$((migration_count + 1))
        migration_name=$(basename "$migration")
        
        if run_sql "$migration" "Migration: $migration_name"; then
            echo ""
        else
            failed_count=$((failed_count + 1))
            echo ""
            echo "❌ Migration failed: $migration_name"
            echo "Rolling back is recommended. Run:"
            echo "   psql \"\$DATABASE_URL\" < ${migration%.sql}_rollback.sql"
            exit 1
        fi
    fi
done

# Summary
echo "========================================="
echo "Migration Summary"
echo "========================================="
echo "Migrations applied: $migration_count"
echo "Migrations failed: $failed_count"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo "✅ Dry run completed successfully!"
    echo "Run without --dry-run to apply migrations"
else
    if [ $failed_count -eq 0 ]; then
        echo "✅ All migrations completed successfully!"
        echo ""
        echo "Next steps:"
        echo "1. Verify foreign keys: psql \"\$DATABASE_URL\" -c \"\\d+ news_sentiment\""
        echo "2. Check timestamps: See migrations/TESTING.md"
        echo "3. Test queries: See migrations/TESTING.md"
    else
        echo "❌ Some migrations failed"
        echo "Please review errors and rollback if necessary"
        exit 1
    fi
fi
echo ""
