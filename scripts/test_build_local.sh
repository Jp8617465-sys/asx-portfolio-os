#!/bin/bash
# ==============================================================================
# LOCAL BUILD TESTING SCRIPT
# ==============================================================================
# Test Docker builds locally before pushing to Render
# Saves build minutes by catching issues early
#
# Usage:
#   ./scripts/test_build_local.sh              # Test optimized build
#   ./scripts/test_build_local.sh --original   # Test original build
#   ./scripts/test_build_local.sh --compare    # Compare both builds
# ==============================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

MODE="${1:---optimized}"

echo -e "${BLUE}=====================================================================${NC}"
echo -e "${BLUE}  LOCAL DOCKER BUILD TESTER${NC}"
echo -e "${BLUE}=====================================================================${NC}"
echo ""

# ==============================================================================
# Function: Build and Test Original Dockerfile
# ==============================================================================
test_original_build() {
  echo -e "${YELLOW}📦 Testing ORIGINAL Dockerfile...${NC}"
  echo ""

  START_TIME=$(date +%s)

  # Build image
  echo "🔨 Building image..."
  docker build \
    -f Dockerfile \
    -t asx-portfolio-api:original \
    --progress=plain \
    . 2>&1 | tee build-original.log

  END_TIME=$(date +%s)
  BUILD_TIME=$((END_TIME - START_TIME))

  # Get image size
  IMAGE_SIZE=$(docker images asx-portfolio-api:original --format "{{.Size}}")

  echo ""
  echo -e "${GREEN}✅ Original build completed!${NC}"
  echo -e "   Build time: ${BUILD_TIME}s"
  echo -e "   Image size: ${IMAGE_SIZE}"
  echo ""

  # Test container starts
  echo "🧪 Testing container startup..."
  docker run -d \
    --name asx-test-original \
    -p 10001:10000 \
    -e DATABASE_URL="postgresql://test:test@localhost:5432/test" \
    -e EODHD_API_KEY="test" \
    -e OPENAI_API_KEY="test" \
    asx-portfolio-api:original

  sleep 5

  # Check health
  if curl -s http://localhost:10001/health > /dev/null; then
    echo -e "${GREEN}✅ Container is healthy!${NC}"
  else
    echo -e "${RED}❌ Container health check failed${NC}"
  fi

  # Cleanup
  docker stop asx-test-original
  docker rm asx-test-original

  echo ""
  echo -e "${GREEN}📊 Original Build Summary:${NC}"
  echo -e "   Build time: ${BUILD_TIME}s"
  echo -e "   Image size: ${IMAGE_SIZE}"
  echo ""
}

# ==============================================================================
# Function: Build and Test Optimized Dockerfile
# ==============================================================================
test_optimized_build() {
  echo -e "${YELLOW}📦 Testing OPTIMIZED Dockerfile...${NC}"
  echo ""

  START_TIME=$(date +%s)

  # Build image
  echo "🔨 Building image..."
  docker build \
    -f Dockerfile.optimized \
    -t asx-portfolio-api:optimized \
    --progress=plain \
    . 2>&1 | tee build-optimized.log

  END_TIME=$(date +%s)
  BUILD_TIME=$((END_TIME - START_TIME))

  # Get image size
  IMAGE_SIZE=$(docker images asx-portfolio-api:optimized --format "{{.Size}}")

  echo ""
  echo -e "${GREEN}✅ Optimized build completed!${NC}"
  echo -e "   Build time: ${BUILD_TIME}s"
  echo -e "   Image size: ${IMAGE_SIZE}"
  echo ""

  # Test container starts
  echo "🧪 Testing container startup..."
  docker run -d \
    --name asx-test-optimized \
    -p 10002:10000 \
    -e DATABASE_URL="postgresql://test:test@localhost:5432/test" \
    -e EODHD_API_KEY="test" \
    -e OPENAI_API_KEY="test" \
    asx-portfolio-api:optimized

  sleep 5

  # Check health
  if curl -s http://localhost:10002/health > /dev/null; then
    echo -e "${GREEN}✅ Container is healthy!${NC}"
  else
    echo -e "${RED}❌ Container health check failed${NC}"
  fi

  # Cleanup
  docker stop asx-test-optimized
  docker rm asx-test-optimized

  echo ""
  echo -e "${GREEN}📊 Optimized Build Summary:${NC}"
  echo -e "   Build time: ${BUILD_TIME}s"
  echo -e "   Image size: ${IMAGE_SIZE}"
  echo ""
}

# ==============================================================================
# Function: Compare Both Builds
# ==============================================================================
compare_builds() {
  echo -e "${BLUE}=====================================================================${NC}"
  echo -e "${BLUE}  COMPARISON MODE${NC}"
  echo -e "${BLUE}=====================================================================${NC}"
  echo ""

  test_original_build
  test_optimized_build

  echo -e "${BLUE}=====================================================================${NC}"
  echo -e "${BLUE}  FINAL COMPARISON${NC}"
  echo -e "${BLUE}=====================================================================${NC}"
  echo ""

  ORIGINAL_SIZE=$(docker images asx-portfolio-api:original --format "{{.Size}}")
  OPTIMIZED_SIZE=$(docker images asx-portfolio-api:optimized --format "{{.Size}}")

  echo "📊 Build Comparison:"
  echo "   Original:  ${ORIGINAL_SIZE}"
  echo "   Optimized: ${OPTIMIZED_SIZE}"
  echo ""

  # Show layer breakdown
  echo "📋 Layer Analysis:"
  echo ""
  echo "Original layers:"
  docker history asx-portfolio-api:original --no-trunc --human
  echo ""
  echo "Optimized layers:"
  docker history asx-portfolio-api:optimized --no-trunc --human
  echo ""

  # Cleanup
  echo "🧹 Cleaning up test images..."
  docker rmi asx-portfolio-api:original asx-portfolio-api:optimized || true
}

# ==============================================================================
# Main Execution
# ==============================================================================

case "$MODE" in
  --original)
    test_original_build
    ;;
  --optimized)
    test_optimized_build
    ;;
  --compare)
    compare_builds
    ;;
  *)
    echo -e "${RED}Invalid mode: $MODE${NC}"
    echo "Usage: $0 [--original|--optimized|--compare]"
    exit 1
    ;;
esac

echo -e "${GREEN}✅ Local build testing complete!${NC}"
echo ""
echo "💡 Next steps:"
echo "   1. Review build logs (build-*.log)"
echo "   2. If satisfied, commit Dockerfile.optimized as Dockerfile"
echo "   3. Push to GitHub to trigger Render deploy"
echo ""
