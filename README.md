# ASX Portfolio OS

AI-driven momentum trading signal platform for ASX equities.

**Version:** 1.0.0-rc1 (Production Release Candidate)

## Stack
- Backend: FastAPI + Python (Render)
- Frontend: Next.js 14 + TypeScript (Vercel)
- Database: PostgreSQL (Supabase)
- ML: LightGBM, scikit-learn, SHAP
- Infrastructure: Rate limiting, connection pooling, Sentry error tracking

## Features

### ✅ Production Ready (V1)
- **Model A (Technical Analysis)**: LightGBM ensemble for momentum-based buy/sell signals
  - Daily signal generation (STRONG_BUY, BUY, HOLD, SELL, STRONG_SELL)
  - Features: 12-month momentum, volatility, trend, volume indicators
  - Walk-forward validation with time-series splits
- **Portfolio Management**: CSV upload, holdings tracking, rebalancing suggestions
- **Live Signals API**: Real-time access to ranked ASX stock signals
- **Job Monitoring**: Track pipeline executions with success/failure rates
- **Risk Metrics**: Sharpe ratio, volatility, max drawdown tracking

### 🚧 Coming Soon (Phase 2)
- **Model B (Fundamentals)**: P/E, revenue growth, debt ratios integration
- **Model C (Sentiment)**: NLP analysis of ASX announcements
- **Ensemble Strategy**: Multi-model signal combination
- **Advanced Drift Monitoring**: PSI-based feature drift detection UI
- **Multi-Asset Fusion**: Property and loan portfolio integration

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
- `GET /health` - Service health check and database connectivity
- `GET /dashboard/model_a_v1_1` - Model A ranked signals (production)
- `GET /signals/live` - Current buy/sell signals for all ASX stocks
- `POST /portfolio/upload` - Upload portfolio CSV
- `GET /portfolio/holdings` - View current holdings with signals
- `GET /portfolio/rebalancing` - Get AI-powered rebalancing suggestions
- `GET /jobs/history` - Pipeline execution history
- `GET /model/status/summary` - Model performance metrics
## Pipeline Jobs

### Daily Operations (Production)
- `jobs/sync_live_prices_job.py` - Ingest latest ASX prices from EODHD
- `jobs/build_extended_feature_set.py` - Compute technical features
- `jobs/generate_signals.py` - Run Model A inference and rank stocks
- `jobs/portfolio_fusion_job.py` - Update portfolio metrics

### Model Training & Analysis
- `models/train_model_a_ml.py` - Train/retrain Model A with walk-forward validation
- `jobs/backtest_model_a_ml.py` - Backtest Model A on historical data
- `jobs/export_feature_importance.py` - SHAP feature importance analysis

### Future Pipeline (Phase 2)
- `jobs/ingest_fundamentals_job.py` - EODHD fundamentals (prepared)
- `jobs/ingest_asx_announcements_job.py` - ASX announcements (prepared)
- `jobs/audit_drift_job.py` - Feature drift detection (infrastructure ready)

## What's in V1 vs Roadmap

**V1 Production (Current)**:
- Model A momentum signals (technical analysis only)
- Portfolio upload and tracking
- Daily signal generation
- Risk metrics and rebalancing suggestions
- Job monitoring and health checks

**Phase 2 Roadmap**:
- Model B: Fundamentals integration (P/E, revenue, debt)
- Model C: Sentiment analysis (NLP on announcements)
- Ensemble strategy combining A+B+C
- Advanced drift monitoring with PSI scores
- Multi-asset portfolio fusion (property + loans)

**Paused Features**:
- OpenAI Assistant (`/assistant/chat` returns 503)

## Database Schema

**Schema Refactoring (2026-02-03)**:
- ✅ **Foreign Key Constraints**: All ticker/symbol references now enforce referential integrity via `stock_universe` table
- ✅ **Timezone-Aware Timestamps**: All `TIMESTAMP` columns converted to `TIMESTAMPTZ`
- ✅ **Performance Indexes**: Composite indexes for common query patterns (15+ new indexes)
- ✅ **Update Triggers**: Auto-update `updated_at` columns on all tables
- 📚 **Documentation**: See `schemas/README.md` for full migration guide
- 🚀 **Migration Scripts**: Use `scripts/run_migrations.sh` to apply changes

**Production Tables (Active)**:
- `stock_universe` - **NEW** Canonical reference table for all ASX tickers
- `user_accounts`, `user_portfolios`, `user_holdings` - Portfolio management
- `prices` - Historical ASX price data (1.2M rows)
- `model_a_ml_signals`, `model_b_ml_signals`, `model_c_sentiment_signals` - AI signals
- `ensemble_signals` - Combined multi-model signals
- `model_a_features_extended` - Pre-computed features for optimization
- `model_a_drift_audit` - Feature drift monitoring
- `portfolio_fusion` - Portfolio tracking
- `portfolio_attribution` - Portfolio analytics
- `job_history` - Pipeline execution tracking
- `model_feature_importance` - SHAP feature importance
- `fundamentals` - Fundamentals data (prepared for Phase 2)
- `news_sentiment` - News sentiment analysis
- `notifications`, `alert_preferences` - User notifications
- `user_watchlist` - User stock watchlists

**Archived Tables**: 17 unused tables moved to `schemas/archive/` (RL experiments, property assets, unused model tables)

**Schema Management**:
```bash
# Apply all schemas and migrations
bash setup_database.sh

# Or apply migrations individually
bash scripts/run_migrations.sh

# Test migrations without applying
bash scripts/run_migrations.sh --dry-run

# Clean up unused tables
psql $DATABASE_URL -f schemas/cleanup_unused_tables.sql
```

## Deployment Notes
- Render uses `Dockerfile` with `requirements.txt`
- Vercel deploys the `frontend/` app
- Vercel settings: Root Directory `frontend`, Production Branch `main`, and ensure `.vercelignore` keeps `frontend/app` via `!/frontend/app/**`
- If Vercel logs show an old commit, redeploy with "Use current branch" + "Clear cache"; if it persists, reconnect the GitHub integration
