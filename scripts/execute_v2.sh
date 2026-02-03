#!/bin/bash
#
# V2 Execution Script - Fundamental Intelligence
# 
# This script executes the V2 pipeline to activate fundamental analysis features.
# Run this on a machine with database access (local dev or production server).
#
# Usage:
#   ./scripts/execute_v2.sh [--skip-training]
#
# Prerequisites:
#   - .env file with DATABASE_URL
#   - Python 3.11+ with requirements.txt installed
#   - PostgreSQL client (psql) installed
#

set -e  # Exit on error

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
SKIP_TRAINING=false
if [[ "$1" == "--skip-training" ]]; then
    SKIP_TRAINING=true
fi

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  V2 Execution Script - Fundamental Intelligence${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    echo "Please create .env file with DATABASE_URL"
    exit 1
fi

source .env

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL not set in .env${NC}"
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ python3 not found${NC}"
    exit 1
fi

if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ psql not found${NC}"
    echo "Please install PostgreSQL client"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites OK${NC}"
echo ""

# Phase 1: Setup
echo -e "${BLUE}═══ Phase 1: Setup ═══${NC}"
echo -e "${YELLOW}📁 Creating outputs directory...${NC}"
mkdir -p outputs outputs/reports outputs/models
echo -e "${GREEN}✅ Outputs directory created${NC}"
echo ""

# Phase 2: Apply schemas
echo -e "${BLUE}═══ Phase 2: Database Schemas ═══${NC}"
echo -e "${YELLOW}📊 Applying V2 schemas...${NC}"

psql "$DATABASE_URL" -f schemas/fundamentals.sql > /dev/null 2>&1 || echo "fundamentals.sql already applied"
psql "$DATABASE_URL" -f schemas/model_b_ml_signals.sql > /dev/null 2>&1 || echo "model_b_ml_signals.sql already applied"
psql "$DATABASE_URL" -f schemas/ensemble_signals.sql > /dev/null 2>&1 || echo "ensemble_signals.sql already applied"

echo -e "${GREEN}✅ Schemas applied${NC}"

# Verify schemas
echo -e "${YELLOW}🔍 Verifying schemas...${NC}"
psql "$DATABASE_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_name IN ('fundamentals', 'model_b_ml_signals', 'ensemble_signals')" -t | while read table; do
    if [ ! -z "$table" ]; then
        echo -e "  ${GREEN}✓${NC} $table"
    fi
done
echo ""

# Phase 3: Load fundamental data
echo -e "${BLUE}═══ Phase 3: Data Ingestion ═══${NC}"
echo -e "${YELLOW}📥 Loading fundamental data...${NC}"

python3 jobs/load_fundamentals.py

# Verify data loaded
COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM fundamentals")
SYMBOLS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(DISTINCT symbol) FROM fundamentals")

echo -e "${GREEN}✅ Loaded $COUNT records for $SYMBOLS symbols${NC}"

# Show sample
echo -e "${YELLOW}📊 Sample data:${NC}"
psql "$DATABASE_URL" -c "SELECT symbol, pe_ratio, roe, debt_to_equity FROM fundamentals ORDER BY updated_at DESC LIMIT 5"
echo ""

# Phase 4: Build extended features
echo -e "${BLUE}═══ Phase 4: Feature Engineering ═══${NC}"
echo -e "${YELLOW}⚙️ Building extended feature set...${NC}"

python3 jobs/build_extended_feature_set.py

if [ -f "outputs/featureset_extended_latest.parquet" ]; then
    SIZE=$(du -h outputs/featureset_extended_latest.parquet | cut -f1)
    echo -e "${GREEN}✅ Extended features built ($SIZE)${NC}"
else
    echo -e "${RED}❌ Failed to build extended features${NC}"
    exit 1
fi
echo ""

# Phase 5: Train Model B
if [ "$SKIP_TRAINING" = false ]; then
    echo -e "${BLUE}═══ Phase 5: Model Training ═══${NC}"
    echo -e "${YELLOW}🤖 Training Model B (this may take 1-2 hours)...${NC}"
    
    python3 models/train_model_b_fundamentals.py
    
    if ls outputs/model_b_fundamentals_*.pkl 1> /dev/null 2>&1; then
        MODEL_SIZE=$(du -h outputs/model_b_fundamentals_*.pkl | cut -f1)
        echo -e "${GREEN}✅ Model B trained ($MODEL_SIZE)${NC}"
        
        if [ -f "outputs/model_b_validation_report.md" ]; then
            echo -e "${YELLOW}📊 Validation Report:${NC}"
            head -20 outputs/model_b_validation_report.md
        fi
    else
        echo -e "${RED}❌ Failed to train Model B${NC}"
        exit 1
    fi
else
    echo -e "${BLUE}═══ Phase 5: Model Training ═══${NC}"
    echo -e "${YELLOW}⏭️ Skipping Model B training${NC}"
fi
echo ""

# Phase 6: Generate signals
echo -e "${BLUE}═══ Phase 6: Signal Generation ═══${NC}"

echo -e "${YELLOW}📊 Generating Model B signals...${NC}"
python3 jobs/generate_signals_model_b.py

MODEL_B_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM model_b_ml_signals")
echo -e "${GREEN}✅ Generated $MODEL_B_COUNT Model B signals${NC}"

echo -e "${YELLOW}🔗 Generating ensemble signals...${NC}"
python3 jobs/generate_ensemble_signals.py

ENSEMBLE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM ensemble_signals")
AGREEMENT_RATE=$(psql "$DATABASE_URL" -t -c "SELECT ROUND(COUNT(*) FILTER (WHERE signals_agree = true) * 100.0 / COUNT(*), 1) FROM ensemble_signals")

echo -e "${GREEN}✅ Generated $ENSEMBLE_COUNT ensemble signals${NC}"
echo -e "${GREEN}   Agreement rate: $AGREEMENT_RATE%${NC}"

# Show sample ensemble signals
echo -e "${YELLOW}📊 Sample ensemble signals:${NC}"
psql "$DATABASE_URL" -c "SELECT symbol, signal, model_a_signal, model_b_signal, conflict, signals_agree FROM ensemble_signals LIMIT 10"
echo ""

# Phase 7: Verification
echo -e "${BLUE}═══ Phase 7: Verification ═══${NC}"
echo -e "${YELLOW}🧪 Running verification checks...${NC}"

# Check data quality
CONFLICTS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM ensemble_signals WHERE conflict = true")
CONFLICT_RATE=$(psql "$DATABASE_URL" -t -c "SELECT ROUND(COUNT(*) FILTER (WHERE conflict = true) * 100.0 / COUNT(*), 1) FROM ensemble_signals")

if (( $(echo "$CONFLICT_RATE < 20" | bc -l) )); then
    echo -e "  ${GREEN}✓${NC} Conflict rate: $CONFLICT_RATE% (< 20%)"
else
    echo -e "  ${YELLOW}⚠${NC} Conflict rate: $CONFLICT_RATE% (should be < 20%)"
fi

# Check signal distribution
echo -e "${YELLOW}📊 Signal distribution:${NC}"
psql "$DATABASE_URL" -c "SELECT signal, COUNT(*) FROM ensemble_signals GROUP BY signal ORDER BY COUNT(*) DESC"
echo ""

# Summary
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ V2 Execution Complete!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Summary:${NC}"
echo -e "  • Fundamentals: $SYMBOLS symbols"
echo -e "  • Model B signals: $MODEL_B_COUNT"
echo -e "  • Ensemble signals: $ENSEMBLE_COUNT"
echo -e "  • Agreement rate: $AGREEMENT_RATE%"
echo -e "  • Conflict rate: $CONFLICT_RATE%"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Review validation report: outputs/model_b_validation_report.md"
echo -e "  2. Start API server: uvicorn app.main:app --port 8788"
echo -e "  3. Test V2 endpoints: curl http://localhost:8788/signals/ensemble/latest"
echo -e "  4. Start frontend: cd frontend && npm run dev"
echo -e "  5. View dual signals at: http://localhost:3000/models"
echo ""

exit 0
