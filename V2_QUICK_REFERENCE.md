# 🚀 V2 Execution Quick Reference

**Execute V2 Fundamental Intelligence in 3 ways**

---

## ⚡ Fastest: Automated Script

```bash
# 1. Setup environment
cp .env.example .env
# Edit .env: add DATABASE_URL=postgresql://...

# 2. Run script (handles everything)
./scripts/execute_v2.sh

# Wait ~5 hours (mostly unattended training)
```

---

## 🤖 Best for Production: GitHub Actions

```bash
# 1. Add secrets to GitHub:
#    Settings → Secrets → DATABASE_URL, EODHD_API_KEY, OS_API_KEY

# 2. Trigger workflow:
#    Actions → "V2 Execution" → Run workflow

# 3. Monitor in Actions tab
```

---

## 📖 Step-by-Step: Manual

See **V2_EXECUTION_PLAN.md** for full guide.

Quick version:
```bash
psql $DATABASE_URL -f schemas/fundamentals.sql
psql $DATABASE_URL -f schemas/model_b_ml_signals.sql
psql $DATABASE_URL -f schemas/ensemble_signals.sql

python3 jobs/load_fundamentals.py
python3 jobs/build_extended_feature_set.py
python3 models/train_model_b_fundamentals.py
python3 jobs/generate_signals_model_b.py
python3 jobs/generate_ensemble_signals.py
```

---

## ✅ Verify Success

```bash
# Check data
psql $DATABASE_URL -c "SELECT COUNT(*) FROM ensemble_signals"

# Test API
uvicorn app.main:app --port 8788
curl http://localhost:8788/signals/ensemble/latest

# Test frontend
cd frontend && npm run dev
# Visit http://localhost:3000/models
```

---

## 📊 What You Get

- **Model A** (Momentum) + **Model B** (Fundamentals)
- **Ensemble signals** with conflict detection
- **Quality scores** (A-F) for each stock
- **Smart filtering**: "Show only when models agree"

---

## 🐛 Common Issues

| Error | Fix |
|-------|-----|
| DATABASE_URL not set | Create .env file |
| No fundamental data | Run `python3 jobs/load_fundamentals.py` |
| Training failed | Check `outputs/featureset_extended_latest.parquet` exists |

---

## ⏱️ Time: ~5 hours

- Setup: 15 min
- Data: 30 min
- Features: 1 hour
- **Training: 2 hours** ← Can run unattended ☕
- Signals: 30 min
- Testing: 30 min

---

**Full docs**: V2_EXECUTION_PLAN.md | EXECUTION_SUMMARY.md

**Ready?** → `./scripts/execute_v2.sh`
