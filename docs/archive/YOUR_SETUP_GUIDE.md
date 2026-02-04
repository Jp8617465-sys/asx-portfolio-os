# Your Personalized Setup Guide

**Your Credentials Configured** ✅
- EODHD API Key: `68d8b2f7f26f26.20014269` ✅
- Secure JWT Secret: Generated (64 chars) ✅
- Secure OS API Key: Generated (64 chars) ✅
- Database: Supabase PostgreSQL ✅

---

## ⚡ Quick Start (10 Minutes)

### Step 1: Set Your Supabase Password (1 minute)

Open the `.env` file and replace `YOUR_PASSWORD` with your actual Supabase database password:

```bash
# Edit this file
nano .env

# Find this line:
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.gxjqezqndltaelmyctnl.supabase.co:5432/postgres

# Replace YOUR_PASSWORD with your actual password
DATABASE_URL=postgresql://postgres:your_actual_password@db.gxjqezqndltaelmyctnl.supabase.co:5432/postgres

# Save and exit (Ctrl+X, then Y, then Enter)
```

### Step 2: Load Environment & Test Connection (1 minute)

```bash
# Load environment variables
source .env

# Test database connection
psql "$DATABASE_URL" -c "SELECT version();"
```

**Expected**: Should show PostgreSQL version. If it fails, check your password.

### Step 3: Apply Database Schemas (3 minutes)

```bash
# Create all database tables
bash setup_database.sh
```

**Expected Output**:
```
✅ User accounts schema applied
✅ Notification schema applied
✅ Portfolio management schema applied
✅ Watchlist schema applied
Total user tables: 5
```

### Step 4: Install Dependencies (3 minutes)

```bash
# Backend dependencies
pip install -r requirements.txt

# Frontend dependencies
cd frontend
npm install
cd ..
```

### Step 5: Verify Everything Works (1 minute)

```bash
# Run verification script
bash scripts/verify_production_ready.sh
```

**Expected**: Most checks should pass. Database checks will confirm schemas are applied.

### Step 6: Start the Application (1 minute)

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

**Access Your Application:**
- 🌐 Frontend: http://localhost:3000
- 🔧 Backend API: http://localhost:8788
- 📚 API Docs: http://localhost:8788/docs

---

## 🧪 Test Your Setup

### 1. Health Check
```bash
curl http://localhost:8788/health
```

**Expected:**
```json
{
  "status": "healthy",
  "database": "connected"
}
```

### 2. Register Your First User

**Via Browser:**
1. Go to http://localhost:3000
2. Click "Get Started" or "Sign In"
3. Click "Sign up" link
4. Fill in registration form
5. Submit

**Via Command Line:**
```bash
curl -X POST http://localhost:8788/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "your.email@example.com",
    "password": "YourSecurePassword123!"
  }'
```

**Expected Response:**
```json
{
  "access_token": "eyJ...",
  "user": {
    "user_id": 1,
    "username": "admin",
    "email": "your.email@example.com",
    "is_active": true
  }
}
```

### 3. Test Stock Search
```bash
curl "http://localhost:8788/search?q=BHP"
```

**Expected**: Returns BHP Group and related stocks.

---

## 📊 Your Configured Features

### ✅ Active Features
- User Registration & Authentication (JWT-based)
- Portfolio Upload & Management
- Stock Search
- Watchlist Management
- Model A Signals (Technical Analysis)
- Model B Signals (Fundamental Analysis)
- V2 Ensemble Signals (Combined)
- Signal Reasoning (SHAP explanations)
- Model Drift Monitoring
- Real-time Price Charts
- Notification System

### 🔐 Security Features Enabled
- JWT Authentication (1-hour token expiration)
- Password Hashing (bcrypt)
- Rate Limiting (5 login attempts / 15 minutes)
- User Data Isolation
- Protected Routes
- No Demo Credentials in Production

### 📡 Data Sources
- Stock Prices: EODHD API ✅ (Key configured)
- Fundamentals: EODHD API ✅ (Key configured)
- ML Signals: Generated daily by background jobs

---

## 🔄 Background Jobs (Set Up Later)

These jobs sync stock data and generate signals. You'll set these up once deployed:

```bash
# These run daily at 2 AM UTC:
jobs/sync_live_prices_job.py          # Fetch latest prices
jobs/load_fundamentals_pipeline.py     # Fetch company fundamentals
jobs/generate_signals.py               # Generate Model A signals
jobs/generate_signals_model_b.py       # Generate Model B signals
jobs/generate_ensemble_signals.py      # Combine into ensemble signals

# This runs weekly (Sunday 3 AM):
jobs/audit_drift_job.py                # Monitor model drift
```

For now, you can run these manually to populate data:
```bash
source .env
python3 jobs/sync_live_prices_job.py
python3 jobs/load_fundamentals_pipeline.py
python3 jobs/generate_signals.py
```

---

## 🚀 Next Steps

### Development (You Are Here)
- [x] Configure environment variables
- [x] Set up database
- [x] Install dependencies
- [x] Start application
- [ ] Test user registration
- [ ] Test portfolio upload
- [ ] Test stock search
- [ ] Run background jobs manually to populate data

### Production Deployment (Later)
See `SUPABASE_QUICKSTART.md` for full production deployment guide.

**Quick Production Options:**
1. **Backend**: Railway, Render, or Fly.io
2. **Frontend**: Vercel or Netlify
3. **Jobs**: GitHub Actions or Supabase Edge Functions

---

## 🛠️ Troubleshooting

### "Connection refused" when accessing backend
```bash
# Make sure backend is running:
source .env
uvicorn app.main:app --reload --port 8788
```

### "Database connection failed"
```bash
# Check your password in .env file
# Test connection manually:
psql "postgresql://postgres:YOUR_PASSWORD@db.gxjqezqndltaelmyctnl.supabase.co:5432/postgres" -c "SELECT 1"
```

### Frontend shows "Failed to fetch"
```bash
# Make sure frontend .env.local has correct API URL:
cat frontend/.env.local
# Should show: NEXT_PUBLIC_API_URL=http://localhost:8788
```

### "Table does not exist" errors
```bash
# Re-run database setup:
bash setup_database.sh
```

---

## 📝 Your Environment Summary

```
Database:     Supabase PostgreSQL ✅
              db.gxjqezqndltaelmyctnl.supabase.co:5432

EODHD API:    Configured ✅
              Key: 68d8b2f7f26f26.20014269

Security:     JWT Authentication ✅
              1-hour token expiration
              Rate limiting active

Backend:      FastAPI (Python)
              Port: 8788

Frontend:     Next.js (React)
              Port: 3000

Status:       🟢 Ready to Start!
```

---

## 🎯 Success Checklist

Test these after starting the application:

- [ ] Can access http://localhost:3000
- [ ] Can access http://localhost:8788/docs
- [ ] Health check returns "healthy"
- [ ] Can register a new user
- [ ] Can log in with created user
- [ ] Dashboard loads without errors
- [ ] Stock search works (try "BHP")
- [ ] Can navigate to stock detail page

---

## 📚 Documentation Reference

- **This Guide**: Your personalized quick start
- **Supabase Guide**: `SUPABASE_QUICKSTART.md` - Full Supabase deployment
- **Quick Deploy**: `QUICK_DEPLOY_GUIDE.md` - General deployment guide
- **Security**: `PRODUCTION_SECURITY_CHECKLIST.md` - Security verification
- **User Journeys**: `USER_JOURNEYS.md` - All user flows documented
- **Full Implementation**: `DEPLOYMENT_READY.md` - Complete system overview

---

## 🆘 Need Help?

1. **Check logs**: Backend terminal will show any errors
2. **Verify environment**: Run `bash scripts/verify_production_ready.sh`
3. **Test database**: Run `psql "$DATABASE_URL" -c "SELECT 1"`
4. **Run tests**: Run `pytest tests/test_security.py -v`

---

## 🎉 You're All Set!

Your ASX Portfolio OS is configured and ready to run. Follow Step 1-6 above to start the application.

**Quick Start Command:**
```bash
# 1. Set your Supabase password in .env file (edit YOUR_PASSWORD)
# 2. Then run:
source .env && \
bash setup_database.sh && \
pip install -r requirements.txt && \
cd frontend && npm install && cd .. && \
bash scripts/verify_production_ready.sh
```

**Then start:**
```bash
# Terminal 1:
source .env && uvicorn app.main:app --reload --port 8788

# Terminal 2:
cd frontend && npm run dev
```

**Visit**: http://localhost:3000

Happy trading! 📈
