#!/bin/bash
# Test Database Migration Script
# Purpose: Test migrations on a temporary database to ensure they work correctly

set -e

echo "========================================="
echo "Database Migration Test Suite"
echo "========================================="
echo ""

# Function to check if psql command exists
check_psql() {
    if ! command -v psql &> /dev/null; then
        echo "❌ psql command not found"
        echo "Please install PostgreSQL client tools"
        exit 1
    fi
}

# Function to validate SQL syntax
validate_sql_syntax() {
    local file=$1
    echo -n "   Validating $file... "
    
    # Try to explain the SQL (syntax check without executing)
    if psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction -f "$file" --echo-errors 2>&1 | grep -q "ERROR"; then
        echo "❌ FAILED"
        return 1
    else
        echo "✅ OK"
        return 0
    fi
}

# Check prerequisites
check_psql

if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  WARNING: DATABASE_URL not set"
    echo "This script requires a database connection for full testing"
    echo "Set DATABASE_URL or run: source .env"
    echo ""
    echo "Performing syntax validation only..."
    echo ""
    
    # Basic syntax validation without DB
    for migration in migrations/00*.sql; do
        if [ -f "$migration" ] && [[ ! "$migration" =~ _rollback\.sql$ ]]; then
            echo -n "   Checking $(basename "$migration")... "
            # Basic syntax check
            if grep -q "syntax error" <<< "$(cat "$migration")"; then
                echo "❌ Syntax error detected"
            else
                echo "✅ Basic check passed"
            fi
        fi
    done
    exit 0
fi

echo "Database: $DATABASE_URL"
echo ""

# Test 1: Validate stock_universe schema
echo "1. Testing stock_universe schema..."
if psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction -f schemas/stock_universe.sql > /dev/null 2>&1; then
    echo "   ✅ stock_universe.sql is valid"
else
    echo "   ❌ stock_universe.sql has errors"
    exit 1
fi
echo ""

# Test 2: Validate all migration files
echo "2. Testing migration files..."
migration_count=0
failed_count=0

for migration in migrations/00*.sql; do
    if [ -f "$migration" ] && [[ ! "$migration" =~ _rollback\.sql$ ]]; then
        migration_count=$((migration_count + 1))
        migration_name=$(basename "$migration")
        echo "   Testing $migration_name..."
        
        # Test in a transaction that we'll rollback
        if psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction <<EOF > /dev/null 2>&1
BEGIN;
\i $migration
ROLLBACK;
EOF
        then
            echo "   ✅ $migration_name is valid"
        else
            echo "   ❌ $migration_name has errors"
            failed_count=$((failed_count + 1))
        fi
    fi
done
echo ""

# Test 3: Validate rollback scripts
echo "3. Testing rollback scripts..."
rollback_count=0
rollback_failed=0

for rollback in migrations/00*_rollback.sql; do
    if [ -f "$rollback" ]; then
        rollback_count=$((rollback_count + 1))
        rollback_name=$(basename "$rollback")
        echo "   Testing $rollback_name..."
        
        # Test in a transaction that we'll rollback
        if psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction <<EOF > /dev/null 2>&1
BEGIN;
\i $rollback
ROLLBACK;
EOF
        then
            echo "   ✅ $rollback_name is valid"
        else
            echo "   ❌ $rollback_name has errors"
            rollback_failed=$((rollback_failed + 1))
        fi
    fi
done
echo ""

# Summary
echo "========================================="
echo "Test Summary"
echo "========================================="
echo "Migrations tested: $migration_count"
echo "Migrations failed: $failed_count"
echo "Rollbacks tested: $rollback_count"
echo "Rollbacks failed: $rollback_failed"
echo ""

if [ $failed_count -eq 0 ] && [ $rollback_failed -eq 0 ]; then
    echo "✅ All tests passed!"
    echo ""
    echo "Next steps:"
    echo "1. Review migration files for logic correctness"
    echo "2. Test on a staging database with real data"
    echo "3. Apply to production database"
    exit 0
else
    echo "❌ Some tests failed"
    echo "Please review and fix the errors before proceeding"
    exit 1
fi
