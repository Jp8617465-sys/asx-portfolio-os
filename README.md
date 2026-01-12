# ASX Portfolio OS

[![Vercel Deployment](https://vercel.com/jp8617465-sys-projects/frontend/badge)](https://frontend-drab-five-65.vercel.app)

AI-driven portfolio and model management platform. The FastAPI backend runs on Render, while the Next.js frontend is deployed on Vercel.

## Live URLs

- Frontend (Vercel): https://frontend-drab-five-65.vercel.app
- Backend (Render): https://asx-portfolio-os.onrender.com

## Architecture

- `frontend/`: Next.js App Router UI (Vercel deploy target)
- `app/`, `jobs/`, `models/`: FastAPI + ML pipeline (Render deploy target)

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Environment variables (frontend):

```bash
NEXT_PUBLIC_API_URL=https://asx-portfolio-os.onrender.com
OS_API_KEY=your_api_key_here
```

## Backend testing

Smoke test the running API:

```bash
pip install pytest requests
OS_API_KEY="YOUR_KEY" AS_OF="2025-12-31" BASE_URL="http://127.0.0.1:8790" pytest -q
```

## Deploy (Vercel)

From repo root:

```bash
npx vercel --prod --cwd frontend --yes
```
