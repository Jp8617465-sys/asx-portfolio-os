#!/bin/bash
# Start ASX Portfolio OS Frontend

echo "========================================="
echo "Starting ASX Portfolio OS Frontend"
echo "========================================="
echo ""

cd frontend

echo "✅ Frontend configured"
echo "✅ API URL: http://localhost:8788"
echo ""
echo "Starting Next.js development server"
echo "Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop"
echo "========================================="
echo ""

# Start Next.js
npm run dev
