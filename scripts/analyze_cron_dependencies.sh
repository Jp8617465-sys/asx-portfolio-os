#!/bin/bash
# ==============================================================================
# CRON DEPENDENCY ANALYZER
# ==============================================================================
# Analyzes which cron scripts need ML dependencies vs base dependencies
# Helps optimize render.yaml buildCommand settings
#
# Usage:
#   ./scripts/analyze_cron_dependencies.sh
# ==============================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}=====================================================================${NC}"
echo -e "${BLUE}  CRON DEPENDENCY ANALYZER${NC}"
echo -e "${BLUE}=====================================================================${NC}"
echo ""

# ML libraries to check for
ML_LIBS=(
  "lightgbm"
  "torch"
  "transformers"
  "sklearn"
  "scikit-learn"
  "shap"
  "prefect"
)

# Find all cron scripts
CRON_SCRIPTS=$(find scripts/ -name "cron_*.py" | sort)

if [ -z "$CRON_SCRIPTS" ]; then
  echo -e "${YELLOW}⚠️  No cron scripts found in scripts/ directory${NC}"
  exit 0
fi

echo -e "${BLUE}Found cron scripts:${NC}"
for script in $CRON_SCRIPTS; do
  echo "  - $script"
done
echo ""

# ==============================================================================
# Function: Analyze Script Dependencies
# ==============================================================================
analyze_script() {
  local script="$1"
  local script_name=$(basename "$script")

  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}📋 Analyzing: $script_name${NC}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  # Extract all imports
  echo "📦 Imports found:"
  grep -E "^import |^from " "$script" | sed 's/^/   /' || echo "   (None found)"
  echo ""

  # Check for ML libraries
  local needs_ml=0
  local ml_libs_found=()

  for lib in "${ML_LIBS[@]}"; do
    if grep -q "import $lib" "$script" || grep -q "from $lib" "$script"; then
      needs_ml=1
      ml_libs_found+=("$lib")
    fi
  done

  # Recommendation
  if [ $needs_ml -eq 1 ]; then
    echo -e "${RED}❌ NEEDS ML REQUIREMENTS${NC}"
    echo "   ML libraries detected:"
    for lib in "${ml_libs_found[@]}"; do
      echo "     - $lib"
    done
    echo ""
    echo "   Recommendation: Use requirements-ml.txt"
    echo ""
    echo "   render.yaml config:"
    echo "   ${BLUE}buildCommand: pip install -r requirements-ml.txt${NC}"
  else
    echo -e "${GREEN}✅ NEEDS ONLY BASE REQUIREMENTS${NC}"
    echo "   No ML libraries detected"
    echo ""
    echo "   Recommendation: Use requirements-base.txt"
    echo ""
    echo "   render.yaml config:"
    echo "   ${BLUE}buildCommand: pip install -r requirements-base.txt${NC}"
  fi

  echo ""
}

# ==============================================================================
# Analyze All Scripts
# ==============================================================================
for script in $CRON_SCRIPTS; do
  analyze_script "$script"
done

# ==============================================================================
# Summary
# ==============================================================================
echo -e "${BLUE}=====================================================================${NC}"
echo -e "${BLUE}  SUMMARY & RECOMMENDATIONS${NC}"
echo -e "${BLUE}=====================================================================${NC}"
echo ""

# Count scripts needing base vs ML
base_count=0
ml_count=0

for script in $CRON_SCRIPTS; do
  needs_ml=0
  for lib in "${ML_LIBS[@]}"; do
    if grep -q "import $lib" "$script" || grep -q "from $lib" "$script"; then
      needs_ml=1
      break
    fi
  done

  if [ $needs_ml -eq 1 ]; then
    ((ml_count++))
  else
    ((base_count++))
  fi
done

echo "📊 Results:"
echo "   Scripts needing BASE requirements: $base_count"
echo "   Scripts needing ML requirements:   $ml_count"
echo ""

if [ $base_count -gt 0 ]; then
  echo -e "${GREEN}💰 Potential Savings:${NC}"
  echo "   $base_count cron jobs can use requirements-base.txt"
  echo "   Estimated savings per job: 15-18 minutes per build"
  echo "   Total potential savings: $(($base_count * 15))-$(($base_count * 18)) minutes per run cycle"
  echo ""
fi

echo "📝 Next Steps:"
echo "   1. Review render.yaml and update buildCommand for each cron"
echo "   2. Test each cron with suggested requirements file"
echo "   3. Monitor first execution after deployment"
echo "   4. Document any scripts that need custom dependency sets"
echo ""

echo -e "${BLUE}=====================================================================${NC}"
echo -e "${GREEN}✅ Analysis complete!${NC}"
echo -e "${BLUE}=====================================================================${NC}"
