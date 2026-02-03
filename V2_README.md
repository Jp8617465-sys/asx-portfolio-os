# 📋 V2 Execution Documentation Index

This directory contains all documentation needed to execute V2 (Fundamental Intelligence).

---

## 🎯 Start Here

**New to V2?** → Read this file (you're here!)

**Ready to execute?** → See quick options below

---

## 📚 Documentation Files

### 1. **V2_QUICK_REFERENCE.md** ⚡
   - **What**: One-page quick reference
   - **For**: Quick command lookup
   - **Time**: 2 min read
   - **Best for**: Experienced users who just need commands

### 2. **V2_EXECUTION_PLAN.md** 📖
   - **What**: Complete step-by-step guide
   - **For**: Detailed execution with explanations
   - **Time**: 10 min read, 5 hours to execute
   - **Best for**: First-time execution, troubleshooting

### 3. **EXECUTION_SUMMARY.md** 📊
   - **What**: Situation analysis and status
   - **For**: Understanding what's built vs what needs execution
   - **Time**: 5 min read
   - **Best for**: Project managers, stakeholders

### 4. **V2_IMPLEMENTATION_TASKS.md** 🔨
   - **What**: Original implementation task breakdown
   - **For**: Understanding V2 features and requirements
   - **Time**: 15 min read
   - **Best for**: Developers joining the project

---

## ⚡ Quick Execution Options

### Option A: One-Command Execution (Recommended)

```bash
./scripts/execute_v2.sh
```

**Requirements**: 
- .env file with DATABASE_URL
- Python 3.11+, psql installed
- ~5 hours execution time

**What it does**: Everything! Schemas, data, training, signals, verification

---

### Option B: GitHub Actions (Production)

1. Go to: **Actions** → **V2 Execution - Fundamental Intelligence**
2. Click: **Run workflow**
3. Select: Environment (staging/production)
4. Wait: ~5 hours (automated)

**Requirements**: 
- GitHub secrets configured (DATABASE_URL, API keys)

**What it does**: Full CI/CD deployment with artifacts

---

### Option C: Manual Commands

```bash
# Quick version (see V2_EXECUTION_PLAN.md for details)
psql $DATABASE_URL -f schemas/fundamentals.sql
psql $DATABASE_URL -f schemas/model_b_ml_signals.sql
psql $DATABASE_URL -f schemas/ensemble_signals.sql

python3 jobs/load_fundamentals.py
python3 jobs/build_extended_feature_set.py
python3 models/train_model_b_fundamentals.py
python3 jobs/generate_signals_model_b.py
python3 jobs/generate_ensemble_signals.py
```

**Requirements**: Database access, manual execution

**What it does**: Step-by-step control

---

## 🗂️ Execution Scripts & Workflows

### 1. **scripts/execute_v2.sh**
   - Bash automation script
   - Handles all phases: setup → training → signals
   - Includes verification and error handling
   - Produces colored output and progress indicators

### 2. **.github/workflows/v2-execution.yml**
   - GitHub Actions workflow
   - Automated CI/CD pipeline
   - Uploads artifacts (models, reports)
   - Sends notifications on success/failure

---

## 📊 What Gets Created

After execution, you'll have:

### Database Tables
- `fundamentals` - Fundamental metrics (P/E, ROE, etc.)
- `model_b_ml_signals` - Model B trading signals
- `ensemble_signals` - Combined Model A + Model B signals

### Files
- `outputs/featureset_extended_latest.parquet` - Training features (~50 MB)
- `outputs/model_b_fundamentals_v1_0.pkl` - Trained Model B (~5 MB)
- `outputs/model_b_validation_report.md` - Performance metrics
- `outputs/reports/` - Various analysis reports

### API Endpoints (Active)
- `GET /fundamentals/metrics?ticker={symbol}`
- `GET /fundamentals/quality?ticker={symbol}`
- `GET /signals/model_b/latest`
- `GET /signals/ensemble/latest`
- `GET /signals/compare?ticker={symbol}`

### Frontend Features (Active)
- Dual signals table (Model A + Model B)
- Fundamentals tab on stock detail pages
- Filter by "models agree"
- Quality score badges (A-F)

---

## ✅ Success Criteria

Execution is successful when:

- [ ] Database has 500+ fundamental records
- [ ] Model B trained with >65% precision
- [ ] 500+ ensemble signals generated
- [ ] Agreement rate >80% (models don't conflict)
- [ ] All 5 API endpoints return 200 OK
- [ ] Frontend displays dual signals correctly

---

## 🐛 Troubleshooting

| Issue | Documentation |
|-------|---------------|
| General problems | V2_EXECUTION_PLAN.md (Troubleshooting section) |
| Commands not working | V2_QUICK_REFERENCE.md (Common Issues) |
| Understanding what's built | EXECUTION_SUMMARY.md |
| Feature questions | V2_IMPLEMENTATION_TASKS.md |

---

## ⏱️ Time Estimates

| Task | Duration | Unattended |
|------|----------|------------|
| Read docs | 30 min | No |
| Setup | 15 min | No |
| Data ingestion | 30 min | Yes |
| Feature engineering | 1 hour | Yes |
| **Model training** | **2 hours** | **Yes** ✅ |
| Signal generation | 30 min | Yes |
| Testing | 30 min | No |
| **Total** | **~5 hours** | **4 hours unattended** |

💡 **Pro tip**: Start execution, go to lunch, come back to trained model!

---

## 🎯 Decision Tree

**Not sure which approach to use?**

```
Do you have direct database access?
├─ YES → Use Option A (./scripts/execute_v2.sh)
│
└─ NO → Do you have GitHub access with secrets configured?
    ├─ YES → Use Option B (GitHub Actions)
    │
    └─ NO → Request database credentials or GitHub access
```

**First time executing V2?**
→ Read V2_EXECUTION_PLAN.md completely first

**Done this before?**
→ Use V2_QUICK_REFERENCE.md or run ./scripts/execute_v2.sh

**Need to understand what's already built?**
→ Read EXECUTION_SUMMARY.md

---

## 📞 Support

1. **Check documentation** in this order:
   - V2_QUICK_REFERENCE.md (quick answers)
   - V2_EXECUTION_PLAN.md (detailed guide)
   - EXECUTION_SUMMARY.md (status/context)

2. **Check outputs directory** for logs and reports

3. **Check API docs** at http://localhost:8788/docs

---

## 🚀 Next Steps After V2

1. **Monitor** performance for 7 days
2. **Collect** user feedback on dual signals
3. **Analyze** Model B validation report
4. **Tune** ensemble weights if needed (60% A, 40% B)
5. **Plan** V3 (Sentiment & News) if successful

See **ROADMAP_IMPLEMENTATION_PLAN.md** for V3-V5 plans

---

## 📝 Quick Commands Cheatsheet

```bash
# Check if V2 is already executed
psql $DATABASE_URL -c "SELECT COUNT(*) FROM ensemble_signals"

# Start API server
uvicorn app.main:app --port 8788

# Start frontend
cd frontend && npm run dev

# Test API
curl http://localhost:8788/signals/ensemble/latest

# Re-run just signal generation (if model exists)
python3 jobs/generate_signals_model_b.py
python3 jobs/generate_ensemble_signals.py

# Check model performance
cat outputs/model_b_validation_report.md
```

---

**Ready to execute V2?**

→ **Quick start**: `./scripts/execute_v2.sh`

→ **Detailed guide**: Read `V2_EXECUTION_PLAN.md`

→ **Questions**: Check `EXECUTION_SUMMARY.md`

---

**Last Updated**: February 3, 2026
**Status**: Ready for execution
**Documentation Version**: 1.0
