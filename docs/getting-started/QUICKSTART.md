# Quick Start Guide

Get ASX Portfolio OS running locally or deployed to production.

---

## Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL client (psql)
- Supabase account (or local PostgreSQL)
- EODHD API key (for stock data)

---

## Local Development (5 Minutes)

### Step 1: Environment Setup

```bash
# Copy example environment file
cp .env.example .env

# Edit .env and set your values:
# - DATABASE_URL: Your Supabase connection string
# - EODHD_API_KEY: Your EODHD API key
# - JWT_SECRET_KEY: Generate with `openssl rand -hex 32`
# - OS_API_KEY: Generate with `openssl rand -hex 32`
```

Or use the interactive setup script:
```bash
bash setup_supabase_env.sh
```

### Step 2: Install Dependencies

```bash
# Backend
pip install -r requirements.txt

# Frontend
cd frontend && npm install && cd ..
```

### Step 3: Apply Database Schemas

```bash
source .env
bash setup_database.sh
```

### Step 4: Start the Application

**Terminal 1 - Backend:**
```bash
source .env
uvicorn app.main:app --reload --port 8788
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Access Your Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:8788
- API Documentation: http://localhost:8788/docs

---

## Verify Your Setup

### 1. Health Check
```bash
curl http://localhost:8788/health
```
**Expected**: `{"status": "healthy", "database": "connected"}`

### 2. Register a User
```bash
curl -X POST http://localhost:8788/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```
**Expected**: Returns `access_token` and user object.

### 3. Test Stock Search
```bash
curl "http://localhost:8788/search?q=BHP"
```
**Expected**: Returns BHP Group and related stocks.

---

## Populate Data (Optional)

Run these jobs to sync stock data and generate signals:

```bash
source .env

# Sync latest prices
python3 jobs/sync_live_prices_job.py

# Load fundamentals
python3 jobs/load_fundamentals_pipeline.py

# Generate signals
python3 jobs/generate_signals.py
python3 jobs/generate_signals_model_b.py
python3 jobs/generate_ensemble_signals.py
```

---

## Production Deployment

### Deploy Backend (Render)

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 4`
5. Add environment variables in dashboard

### Deploy Frontend (Vercel)

1. Go to https://vercel.com/dashboard
2. Import your repository
3. Set **Root Directory** to `frontend`
4. Add environment variables:
   - `NEXT_PUBLIC_API_URL`: Your backend URL
   - `NEXT_PUBLIC_API_KEY`: Your OS API key

### Background Jobs

Set up daily jobs via GitHub Actions, cron, or Supabase Edge Functions. Jobs run at 2 AM UTC:

- `jobs/sync_live_prices_job.py` - Fetch latest prices
- `jobs/load_fundamentals_pipeline.py` - Fetch fundamentals
- `jobs/generate_signals.py` - Model A signals
- `jobs/generate_signals_model_b.py` - Model B signals
- `jobs/generate_ensemble_signals.py` - Ensemble signals

---

## Supabase Configuration

### Test Connection
```bash
source .env
psql "$DATABASE_URL" -c "SELECT version();"
```

### Connection Pooling (Production)
```bash
# Transaction mode (recommended)
DATABASE_URL="postgresql://postgres:PASSWORD@db.xxx.supabase.co:6543/postgres?pgbouncer=true"
```

### Add Performance Indexes
```sql
CREATE INDEX idx_user_watchlist_user_id ON user_watchlist(user_id);
CREATE INDEX idx_user_holdings_user_id ON user_holdings(user_id);
CREATE INDEX idx_prices_ticker_date ON prices(ticker, dt);
CREATE INDEX idx_signals_symbol_date ON model_a_ml_signals(symbol, as_of);
```

---

## Features

### Authentication
- JWT-based authentication (1-hour token expiration)
- Password hashing (bcrypt)
- Rate limiting (5 login attempts / 15 minutes)
- Protected routes

### Portfolio Management
- Upload portfolio CSV
- View holdings with current prices
- Buy/sell/hold signals per stock
- Rebalancing suggestions

### Stock Research
- Search by symbol or name
- Price charts (90 days)
- Model A signals (technical)
- Model B signals (fundamental)
- Ensemble signals (combined)
- Signal reasoning (SHAP)

### ML Pipeline
- EODHD data integration
- 75-85% test coverage
- Model drift monitoring

---

## Troubleshooting

### Backend won't start
```bash
# Verify environment is loaded
source .env

# Check if port 8788 is in use
lsof -i :8788
kill -9 <PID>
```

### Frontend won't start
```bash
cd frontend
rm -rf .next node_modules
npm install
npm run dev
```

### Database connection failed
```bash
# Test connection directly
psql "$DATABASE_URL" -c "SELECT 1"

# Check password in .env
# Verify Supabase project is active
```

### "Table does not exist"
```bash
# Re-run schema setup
bash setup_database.sh
```

### API calls fail from frontend
```bash
# Verify frontend env
cat frontend/.env.local
# Should show: NEXT_PUBLIC_API_URL=http://localhost:8788
```

---

## Success Checklist

- [ ] http://localhost:3000 loads
- [ ] http://localhost:8788/docs loads
- [ ] Health check returns "healthy"
- [ ] Can register a new user
- [ ] Can log in
- [ ] Dashboard loads
- [ ] Stock search works
- [ ] Can view stock detail pages
- [ ] Can add to watchlist

---

## Next Steps

1. **Run verification**: `bash scripts/verify_production_ready.sh`
2. **Run tests**: `pytest tests/ -v`
3. **Populate data**: Run the background jobs above
4. **Deploy**: See [DEPLOYMENT.md](../guides/DEPLOYMENT.md)
