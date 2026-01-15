# 🚀 Production Deployment Guide

## Overview
This guide covers deploying ASX Portfolio OS to production on Render (backend) + Vercel (frontend) + Supabase (database).

**Estimated Time**: 2-3 hours
**Prerequisites**: GitHub account, Render account, Vercel account, Supabase account

---

## 📋 Pre-Deployment Checklist

### 1. API Keys Required

Obtain these API keys before starting:

| Service | Purpose | Sign Up Link | Cost |
|---------|---------|--------------|------|
| **EODHD** | Market data (prices, fundamentals) | https://eodhd.com | $79.99/mo |
| **NewsAPI** | ASX announcements (Model C) | https://newsapi.org | Free tier OK |
| **Supabase** | PostgreSQL database | https://supabase.com | Free tier OK |
| **OpenAI** | Assistant (optional, paused) | https://platform.openai.com | Optional |
| **FRED** | Macro data (optional) | https://fred.stlouisfed.org | Free |

Generate internal keys:
```bash
# OS_API_KEY (internal auth) - generate random 32-char string
openssl rand -hex 32
```

---

## 🗄️ Step 1: Database Setup (Supabase)

### 1.1 Create Project
1. Go to https://supabase.com/dashboard
2. Create new project: `asx-portfolio-os`
3. Choose region (Sydney for AU)
4. Copy **Database URL** from Settings → Database

### 1.2 Get Connection String
Format should be:
```
REDACTED_DATABASE_URLREDACTEDstgres.xyz:[PASSWORD]@[REGION].supabase.co:5432/postgres
```

**Important**: You'll need this for `DATABASE_URL` environment variable.

### 1.3 Apply Schemas
Option A - Supabase SQL Editor:
1. Go to SQL Editor in Supabase dashboard
2. Paste contents of each file in `schemas/*.sql`
3. Execute in order

Option B - Bootstrap script (after deployment):
```bash
# Schemas will be auto-applied by bootstrap_production.py
```

---

## ☁️ Step 2: Backend Deployment (Render)

### 2.1 Connect GitHub Repository
1. Go to https://dashboard.render.com
2. New → Web Service
3. Connect your GitHub: `Jp8617465-sys/asx-portfolio-os`
4. Select branch: `main` ⚠️ **NOT copilot/add-ci-cd-pipeline-actions**

### 2.2 Configure Service
- **Name**: `asx-portfolio-api`
- **Region**: Oregon (or closest to AU)
- **Branch**: `main`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port 10000`
- **Plan**: Free (or upgrade for better performance)

### 2.3 Set Environment Variables

⚠️ **CRITICAL**: Add these in Render Dashboard → Environment:

#### Required Variables
```bash
DATABASE_URL=REDACTED_DATABASE_URLREDACTEDstgres.xyz:[PASSWORD]@[REGION].supabase.co:5432/postgres
EODHD_API_KEY=your_eodhd_api_key_here
OS_API_KEY=your_generated_32_char_key_here
NEWS_API_KEY=your_newsapi_key_here
```

#### Optional Variables (Recommended)
```bash
FRED_API_KEY=your_fred_api_key
MODEL_C_TICKERS=BHP,CBA,CSL,WES,FMG,WBC,RIO,NAB,ANZ,TLS
MODEL_C_NEWS_LIMIT=50
MODEL_C_NEWS_QUERY=ASX Australia
EODHD_NEWS_PREFIX=ASX
```

#### Optional (Assistant - Paused)
```bash
OPENAI_API_KEY=sk-...
ENABLE_ASSISTANT=false
```

### 2.4 Deploy
1. Click "Create Web Service"
2. Wait for build (~3-5 minutes)
3. Test health endpoint: `https://your-app.onrender.com/health`

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-15T..."
}
```

### 2.5 Configure Cron Jobs

Render auto-detects `render.yaml` which defines 5 cron jobs:
- **asx-daily-prices**: 11:00 UTC (9PM AEST) - Daily price updates
- **asx-daily-announcements**: 20:30 UTC (6:30AM AEST) - News scraping
- **asx-weekly-fundamentals**: 17:00 UTC Mon (3AM AEST Tue) - Fundamentals
- **asx-weekly-features**: 16:00 UTC Sun (2AM AEST Mon) - Feature engineering
- **asx-weekly-drift**: 18:00 UTC Sun (4AM AEST Mon) - Drift monitoring

These should appear automatically in Render Dashboard → Cron Jobs.

---

## 🌐 Step 3: Frontend Deployment (Vercel)

### 3.1 Fix Branch Configuration ⚠️

**YOUR CURRENT ISSUE**: Vercel is deploying from wrong branch.

1. Go to https://vercel.com/dashboard
2. Select your project
3. Settings → Git
4. **Production Branch**: Change from `copilot/add-ci-cd-pipeline-actions` to `main`
5. Click "Save"

### 3.2 Configure Build Settings
- **Framework Preset**: Next.js
- **Root Directory**: `frontend` ⚠️ **CRITICAL**
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)

### 3.3 Set Environment Variables

In Vercel → Settings → Environment Variables:

```bash
NEXT_PUBLIC_API_URL=https://your-app.onrender.com
NEXT_PUBLIC_OS_API_KEY=your_os_api_key_here
```

### 3.4 Redeploy
1. Deployments → Click latest deployment
2. Click "..." menu → Redeploy
3. ✅ Check "Use existing Build Cache" (optional, faster)
4. Click "Redeploy"

### 3.5 Validate
Visit your Vercel URL (e.g., `https://asx-portfolio-os.vercel.app`)

Expected: Dashboard loads with "Connecting to API..." or data if backend populated.

---

## 🏗️ Step 4: Initial Data Population

### 4.1 SSH into Render (or run locally)

If running locally with production DATABASE_URL:
```bash
# Set env vars in .env
export DATABASE_URL="REDACTED_DATABASE_URLREDACTED"
export EODHD_API_KEY="..."
export OS_API_KEY="..."
```

### 4.2 Run Bootstrap Script

```bash
# Validate environment only (quick check)
python scripts/bootstrap_production.py --validate-only

# Full bootstrap (30-60 minutes)
python scripts/bootstrap_production.py --full

# Skip price backfill if you want to populate incrementally
python scripts/bootstrap_production.py --full --skip-backfill
```

**What it does**:
1. ✅ Validates all environment variables
2. ✅ Tests database connection
3. ✅ Applies all schemas from `schemas/*.sql`
4. ✅ Populates universe (ASX 200/300 tickers)
5. ✅ Backfills 2 years of historical prices
6. ✅ Loads fundamentals from EODHD
7. ✅ Derives technical & fundamental features
8. ✅ Validates data integrity

### 4.3 Alternative: Manual Population

If bootstrap fails, run jobs individually:

```bash
# 1. Universe
python jobs/refresh_universe.py

# 2. Historical prices (adjust --days as needed)
python jobs/backfill_prices.py --days 730  # 2 years

# 3. Fundamentals
python scripts/cron_weekly_fundamentals.py

# 4. Features
python scripts/cron_weekly_features.py

# 5. Announcements (optional)
python scripts/cron_daily_announcements.py
```

---

## 🤖 Step 5: Model Training

### 5.1 Train Model A (ML)

```bash
# Standard training with cross-validation
python jobs/train_model_a_ml.py

# With hyperparameter tuning (slower, better results)
python jobs/train_model_a_ml.py --tune-hyperparams --n-trials 50

# Quick test (1 fold, no tuning)
python jobs/train_model_a_ml.py --cv 1
```

Expected output:
```
✅ Classifier ROC-AUC: 0.56-0.65
✅ Regressor RMSE: 15-20%
💾 Models saved to models/model_a_*.pkl
```

### 5.2 Run Backtest Validation

```bash
# Walk-forward backtest (18 months train, 1 month test, rolling)
python jobs/backtest_model_a_ml.py --train-months 18 --test-months 1

# Quick backtest (single period)
python jobs/backtest_model_a_ml.py --train-months 18 --test-months 6 --mode single
```

Expected output:
```
📊 Backtest Results:
   Total Return: 15-25%
   Sharpe Ratio: 0.8-1.5
   Max Drawdown: -15 to -25%
   Win Rate: 55-65%
```

### 5.3 Upload Model Artifacts (Optional)

If you want models available on Render:
```bash
# Models are large (10-50MB), consider:
# Option A: Store in Supabase Storage
# Option B: Use S3/R2 and load on-demand
# Option C: Retrain on Render periodically
```

---

## ✅ Step 6: Deployment Validation

### 6.1 Run Validation Script

```bash
python scripts/validate_deployment.py --url https://your-app.onrender.com
```

This checks:
- ✅ Health endpoint responding
- ✅ Database tables exist with data
- ✅ API endpoints return valid responses
- ✅ Cron jobs configured
- ✅ Model artifacts available

### 6.2 Manual Endpoint Checks

```bash
# Health check
curl https://your-app.onrender.com/health

# Model status
curl -H "x-api-key: YOUR_OS_API_KEY" \
  https://your-app.onrender.com/model/status/summary

# Live signals
curl -H "x-api-key: YOUR_OS_API_KEY" \
  https://your-app.onrender.com/signals/live

# Dashboard data
curl -H "x-api-key: YOUR_OS_API_KEY" \
  "https://your-app.onrender.com/dashboard/model_a_v1_1?as_of=2026-01-15"
```

---

## 🔧 Step 7: Post-Deployment Configuration

### 7.1 Set Up Monitoring

**Option A - Render Built-in**:
- Dashboard → Metrics (CPU, Memory, Response Time)
- Enable email alerts for downtime

**Option B - External (Recommended)**:
- **Better Uptime**: Free tier, 60s checks
- **Sentry**: Error tracking (Python + Next.js)
- **DataDog**: Full observability (paid)

### 7.2 Configure Alerts

Set up alerts for:
- API downtime (> 5 minutes)
- Database connection failures
- Cron job failures
- High drift scores (> 0.3 PSI)
- Model performance degradation

### 7.3 Cost Monitoring

Track monthly costs:
- Render: $0 (free) or $7/mo (starter)
- Vercel: $0 (hobby) or $20/mo (pro)
- Supabase: $0 (free) or $25/mo (pro)
- EODHD: $79.99/mo
- NewsAPI: $0 (free tier)
- **Total**: ~$80-130/mo

---

## 📊 Step 8: Operational Readiness

### 8.1 Daily Checklist
- [ ] Check `/health` endpoint
- [ ] Review cron job logs
- [ ] Monitor API response times
- [ ] Check error rates in logs

### 8.2 Weekly Checklist
- [ ] Review drift monitoring alerts
- [ ] Check model performance metrics
- [ ] Validate signal quality
- [ ] Review fundamentals ingestion
- [ ] Check database growth

### 8.3 Monthly Checklist
- [ ] Retrain Model A with latest data
- [ ] Run comprehensive backtest
- [ ] Review feature importance changes
- [ ] Audit data quality
- [ ] Performance optimization review

---

## 🐛 Troubleshooting

### Issue: Vercel Deploys Old Commit
**Solution**: See Step 3.1 - Change production branch to `main`

### Issue: Render "Bad Gateway" 502
**Causes**:
- Cold start (free tier spins down after 15 min idle)
- App crashed (check logs)
- Database connection failed

**Solutions**:
```bash
# Check logs
render logs --tail

# Restart service
render restart
```

### Issue: No Data in Database
**Causes**:
- Bootstrap script failed
- Cron jobs not running
- API keys invalid

**Solutions**:
```bash
# Re-run bootstrap
python scripts/bootstrap_production.py --validate-only  # Check env
python scripts/bootstrap_production.py --full          # Full run

# Check API keys
curl "https://eodhd.com/api/eod/AAPL.US?api_token=YOUR_KEY"
```

### Issue: Model Performance Poor
**Expected**: ROC-AUC 0.56-0.62 is typical for quant models
**Improvements**:
- Add fundamentals (Model B features)
- Add NLP signals (Model C)
- Hyperparameter tuning: `--tune-hyperparams`
- Ensemble methods
- Feature engineering iteration

### Issue: High Database Costs
**Solutions**:
- Archive old price data (> 3 years)
- Use parquet files for feature store
- Aggregate fundamentals to weekly snapshots
- Prune unused tables

---

## 📚 Additional Resources

- **API Documentation**: `https://your-app.onrender.com/docs`
- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **GitHub Issues**: https://github.com/Jp8617465-sys/asx-portfolio-os/issues

---

## ✅ Deployment Complete!

Once all steps pass:
1. ✅ Backend API responding
2. ✅ Frontend deployed from `main` branch
3. ✅ Database populated with 18+ months data
4. ✅ Models trained and validated
5. ✅ Cron jobs running
6. ✅ Monitoring configured

**You're production-ready!** 🎉

Next: Monitor for 1-2 weeks, iterate on model performance, add Models B/C features.
