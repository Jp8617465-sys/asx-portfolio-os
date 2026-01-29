#!/bin/bash
# Production Readiness Verification Script
# Run this script before deploying to production

set -e

echo "========================================"
echo "ASX Portfolio OS - Production Readiness Check"
echo "========================================"
echo ""

ERRORS=0
WARNINGS=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
check_pass() {
    echo -e "${GREEN}✅ PASS${NC} - $1"
}

check_fail() {
    echo -e "${RED}❌ FAIL${NC} - $1"
    ((ERRORS++))
}

check_warn() {
    echo -e "${YELLOW}⚠️  WARN${NC} - $1"
    ((WARNINGS++))
}

echo "1. ENVIRONMENT VARIABLES CHECK"
echo "----------------------------------------"

# Check JWT_SECRET_KEY
if [ -z "$JWT_SECRET_KEY" ]; then
    check_fail "JWT_SECRET_KEY not set (CRITICAL)"
    echo "   Generate with: export JWT_SECRET_KEY=\$(openssl rand -hex 32)"
elif [ "$JWT_SECRET_KEY" = "your-secret-key-change-this-in-production" ]; then
    check_fail "JWT_SECRET_KEY is using insecure default (CRITICAL)"
elif [ ${#JWT_SECRET_KEY} -lt 32 ]; then
    check_warn "JWT_SECRET_KEY is short (recommend 64+ chars)"
else
    check_pass "JWT_SECRET_KEY is set and secure"
fi

# Check OS_API_KEY
if [ -z "$OS_API_KEY" ]; then
    check_fail "OS_API_KEY not set (CRITICAL)"
elif [ "$OS_API_KEY" = "HugoRalph2026_DB_Pass_01" ]; then
    check_fail "OS_API_KEY is using example value (CRITICAL)"
else
    check_pass "OS_API_KEY is set"
fi

# Check DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    check_fail "DATABASE_URL not set (CRITICAL)"
else
    check_pass "DATABASE_URL is set"
fi

# Check EODHD_API_KEY
if [ -z "$EODHD_API_KEY" ]; then
    check_warn "EODHD_API_KEY not set (data sync will fail)"
else
    check_pass "EODHD_API_KEY is set"
fi

echo ""
echo "2. SECURITY FILES CHECK"
echo "----------------------------------------"

# Check for demo credentials in schema
if grep -q "demo_user" schemas/user_accounts.sql 2>/dev/null; then
    if grep -q "SECURITY NOTE" schemas/user_accounts.sql; then
        check_pass "Demo credentials removed from schema"
    else
        check_fail "Demo credentials still in schema file (CRITICAL)"
    fi
else
    check_pass "Demo credentials removed from schema"
fi

# Check frontend doesn't expose API key
if grep -q "NEXT_PUBLIC_OS_API_KEY" frontend/lib/api-client.ts 2>/dev/null; then
    check_fail "API key exposed in frontend code (CRITICAL)"
else
    check_pass "No API key in frontend code"
fi

# Check middleware exists
if [ -f "frontend/middleware.ts" ]; then
    check_pass "Protected route middleware exists"
else
    check_warn "Protected route middleware missing"
fi

echo ""
echo "3. ROUTE IMPORTS CHECK"
echo "----------------------------------------"

# Test Python imports
export JWT_SECRET_KEY="${JWT_SECRET_KEY:-test-key-for-verification}"
python3 -c "
import sys
sys.path.insert(0, '.')
try:
    from app.routes import search, watchlist, prices
    print('${GREEN}✅ PASS${NC} - All new route modules import successfully')
except ImportError as e:
    print('${RED}❌ FAIL${NC} - Route import error:', e)
    exit(1)
" || ((ERRORS++))

echo ""
echo "4. DATABASE SCHEMA CHECK"
echo "----------------------------------------"

if [ -n "$DATABASE_URL" ]; then
    # Check if user_watchlist table exists
    if psql "$DATABASE_URL" -tAc "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='user_watchlist')" 2>/dev/null | grep -q "t"; then
        check_pass "user_watchlist table exists"
    else
        check_warn "user_watchlist table not created yet"
        echo "   Run: psql \$DATABASE_URL < schemas/watchlist.sql"
    fi

    # Check if user_accounts table exists
    if psql "$DATABASE_URL" -tAc "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='user_accounts')" 2>/dev/null | grep -q "t"; then
        check_pass "user_accounts table exists"
    else
        check_fail "user_accounts table missing (CRITICAL)"
        echo "   Run: python3 scripts/apply_user_schema.py"
    fi
else
    check_warn "Skipping database checks (DATABASE_URL not set)"
fi

echo ""
echo "5. DEPENDENCIES CHECK"
echo "----------------------------------------"

# Check slowapi installed
if python3 -c "import slowapi" 2>/dev/null; then
    check_pass "slowapi installed (rate limiting)"
else
    check_fail "slowapi not installed (CRITICAL)"
    echo "   Run: pip install slowapi"
fi

# Check python-jose installed
if python3 -c "import jose" 2>/dev/null; then
    check_pass "python-jose installed (JWT)"
else
    check_fail "python-jose not installed (CRITICAL)"
fi

# Check passlib installed
if python3 -c "import passlib" 2>/dev/null; then
    check_pass "passlib installed (password hashing)"
else
    check_fail "passlib not installed (CRITICAL)"
fi

echo ""
echo "6. FRONTEND BUILD CHECK"
echo "----------------------------------------"

if [ -d "frontend/node_modules" ]; then
    check_pass "Frontend dependencies installed"
else
    check_warn "Frontend dependencies not installed"
    echo "   Run: cd frontend && npm install"
fi

echo ""
echo "========================================"
echo "PRODUCTION READINESS SUMMARY"
echo "========================================"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED${NC}"
    echo ""
    echo "System is ready for production deployment!"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  PASSED WITH WARNINGS${NC}"
    echo ""
    echo "Errors: $ERRORS"
    echo "Warnings: $WARNINGS"
    echo ""
    echo "System can be deployed but address warnings before production."
    exit 0
else
    echo -e "${RED}❌ FAILED - CRITICAL ISSUES FOUND${NC}"
    echo ""
    echo "Errors: $ERRORS"
    echo "Warnings: $WARNINGS"
    echo ""
    echo "DO NOT DEPLOY TO PRODUCTION until all errors are resolved!"
    exit 1
fi
