# ASX Portfolio OS

AI-driven portfolio and model management platform for ASX equities with multi-asset fusion.

**Version:** 0.4.0 (Phase 8 Complete)

## Stack
- Backend: FastAPI + Python (Render)
- Frontend: Next.js (Vercel)
- Database: Postgres (Supabase)
- ML: LightGBM, scikit-learn, SHAP
- RL: Stable-Baselines3 (optional)

## Features

### ✅ Core Models
- **Model A (Quant ML)**: LightGBM classifier/regressor for price predictions
- **Model B (Fundamentals)**: Feature derivation from EODHD fundamentals
- **Model C (NLP)**: Sentiment analysis on ASX announcements

### ✅ Portfolio Intelligence (Phase 8)
- **Portfolio Fusion**: Unified view across equities, property, and loans
- **Risk Analysis**: Debt service ratio, leverage, risk scoring
- **Asset Allocation**: Dynamic allocation tracking by class

### ✅ Monitoring & Operations
- **Job History**: Track all pipeline executions with success/failure rates
- **Drift Monitoring**: PSI-based feature drift detection with alerts
- **Explainability**: SHAP-based model interpretability

### 🚧 Experimental (Phase 2)
- **RL Sandbox**: Reinforcement learning for portfolio optimization
- **Custom Gym Environment**: ASX-specific trading environment

## Quickstart
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` with the required variables:
```
DATABASE_URL=postgresql://user:pass@host:5432/db
EODHD_API_KEY=your_eodhd_key
NEWS_API_KEY=your_newsapi_key
OS_API_KEY=your_os_api_key
OPENAI_API_KEY=your_openai_key
ENABLE_ASSISTANT=true
```

Run the API:
```bash
uvicorn app.main:app --reload --port 8788
```

## Core Endpoints
- `GET /health` - Service health check
- `GET /model/status/summary` - Model performance summary
- `GET /drift/summary` - Drift monitoring dashboard
- `GET /model/explainability` - SHAP-based feature importance
- `GET /dashboard/model_a_v1_1` - Model A dashboard
- `POST /assistant/chat` - AI assistant (paused - see note below)

## Portfolio Fusion (New in v0.4.0)
- `GET /portfolio/overview` - Unified portfolio snapshot
- `GET /portfolio/risk` - Risk analysis and metrics
- `GET /portfolio/allocation` - Asset allocation breakdown
### Data Ingestion
- `jobs/ingest_fundamentals_job.py` - EODHD fundamentals
- `jobs/ingest_asx_announcements_job.py` - NLP news feed
- `jobs/ingest_loan_job.py` - Loan account data
- `jobs/ingest_etf_job.py` - ETF holdings
- `jobs/ingest_macro_job.py` - Macro economic indicators

### Feature Engineering
- `jobs/build_extended_feature_set.py` - Unified feature pipeline
- `jobs/derive_fundamentals_features.py` - Fundamental scoring
- `jobs/export_feature_importance.py` - SHAP importance

### Analytics & Monitoring
- `jobs/portfolio_fusion_job.py` - **NEW:** Unified portfolio metrics
- `jobs/audit_drift_job.py` - Feature drift detection
- `jobs/compute_risk_snapshot_job.py` - Risk analytics

### Machine Learning
- `jobs/run_model_a_job.py` - Model A predictions
- `jobs/backtest_model_a_ml.py` - Backtesting
- `jobs/train_rl_agent.py` - **NEW:** RL training (experimental)regated statistics
- `GET /jobs/health` - Job health monitoring

## Feature Status
**OpenAI Assistant (PAUSED):** The conversational AI assistant feature (`/assistant/chat`) is currently on pause. The `OPENAI_API_KEY` and `ENABLE_ASSISTANT` environment variables are not required until this feature is reactivated.

## Key Jobs
- `jobs/ingest_fundamentals_job.py`
- `jobs/ingest_asx_announcements_job.py`
- `jobs/build_extended_feature_set.py`
- `jobs/export_feature_importance.py`
- `jobs/audit_drift_job.py`

## Deployment Notes
- Render uses `Dockerfile` with `requirements.txt`.
- Vercel deploys the `frontend/` app.
- Vercel settings: Root Directory `frontend`, Production Branch `main`, and ensure `.vercelignore` keeps `frontend/app` via `!/frontend/app/**`.
- If Vercel logs show an old commit, redeploy with “Use current branch” + “Clear cache”; if it persists, reconnect the GitHub integration.
