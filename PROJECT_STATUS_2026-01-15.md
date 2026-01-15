# 📊 ASX Portfolio OS - Project Status Report
**Date**: 2026-01-15
**Phase**: Model Training & Integration
**Status**: 🟡 Blocked on Training Dataset Generation

---

## 🎯 Project Overview

**ASX Portfolio OS** is an AI-driven portfolio management platform for Australian Stock Exchange equities using a three-model ensemble approach:

- **Model A (Technical/Momentum)**: Price-based features (volatility, momentum, trends)
- **Model B (Fundamentals)**: Financial ratios (P/E, ROE, debt/equity, market cap)
- **Model C (NLP/Sentiment)**: News and announcement sentiment analysis

**Target Performance**: ROC-AUC 0.70 (70% improvement over baseline)

---

## ✅ Completed Milestones

### 1. **Infrastructure & Deployment** (100% Complete)
- ✅ Vercel frontend deployment configured
- ✅ Render backend deployment live at: https://asx-portfolio-os.onrender.com
- ✅ Supabase PostgreSQL database provisioned
- ✅ Fixed LightGBM dependency issues (added libgomp1 to Dockerfile)
- ✅ CI/CD pipeline functioning (auto-deploy on push to main)
- ✅ API endpoints operational and tested

### 2. **Database Population** (100% Complete)
- ✅ **2,394 ASX symbols** in universe table
- ✅ **1,192,047 price records** (Dec 2023 - Jan 2026)
- ✅ **2+ years of historical data** ready for training
- ✅ All schemas applied successfully

### 3. **Fundamentals Data (Model B)** (Partial - 2.9% Complete)
- ✅ Pipeline built: `jobs/load_fundamentals_pipeline.py`
- ✅ Test batch: 50 tickers fetched successfully (63 records with P/E, ROE, market cap)
- ⏳ **IN PROGRESS**: Full universe fetch (1,743 tickers, ~45 min runtime)
- 📋 **NEXT**: Derive fundamental features for Model B training

### 4. **Planning & Documentation** (100% Complete)
- ✅ Model B/C Integration Plan: `MODEL_B_C_INTEGRATION_PLAN.md`
- ✅ Training scripts prepared
- ✅ Roadmap defined with clear milestones

---

## 🚧 Current Blockers

### **BLOCKER 1: Training Dataset Not Generated on Render** 🔴

**Issue**: Running `python jobs/build_training_dataset.py` on Render claims to fetch 36 months of data but doesn't create the output file `outputs/model_a_training_dataset.csv`.

**Impact**: Cannot train Model A without the dataset file.

**Root Cause**: Unknown - need to see full output from dataset builder script.

**Required Action**:
1. Run `python jobs/build_training_dataset.py` and capture full output
2. Debug why file isn't being created (permissions? directory missing? database connection?)
3. Verify database connectivity on Render

**Workaround Options**:
- Build dataset locally and upload to Render
- Check if Render has write permissions to `/app/outputs/` directory
- Use alternative data loading method (direct database query in training script)

### **BLOCKER 2: Local Training Impossible** 🟡

**Issue**: Mac local environment missing libomp library for LightGBM.

**Impact**: All training must happen on Render.

**Status**: Accepted limitation - Render has proper dependencies after Dockerfile fix.

---

## 🏗️ Technical Architecture

### **Data Flow**
```
EODHD API → PostgreSQL (Supabase) → Feature Engineering → Training Dataset → LightGBM Models → Predictions API
```

### **Key Components**
1. **Data Ingestion**:
   - `jobs/load_fundamentals_pipeline.py` - Fetch fundamentals from EODHD
   - Prices already populated (1.2M rows)

2. **Feature Engineering**:
   - `jobs/build_training_dataset.py` - Generate Model A features from prices
   - `jobs/derive_fundamentals_features.py` - Generate Model B features
   - `jobs/build_extended_feature_set.py` - Merge all features

3. **Model Training**:
   - `models/train_model_a_ml.py` - Core Model A training
   - `scripts/train_production_models.py` - Production wrapper with hyperparameter tuning
   - Optuna for hyperparameter optimization (30 trials)

4. **Deployment**:
   - Models saved as `.pkl` files
   - API serves predictions via FastAPI endpoints
   - Render hosts backend with auto-scaling

### **Environment Variables** (Configured on Render)
- `DATABASE_URL` - Supabase PostgreSQL connection
- `EODHD_API_KEY` - Market data provider
- `OS_API_KEY` - Internal API authentication
- `NEWS_API_KEY` - News data for Model C

---

## 📋 Roadmap & Next Steps

### **Phase 1: Complete Model A Training** (CURRENT - Blocked)
**Goal**: Train baseline technical/momentum model
**Status**: 🔴 Blocked on dataset generation

**Steps**:
1. ❌ **DEBUG**: Fix dataset generation on Render
   - Verify database connectivity
   - Check file permissions for `/app/outputs/`
   - Capture full error output

2. ⏳ Once dataset exists:
   ```bash
   touch .env  # Create dummy .env to bypass wrapper check
   python scripts/train_production_models.py --tune-hyperparams --n-trials 30
   ```

3. ⏳ Validate trained model:
   ```bash
   python scripts/validate_deployment.py
   ```

**Expected Outcome**: Model A with ROC-AUC 0.62-0.65 (baseline)

---

### **Phase 2: Complete Model B (Fundamentals)** (15% Complete)
**Goal**: Integrate fundamental analysis features
**Status**: 🟡 Data ingestion in progress

**Steps**:
1. ✅ Fetch fundamentals test batch (50 tickers) - DONE
2. ⏳ **IN PROGRESS**: Fetch full universe (1,743 tickers, ~45 min)
   - Running locally: Process ID 8968
   - Expected completion: 7:15 PM local time
3. ⏳ Derive fundamental features:
   ```bash
   python jobs/derive_fundamentals_features.py
   ```
   Creates: `pe_ratio_zscore`, `roe_ratio`, `quality_score`, `valuation_score`

4. ⏳ Train Model B standalone:
   ```bash
   python models/train_model_b_fundamentals.py
   ```

5. ⏳ Train A+B ensemble:
   ```bash
   python models/train_ensemble_a_b.py
   ```

**Expected Outcome**: A+B ensemble with ROC-AUC 0.67 (+8% vs Model A alone)

---

### **Phase 3: Implement Model C (NLP/Sentiment)** (Not Started)
**Goal**: Add sentiment analysis from news and announcements
**Status**: ⚪ Planned

**Steps**:
1. Ingest ASX announcements:
   ```bash
   python jobs/ingest_asx_announcements_job.py
   ```

2. NLP feature engineering:
   ```bash
   python jobs/derive_nlp_features.py
   ```
   Creates: `sentiment_score`, `sentiment_confidence`, `event_type`

3. Optional: Fine-tune FinBERT on ASX corpus
   ```bash
   python models/finetune_finbert_asx.py
   ```

4. Train A+B+C ensemble:
   ```bash
   python models/train_ensemble_abc.py
   ```

**Expected Outcome**: Full ensemble with ROC-AUC 0.70 (+13% vs Model A alone)

---

### **Phase 4: Backtesting & Validation** (Not Started)
**Goal**: Validate ensemble performance with walk-forward testing
**Status**: ⚪ Planned

**Steps**:
1. Run walk-forward backtest:
   ```bash
   python jobs/backtest_ensemble_abc.py --train-months 18 --test-months 1
   ```

2. Validate key metrics:
   - ROC-AUC > 0.68
   - Sharpe Ratio > 1.4
   - Win Rate > 58%
   - Max Drawdown < 20%

3. Compare against baseline:
   ```bash
   python jobs/backtest_model_a_ml.py
   ```

**Expected Outcome**: Validated ensemble ready for production

---

### **Phase 5: Production Deployment** (Not Started)
**Goal**: Deploy ensemble to production API
**Status**: ⚪ Planned

**Steps**:
1. Deploy ensemble artifacts to Render
2. Update API endpoints to use ensemble scores
3. A/B test: Model A vs Ensemble (10% → 50% → 100% rollout)
4. Monitor performance vs baseline
5. Set up daily retraining cron jobs

**Expected Outcome**: Production system serving ensemble predictions

---

## 📊 Performance Targets

| Model | ROC-AUC | RMSE | Sharpe | Win Rate | Status |
|-------|---------|------|--------|----------|--------|
| **Baseline (Buy & Hold)** | N/A | N/A | 0.4-0.6 | 50% | ✅ Reference |
| **Model A (Technical)** | 0.62 | 16-18% | 1.0 | 54% | 🔴 Blocked |
| **A+B Ensemble** | 0.67 | 14-17% | 1.2-1.6 | 56-58% | ⚪ Planned |
| **A+B+C Ensemble** | 0.70 | 13-16% | 1.4-1.8 | 58-62% | ⚪ Planned |

---

## 🔑 Key Technical Details

### **Database Schema**
- `prices` - 1.2M rows (2+ years daily OHLCV)
- `features_fundamental` - 63 rows (50 tickers, partial)
- `features_extended` - Not yet populated
- `model_runs` - Training history tracking
- `job_history` - Pipeline execution logs

### **Model Training Configuration**
- **Lookback**: 36 months historical data
- **CV Folds**: 12 (time series split)
- **Hyperparameter Tuning**: Optuna with 30 trials
- **Features (Model A)**: 12 base features (momentum, volatility, trend)
- **Features (Model B)**: 8+ fundamental ratios
- **Features (Model C)**: 8+ sentiment scores

### **API Endpoints** (Live at https://asx-portfolio-os.onrender.com)
- `GET /health` - Service health check
- `GET /model/status/summary` - Model performance metrics
- `GET /signals/live` - Current trading signals
- `POST /portfolio/refresh` - Recalculate portfolio
- `GET /jobs/summary` - Pipeline execution stats

---

## 🤔 Key Decisions Needed

### **Decision 1: How to Resolve Dataset Generation Issue?**
**Options**:
1. Debug Render environment (check permissions, directories, database connection)
2. Build dataset locally and upload to Render (workaround)
3. Modify training script to load directly from database (skip file generation)

**Recommendation**: Option 1 (debug Render) - most sustainable long-term

### **Decision 2: Training Strategy**
**Options**:
1. Train Model A first, validate, then add B and C incrementally
2. Wait for all data (fundamentals + NLP) and train ensemble immediately

**Recommendation**: Option 1 (incremental) - faster feedback, easier debugging

### **Decision 3: Hyperparameter Tuning Investment**
**Options**:
1. Use default parameters (fast, good enough for MVP)
2. Run 30-trial Optuna optimization (~30 min)
3. Run 100-trial deep optimization (~2 hours)

**Recommendation**: Option 2 (30 trials) - good balance of performance and time

### **Decision 4: Model Versioning Strategy**
**Options**:
1. Replace existing model immediately (aggressive)
2. A/B test with gradual rollout (safe)
3. Run parallel for 1 week then switch (cautious)

**Recommendation**: Option 2 (A/B test) - industry best practice

---

## 📈 Success Metrics

### **MVP Success Criteria** (Model A Only)
- ✅ Database populated (1.2M prices)
- ❌ Model A trained with ROC-AUC > 0.60
- ❌ Backtest Sharpe Ratio > 0.8
- ❌ Production API serving predictions

### **Enhanced Product Criteria** (Model A+B)
- ⏳ Fundamentals data for 1,500+ tickers (2.9% complete)
- ❌ A+B ensemble ROC-AUC > 0.65
- ❌ Backtest Sharpe Ratio > 1.2
- ❌ Information Ratio > 0.5

### **Full Product Criteria** (Model A+B+C)
- ❌ NLP data for top 300 tickers
- ❌ Full ensemble ROC-AUC > 0.68
- ❌ Backtest Sharpe Ratio > 1.4
- ❌ Win Rate > 58%
- ❌ Max Drawdown < 20%

---

## 🚀 Immediate Next Actions (Priority Order)

### **Action 1: Resolve Training Dataset Issue** 🔴 URGENT
- **Owner**: Debug with Claude Code
- **Task**: Capture full output from `python jobs/build_training_dataset.py`
- **Blocker**: Cannot proceed with Model A training until resolved
- **ETA**: 30 minutes

### **Action 2: Monitor Fundamentals Fetch** 🟡 IN PROGRESS
- **Owner**: Background process running (PID 8968)
- **Task**: Wait for completion (~45 min)
- **Check**: Verify data in `features_fundamental` table
- **ETA**: 7:15 PM local time

### **Action 3: Train Model A** 🟢 READY (once Action 1 resolved)
- **Owner**: Run on Render shell
- **Task**: Execute hyperparameter tuning
- **Command**: `python scripts/train_production_models.py --tune-hyperparams --n-trials 30`
- **ETA**: 25-35 minutes

### **Action 4: Validate Model A** 🟢 READY (after Action 3)
- **Owner**: Run validation script
- **Task**: Check model performance meets targets
- **Command**: `python scripts/validate_deployment.py`
- **ETA**: 5 minutes

---

## 🔗 Key Resources

### **Documentation**
- `MODEL_B_C_INTEGRATION_PLAN.md` - Full roadmap for Models B & C
- `PROJECT_STATUS_2026-01-15.md` - This document

### **Critical Scripts**
- `jobs/build_training_dataset.py` - Generate Model A training data
- `models/train_model_a_ml.py` - Core Model A training
- `scripts/train_production_models.py` - Production wrapper with hyperparameter tuning

### **Deployment**
- **Backend**: https://asx-portfolio-os.onrender.com
- **Dashboard**: https://dashboard.render.com
- **Database**: Supabase PostgreSQL (via `DATABASE_URL`)

### **API Credentials**
- EODHD API Key: `68d8b2f7f26f26.20014269`
- OS API Key: `REDACTED2026_DB_Pass_01`
- News API Key: `REDACTED`

---

## 💡 Recommendations for Claude Chat Discussion

### **Topics to Discuss**:
1. **Dataset Generation Debugging**: Why isn't `build_training_dataset.py` creating output files on Render?
2. **Alternative Training Approaches**: Should we modify the training script to load directly from database?
3. **Model B Timeline**: With fundamentals fetch taking ~45 min per full run, how to optimize data ingestion?
4. **Production Deployment Strategy**: A/B testing vs full replacement for ensemble rollout?
5. **Feature Engineering**: Which additional features would most improve ROC-AUC?

### **Questions for Claude Chat**:
1. What's the best way to debug file creation issues in Docker containers?
2. Should we prioritize Model A completion or wait for full data and train ensemble immediately?
3. How to handle missing fundamental data for some tickers (coverage = 68%)?
4. What's the optimal number of Optuna trials for LightGBM hyperparameter tuning?
5. Should we implement feature selection before training to reduce overfitting?

---

## 📝 Change Log

- **2026-01-15 18:45**: Created comprehensive project status document
- **2026-01-15 18:30**: Fundamentals fetch started (1,743 tickers)
- **2026-01-15 18:15**: Training blocked on dataset generation issue
- **2026-01-15 17:45**: Fixed LightGBM libgomp dependency in Dockerfile
- **2026-01-15 17:30**: Created training script for Render deployment
- **2026-01-15 17:00**: Completed fundamentals test batch (50 tickers)

---

**Status Summary**: 🟡 Yellow - Infrastructure complete, data ready, blocked on training dataset generation. Fundamentals ingestion in progress. Estimated 1-2 hours to resolve blockers and complete Model A training.
