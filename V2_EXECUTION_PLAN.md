# V2 Execution Plan: Fundamental Intelligence

**Date**: February 3, 2026
**Status**: Ready to Execute
**Goal**: Activate V2 features (Model B + Ensemble Signals)

---

## CURRENT STATUS

### ✅ What's Already Built
- [x] Database schemas (`fundamentals.sql`, `model_b_ml_signals.sql`, `ensemble_signals.sql`)
- [x] Data ingestion pipeline (`jobs/ingest_fundamentals_job.py`, `jobs/load_fundamentals_pipeline.py`)
- [x] Model B training script (`models/train_model_b_fundamentals.py`)
- [x] Signal generation jobs (`jobs/generate_signals_model_b.py`, `jobs/generate_ensemble_signals.py`)
- [x] API endpoints (`app/routes/fundamentals.py`)
- [x] Frontend components (`FundamentalsTab.tsx`, `EnsembleSignalsTable.tsx`)
- [x] Model A trained (models/*.pkl files exist)

### ❌ What Needs Execution
- [ ] Create outputs directory
- [ ] Apply V2 database schemas
- [ ] Ingest fundamental data
- [ ] Build extended feature set
- [ ] Train Model B
- [ ] Generate Model B signals
- [ ] Generate ensemble signals
- [ ] Test V2 API endpoints
- [ ] Verify frontend integration

---

## EXECUTION STEPS

### Phase 1: Environment Setup (15 min)

**Step 1.1: Create outputs directory**
```bash
mkdir -p outputs
mkdir -p outputs/reports
```

**Step 1.2: Apply V2 database schemas**
```bash
# Note: Requires DATABASE_URL environment variable
# Option 1: If .env exists
source .env
psql $DATABASE_URL -f schemas/fundamentals.sql
psql $DATABASE_URL -f schemas/model_b_ml_signals.sql
psql $DATABASE_URL -f schemas/ensemble_signals.sql

# Option 2: Direct apply (if DATABASE_URL is in environment)
python3 jobs/apply_schemas.py
```

**Step 1.3: Verify tables created**
```bash
psql $DATABASE_URL -c "\dt fundamentals"
psql $DATABASE_URL -c "\dt model_b_ml_signals"
psql $DATABASE_URL -c "\dt ensemble_signals"
```

---

### Phase 2: Data Ingestion (30 min)

**Step 2.1: Load sample fundamental data**
```bash
# Option A: Load from CSV (sample data)
python3 jobs/load_fundamentals.py

# Option B: Fetch from EODHD API (requires API key)
python3 jobs/ingest_fundamentals_job.py
```

**Step 2.2: Verify fundamentals loaded**
```bash
psql $DATABASE_URL -c "SELECT COUNT(*), COUNT(DISTINCT symbol) FROM fundamentals"
psql $DATABASE_URL -c "SELECT symbol, pe_ratio, roe FROM fundamentals LIMIT 5"
```

**Expected Output**: 5+ symbols with fundamental metrics

---

### Phase 3: Build Extended Feature Set (1 hour)

**Step 3.1: Build extended features**
```bash
# This creates the extended feature set needed for training
python3 jobs/build_extended_feature_set.py
```

**Step 3.2: Verify output**
```bash
ls -lh outputs/featureset_extended_latest.parquet
```

**Expected Output**: Parquet file ~10-100 MB

---

### Phase 4: Train Model B (2 hours)

**Step 4.1: Train Model B (fundamental analysis)**
```bash
# This trains LightGBM on fundamental features
python3 models/train_model_b_fundamentals.py
```

**Step 4.2: Verify Model B trained**
```bash
ls -lh outputs/model_b_fundamentals_v1_0.pkl
ls -lh outputs/model_b_validation_report.md
```

**Expected Output**: 
- Model pickle file
- Validation report with >65% precision

---

### Phase 5: Generate Signals (30 min)

**Step 5.1: Generate Model B signals**
```bash
python3 jobs/generate_signals_model_b.py
```

**Step 5.2: Verify Model B signals**
```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM model_b_ml_signals"
psql $DATABASE_URL -c "SELECT symbol, signal, quality_score FROM model_b_ml_signals LIMIT 5"
```

**Step 5.3: Generate ensemble signals**
```bash
python3 jobs/generate_ensemble_signals.py
```

**Step 5.4: Verify ensemble signals**
```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM ensemble_signals"
psql $DATABASE_URL -c "SELECT symbol, signal, conflict, signals_agree FROM ensemble_signals LIMIT 10"
```

---

### Phase 6: API Testing (15 min)

**Step 6.1: Start backend server**
```bash
# Terminal 1
uvicorn app.main:app --reload --port 8788
```

**Step 6.2: Test V2 endpoints**
```bash
# Terminal 2
# Health check
curl http://localhost:8788/health

# Fundamentals metrics
curl http://localhost:8788/fundamentals/metrics?ticker=BHP.AU

# Fundamentals quality
curl http://localhost:8788/fundamentals/quality?ticker=BHP.AU

# Model B signals
curl http://localhost:8788/signals/model_b/latest

# Ensemble signals
curl http://localhost:8788/signals/ensemble/latest

# Signal comparison
curl http://localhost:8788/signals/compare?ticker=BHP.AU
```

**Expected**: All endpoints return 200 OK with data

---

### Phase 7: Frontend Verification (15 min)

**Step 7.1: Start frontend**
```bash
cd frontend
npm install  # If not already done
npm run dev
```

**Step 7.2: Manual verification**
1. Visit http://localhost:3000
2. Navigate to "Models" page
3. Verify dual signals table shows Model A + Model B
4. Click on a stock (e.g., BHP.AU)
5. Verify "Fundamentals" tab appears
6. Check fundamentals metrics display correctly

---

## SUCCESS CRITERIA

### Technical
- [ ] Model B precision >65% on top quintile (check validation report)
- [ ] Ensemble signals generated for all stocks
- [ ] No conflicts in >80% of signals
- [ ] API latency <500ms for all V2 endpoints
- [ ] All 5 V2 API endpoints working

### User Experience
- [ ] Dual signals visible on dashboard
- [ ] Fundamentals tab shows on stock detail page
- [ ] Filter by "models agree" works
- [ ] Quality scores (A-F) display correctly

### Data Quality
- [ ] Fundamentals data fresh (<7 days)
- [ ] No NULL values in critical fields (PE, ROE)
- [ ] Signal distribution reasonable (not all HOLD or all BUY)

---

## TROUBLESHOOTING

### Issue: "DATABASE_URL not set"
**Solution**: Create `.env` file with `DATABASE_URL=postgresql://...`

### Issue: "No fundamental data found"
**Solution**: Run `python3 jobs/load_fundamentals.py` first

### Issue: "Missing extended features"
**Solution**: Run `python3 jobs/build_extended_feature_set.py`

### Issue: "Model B file not found"
**Solution**: Train Model B first: `python3 models/train_model_b_fundamentals.py`

### Issue: "No Model A signals"
**Solution**: V2 requires Model A to be run first. Run `python3 jobs/generate_signals.py`

---

## ESTIMATED TIME

- **Total**: ~5 hours
- **Phase 1**: 15 min (setup)
- **Phase 2**: 30 min (data ingestion)
- **Phase 3**: 1 hour (feature engineering)
- **Phase 4**: 2 hours (model training)
- **Phase 5**: 30 min (signal generation)
- **Phase 6**: 15 min (API testing)
- **Phase 7**: 15 min (frontend verification)

---

## NEXT STEPS AFTER V2

1. Monitor V2 performance metrics
2. Gather user feedback on dual signals
3. Tune ensemble weights if needed
4. Plan V3 (Sentiment & News) if V2 successful
5. Deploy V2 to production (Render + Vercel)

---

**Status**: Ready to execute
**Prerequisites**: Database access, Python environment, Model A already trained
**Output**: Fully functional V2 with dual-signal system
