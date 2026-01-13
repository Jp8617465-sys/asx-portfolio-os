# ASX Portfolio OS

AI-driven portfolio and model management platform for ASX equities.

## Stack
- Backend: FastAPI + Python (Render)
- Frontend: Next.js (Vercel)
- Database: Postgres (Supabase)

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
- `GET /health`
- `GET /model/status/summary`
- `GET /drift/summary`
- `GET /model/explainability`
- `GET /dashboard/model_a_v1_1`
- `POST /assistant/chat`

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
