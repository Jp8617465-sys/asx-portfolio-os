#!/bin/bash

##############################################################################
# Frontend Build Validation Script
# Purpose: Validate frontend is ready for Vercel deployment
# Usage: ./scripts/validate_frontend_build.sh
##############################################################################

set -e

echo "🔍 Frontend Build Validation"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Change to frontend directory
cd "$(dirname "$0")/../frontend" || exit 1

echo "📁 Working directory: $(pwd)"
echo ""

##############################################################################
# 1. Check package.json
##############################################################################
echo "1️⃣  Checking package.json..."

if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ ERROR: package.json not found${NC}"
    ((ERRORS++))
else
    echo -e "${GREEN}✅ package.json exists${NC}"

    # Check critical dependencies
    DEPS=(
        "next"
        "react"
        "react-dom"
        "typescript"
        "tailwindcss"
        "axios"
        "@tanstack/react-table"
        "lightweight-charts"
        "lucide-react"
    )

    for dep in "${DEPS[@]}"; do
        if grep -q "\"$dep\"" package.json; then
            echo -e "   ${GREEN}✓${NC} $dep"
        else
            echo -e "   ${RED}✗${NC} $dep ${RED}MISSING${NC}"
            ((ERRORS++))
        fi
    done
fi

echo ""

##############################################################################
# 2. Check TypeScript configuration
##############################################################################
echo "2️⃣  Checking TypeScript configuration..."

if [ ! -f "tsconfig.json" ]; then
    echo -e "${RED}❌ ERROR: tsconfig.json not found${NC}"
    ((ERRORS++))
else
    echo -e "${GREEN}✅ tsconfig.json exists${NC}"

    # Check for path aliases
    if grep -q '"@/\*"' tsconfig.json; then
        echo -e "   ${GREEN}✓${NC} Path aliases configured"
    else
        echo -e "   ${YELLOW}⚠${NC}  Path aliases not found ${YELLOW}(may cause import issues)${NC}"
        ((WARNINGS++))
    fi
fi

echo ""

##############################################################################
# 3. Check Tailwind configuration
##############################################################################
echo "3️⃣  Checking Tailwind CSS configuration..."

if [ ! -f "tailwind.config.js" ] && [ ! -f "tailwind.config.ts" ]; then
    echo -e "${RED}❌ ERROR: tailwind.config not found${NC}"
    ((ERRORS++))
else
    echo -e "${GREEN}✅ Tailwind config exists${NC}"
fi

if [ ! -f "postcss.config.js" ]; then
    echo -e "${YELLOW}⚠${NC}  postcss.config.js not found ${YELLOW}(Tailwind may not work)${NC}"
    ((WARNINGS++))
else
    echo -e "${GREEN}✅ PostCSS config exists${NC}"
fi

echo ""

##############################################################################
# 4. Check core library files
##############################################################################
echo "4️⃣  Checking core library files..."

LIB_FILES=(
    "lib/design-tokens.ts"
    "lib/api-client.ts"
    "lib/types.ts"
)

for file in "${LIB_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "   ${GREEN}✓${NC} $file"
    else
        echo -e "   ${RED}✗${NC} $file ${RED}MISSING${NC}"
        ((ERRORS++))
    fi
done

echo ""

##############################################################################
# 5. Check components
##############################################################################
echo "5️⃣  Checking components..."

COMPONENTS=(
    "components/confidence-gauge.tsx"
    "components/stock-search.tsx"
    "components/signal-badge.tsx"
    "components/stock-chart.tsx"
    "components/watchlist-table.tsx"
    "components/accuracy-display.tsx"
    "components/reasoning-panel.tsx"
    "components/header.tsx"
    "components/footer.tsx"
)

for component in "${COMPONENTS[@]}"; do
    if [ -f "$component" ]; then
        echo -e "   ${GREEN}✓${NC} $component"
    else
        echo -e "   ${RED}✗${NC} $component ${RED}MISSING${NC}"
        ((ERRORS++))
    fi
done

echo ""

##############################################################################
# 6. Check pages
##############################################################################
echo "6️⃣  Checking pages..."

PAGES=(
    "app/page.tsx"
    "app/app/dashboard/page.tsx"
    "app/stock/[ticker]/page.tsx"
)

for page in "${PAGES[@]}"; do
    if [ -f "$page" ]; then
        echo -e "   ${GREEN}✓${NC} $page"
    else
        echo -e "   ${RED}✗${NC} $page ${RED}MISSING${NC}"
        ((ERRORS++))
    fi
done

echo ""

##############################################################################
# 7. Check for common issues
##############################################################################
echo "7️⃣  Checking for common issues..."

# Check for .env.local (should not be committed)
if [ -f ".env.local" ]; then
    echo -e "${YELLOW}⚠${NC}  .env.local found ${YELLOW}(should not be committed to git)${NC}"
    ((WARNINGS++))
fi

# Check for node_modules (should be in .gitignore)
if [ -d "node_modules" ]; then
    echo -e "   ${GREEN}✓${NC} node_modules exists (dependencies installed)"
else
    echo -e "   ${YELLOW}⚠${NC}  node_modules not found ${YELLOW}(run: npm install)${NC}"
    ((WARNINGS++))
fi

# Check for .next build directory
if [ -d ".next" ]; then
    echo -e "   ${YELLOW}⚠${NC}  .next directory exists ${YELLOW}(should not be committed)${NC}"
    ((WARNINGS++))
fi

# Check .gitignore
if [ -f ".gitignore" ]; then
    if grep -q "node_modules" .gitignore && grep -q ".next" .gitignore && grep -q ".env.local" .gitignore; then
        echo -e "   ${GREEN}✓${NC} .gitignore properly configured"
    else
        echo -e "   ${YELLOW}⚠${NC}  .gitignore may be incomplete"
        ((WARNINGS++))
    fi
else
    echo -e "   ${RED}✗${NC} .gitignore not found"
    ((ERRORS++))
fi

echo ""

##############################################################################
# 8. Check for TypeScript errors (if tsc available)
##############################################################################
echo "8️⃣  Checking for TypeScript errors..."

if command -v npx &> /dev/null; then
    if npx tsc --noEmit --skipLibCheck 2>&1 | grep -q "error TS"; then
        echo -e "${RED}❌ TypeScript errors found${NC}"
        echo -e "${YELLOW}Run 'npx tsc --noEmit' to see details${NC}"
        ((ERRORS++))
    else
        echo -e "${GREEN}✅ No TypeScript errors${NC}"
    fi
else
    echo -e "${YELLOW}⚠${NC}  npx not available ${YELLOW}(cannot check TypeScript errors)${NC}"
    ((WARNINGS++))
fi

echo ""

##############################################################################
# 9. Environment variable template check
##############################################################################
echo "9️⃣  Checking environment variable documentation..."

if [ -f ".env.example" ] || [ -f ".env.template" ]; then
    echo -e "${GREEN}✅ Environment variable template exists${NC}"
else
    echo -e "${YELLOW}⚠${NC}  No .env.example or .env.template ${YELLOW}(consider adding)${NC}"
    ((WARNINGS++))
fi

echo ""

##############################################################################
# 10. Check README
##############################################################################
echo "🔟 Checking documentation..."

if [ -f "README.md" ]; then
    echo -e "${GREEN}✅ README.md exists${NC}"

    # Check for key sections
    if grep -q "## Tech Stack" README.md && \
       grep -q "## Deployment" README.md && \
       grep -q "## Development" README.md; then
        echo -e "   ${GREEN}✓${NC} README has key sections"
    else
        echo -e "   ${YELLOW}⚠${NC}  README may be incomplete"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠${NC}  README.md not found"
    ((WARNINGS++))
fi

echo ""

##############################################################################
# Summary
##############################################################################
echo "=============================="
echo "📊 Validation Summary"
echo "=============================="
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED!${NC}"
    echo ""
    echo "Your frontend is ready for Vercel deployment! 🚀"
    echo ""
    echo "Next steps:"
    echo "  1. Push to GitHub: git push origin main"
    echo "  2. Import to Vercel: https://vercel.com/new"
    echo "  3. Set root directory: frontend"
    echo "  4. Add environment variables:"
    echo "     - NEXT_PUBLIC_API_URL=https://asx-portfolio-os.onrender.com/api/v1"
    echo "     - NEXT_PUBLIC_API_KEY=your_api_key"
    echo "  5. Deploy!"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠  ${WARNINGS} WARNING(S)${NC}"
    echo ""
    echo "Your frontend has minor issues but should still deploy."
    echo "Review warnings above and fix if necessary."
    exit 0
else
    echo -e "${RED}❌ ${ERRORS} ERROR(S)${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠  ${WARNINGS} WARNING(S)${NC}"
    fi
    echo ""
    echo "Your frontend has critical issues that must be fixed before deployment."
    echo "Review errors above and fix them first."
    exit 1
fi
