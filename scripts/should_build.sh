#!/bin/bash
# ==============================================================================
# BUILD FILTER SCRIPT
# ==============================================================================
# Determines if a Render build should proceed based on changed files
#
# Usage in render.yaml:
#   buildCommand: bash scripts/should_build.sh && pip install -r requirements.txt
#
# Exit codes:
#   0 - Build should proceed
#   1 - Skip build (no relevant changes)
# ==============================================================================

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🔍 Checking if build is necessary..."

# Get the commit that triggered this build
COMMIT_SHA="${RENDER_GIT_COMMIT:-HEAD}"
PREV_COMMIT="${COMMIT_SHA}~1"

# Files/directories that SHOULD trigger a build
BUILD_TRIGGERS=(
  "app/"
  "jobs/"
  "services/"
  "schemas/"
  "scripts/"
  "requirements.txt"
  "requirements-base.txt"
  "requirements-ml.txt"
  "Dockerfile"
  "render.yaml"
  ".env.example"
)

# Files/directories that should NOT trigger a build
BUILD_IGNORE=(
  "README.md"
  "TESTING_GUIDE.md"
  "ENFORCEMENT_GUIDE.md"
  "GITHUB_BRANCH_PROTECTION.md"
  "docs/"
  "frontend/"
  ".github/"
  ".gitignore"
  ".prettierignore"
  ".eslintrc.json"
  "models/notebooks/"
  "*.md"
  "*.txt" # except requirements files (handled above)
)

# Check if this is the first build (no previous commit)
if ! git rev-parse "$PREV_COMMIT" >/dev/null 2>&1; then
  echo -e "${GREEN}✅ First build - proceeding${NC}"
  exit 0
fi

# Get list of changed files
CHANGED_FILES=$(git diff --name-only "$PREV_COMMIT" "$COMMIT_SHA" 2>/dev/null || echo "")

if [ -z "$CHANGED_FILES" ]; then
  echo -e "${YELLOW}⚠️  No changed files detected - proceeding with build${NC}"
  exit 0
fi

echo "📝 Changed files:"
echo "$CHANGED_FILES"
echo ""

# Check if any changed file matches build triggers
SHOULD_BUILD=0
for file in $CHANGED_FILES; do
  for trigger in "${BUILD_TRIGGERS[@]}"; do
    if [[ "$file" == $trigger* ]]; then
      echo -e "${GREEN}✅ Found build trigger: $file matches $trigger${NC}"
      SHOULD_BUILD=1
      break 2
    fi
  done
done

if [ $SHOULD_BUILD -eq 1 ]; then
  echo -e "${GREEN}🚀 Build is necessary - proceeding${NC}"
  exit 0
fi

# Check if all changed files are in ignore list
ALL_IGNORED=1
for file in $CHANGED_FILES; do
  IGNORED=0
  for ignore in "${BUILD_IGNORE[@]}"; do
    if [[ "$file" == $ignore* ]] || [[ "$file" == *"$ignore" ]]; then
      IGNORED=1
      break
    fi
  done

  if [ $IGNORED -eq 0 ]; then
    ALL_IGNORED=0
    break
  fi
done

if [ $ALL_IGNORED -eq 1 ]; then
  echo -e "${YELLOW}⏭️  All changes are documentation/config - skipping build${NC}"
  echo -e "${YELLOW}💰 Saved build minutes!${NC}"
  exit 1
else
  echo -e "${GREEN}✅ Source code changes detected - proceeding with build${NC}"
  exit 0
fi
