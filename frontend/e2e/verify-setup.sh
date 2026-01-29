#!/bin/bash

echo "🔍 Verifying E2E Test Setup..."
echo ""

# Check if Playwright is installed
echo "1. Checking Playwright installation..."
if npx playwright --version > /dev/null 2>&1; then
  echo "   ✅ Playwright installed: $(npx playwright --version)"
else
  echo "   ❌ Playwright not installed"
  echo "   Run: npm install -D @playwright/test"
  exit 1
fi

# Check if browsers are installed
echo ""
echo "2. Checking browser installations..."
PLAYWRIGHT_CACHE=$(npx playwright --version | head -1)
if [ -d "$HOME/Library/Caches/ms-playwright" ]; then
  echo "   ✅ Browsers installed in: $HOME/Library/Caches/ms-playwright"
  ls "$HOME/Library/Caches/ms-playwright" | grep -E "chromium|firefox|webkit" | sed 's/^/      - /'
else
  echo "   ❌ Browsers not installed"
  echo "   Run: npx playwright install chromium firefox webkit"
  exit 1
fi

# Check if backend is running
echo ""
echo "3. Checking backend server..."
if curl -s http://localhost:8788/health > /dev/null 2>&1; then
  echo "   ✅ Backend running on http://localhost:8788"
else
  echo "   ⚠️  Backend not running on http://localhost:8788"
  echo "   Start with: cd ../backend && uvicorn app.main:app --host 0.0.0.0 --port 8788"
fi

# Check if frontend is running
echo ""
echo "4. Checking frontend server..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo "   ✅ Frontend running on http://localhost:3000"
else
  echo "   ⚠️  Frontend not running on http://localhost:3000"
  echo "   Start with: npm run dev"
fi

# Check test directory structure
echo ""
echo "5. Checking test directory structure..."
REQUIRED_DIRS=(
  "e2e/auth"
  "e2e/token"
  "e2e/protection"
  "e2e/authorization"
  "e2e/ratelimit"
  "e2e/complete"
  "e2e/helpers"
  "e2e/pages"
)

ALL_DIRS_OK=true
for dir in "${REQUIRED_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    echo "   ✅ $dir"
  else
    echo "   ❌ $dir missing"
    ALL_DIRS_OK=false
  fi
done

# Count test files
echo ""
echo "6. Counting test files..."
TEST_COUNT=$(find e2e -name "*.spec.ts" | wc -l | tr -d ' ')
echo "   📝 Found $TEST_COUNT test files"

# List test files
find e2e -name "*.spec.ts" | sed 's|^e2e/|      - |'

# Check helper files
echo ""
echo "7. Checking helper files..."
HELPER_FILES=(
  "e2e/helpers/auth-helper.ts"
  "e2e/helpers/token-helper.ts"
  "e2e/helpers/storage-helper.ts"
  "e2e/helpers/api-helper.ts"
  "e2e/helpers/performance-helper.ts"
)

for file in "${HELPER_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "   ✅ $(basename $file)"
  else
    echo "   ❌ $(basename $file) missing"
  fi
done

# Check page objects
echo ""
echo "8. Checking page objects..."
PAGE_FILES=(
  "e2e/pages/login.page.ts"
  "e2e/pages/register.page.ts"
)

for file in "${PAGE_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "   ✅ $(basename $file)"
  else
    echo "   ❌ $(basename $file) missing"
  fi
done

# Check playwright config
echo ""
echo "9. Checking Playwright configuration..."
if [ -f "playwright.config.ts" ]; then
  echo "   ✅ playwright.config.ts exists"
else
  echo "   ❌ playwright.config.ts missing"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Setup Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   Test Files: $TEST_COUNT"
echo "   Backend: $(curl -s http://localhost:8788/health > /dev/null 2>&1 && echo "Running ✅" || echo "Not running ⚠️")"
echo "   Frontend: $(curl -s http://localhost:3000 > /dev/null 2>&1 && echo "Running ✅" || echo "Not running ⚠️")"
echo ""
echo "🚀 Ready to run tests!"
echo ""
echo "Commands:"
echo "   npm run test:e2e           # Run all tests"
echo "   npm run test:e2e:ui        # Run with UI"
echo "   npm run test:e2e:headed    # Run in headed mode"
echo "   npm run test:e2e:debug     # Run in debug mode"
echo ""
