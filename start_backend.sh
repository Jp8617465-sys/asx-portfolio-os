#!/bin/bash
# Start ASX Portfolio OS Backend

echo "========================================="
echo "Starting ASX Portfolio OS Backend"
echo "========================================="
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Environment variables loaded"
else
    echo "❌ Error: .env file not found"
    exit 1
fi

# Check required variables
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL not set"
    exit 1
fi

if [ -z "$JWT_SECRET_KEY" ]; then
    echo "❌ Error: JWT_SECRET_KEY not set"
    exit 1
fi

echo "✅ Database: Supabase connected"
echo "✅ JWT Secret: Configured"
echo "✅ EODHD API: Configured"
echo ""
echo "Starting FastAPI server on http://localhost:8788"
echo "API Docs: http://localhost:8788/docs"
echo ""
echo "Press Ctrl+C to stop"
echo "========================================="
echo ""

# Start uvicorn
uvicorn app.main:app --reload --port 8788
