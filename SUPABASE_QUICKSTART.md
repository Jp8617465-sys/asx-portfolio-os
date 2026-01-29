# ASX Portfolio OS - Supabase Deployment Guide

**Database**: Supabase PostgreSQL
**Estimated Time**: 20-30 minutes
**Status**: Production Ready ✅

---

## Prerequisites

- [x] Supabase account with database created
- [x] Database URL: `postgresql://postgres:[PASSWORD]@db.gxjqezqndltaelmyctnl.supabase.co:5432/postgres`
- [ ] EODHD API key (for stock data)
- [ ] Python 3.10+ installed
- [ ] Node.js 18+ installed
- [ ] PostgreSQL client (psql) installed

---

## Quick Start (5 Steps)

### Step 1: Environment Setup (2 minutes)

Run the interactive setup script:

```bash
bash setup_supabase_env.sh
```

This will:
- Prompt for your Supabase password
- Generate secure JWT_SECRET_KEY and OS_API_KEY
- Prompt for EODHD API key
- Create `.env` file with all configuration

**Manual Alternative:**
```bash
# Copy example
cp .env.example .env

# Edit .env and set:
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.gxjqezqndltaelmyctnl.supabase.co:5432/postgres"
JWT_SECRET_KEY="$(openssl rand -hex 32)"
OS_API_KEY="$(openssl rand -hex 32)"
EODHD_API_KEY="your-eodhd-key"
```

---

### Step 2: Test Database Connection (1 minute)

```bash
# Load environment variables
source .env

# Test connection
psql "$DATABASE_URL" -c "SELECT version();"
```

**Expected Output:**
```
                                                version
-------------------------------------------------------------------------------------------------------
 PostgreSQL 15.x on x86_64-pc-linux-gnu, compiled by gcc (Ubuntu 9.4.0-1ubuntu1~20.04.1) 9.4.0, 64-bit
(1 row)
```

**If connection fails:**
- Check your password is correct
- Verify Supabase project is active
- Check firewall/network settings

---

### Step 3: Apply Database Schemas (3 minutes)

```bash
bash setup_database.sh
```

This will create all required tables:
- `user_accounts` - User authentication
- `user_portfolios` - Portfolio data
- `user_holdings` - Stock positions
- `user_watchlist` - Saved stocks
- `user_notifications` - Alert system
- Plus all ML signal tables

**Manual Alternative:**
```bash
# Apply each schema
python3 scripts/apply_user_schema.py
python3 scripts/apply_notification_schema.py
psql "$DATABASE_URL" < schemas/portfolio_management.sql
psql "$DATABASE_URL" < schemas/watchlist.sql

# Verify
psql "$DATABASE_URL" -c "\dt user_*"
```

---

### Step 4: Install Dependencies (5 minutes)

```bash
# Backend dependencies
pip install -r requirements.txt

# Frontend dependencies
cd frontend
npm install
cd ..
```

---

### Step 5: Verify & Start (2 minutes)

```bash
# Run verification
bash scripts/verify_production_ready.sh

# Run security tests
pytest tests/test_security.py -v

# Start backend (development mode)
uvicorn app.main:app --reload --port 8788
```

In a new terminal:
```bash
# Start frontend
cd frontend
npm run dev
```

**Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8788
- API Docs: http://localhost:8788/docs

---

## Verify Deployment

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

### 2. Register Test User
```bash
curl -X POST http://localhost:8788/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser1",
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

**Expected:**
```json
{
  "access_token": "eyJ...",
  "user": {
    "user_id": 1,
    "username": "testuser1",
    "email": "test@example.com"
  }
}
```

### 3. Test Authentication
```bash
# Save token from previous response
TOKEN="eyJ..."

# Test authenticated endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8788/watchlist
```

**Expected:**
```json
{
  "items": []
}
```

### 4. Test Stock Search
```bash
curl "http://localhost:8788/search?q=BHP"
```

**Expected:**
```json
{
  "results": [
    {
      "symbol": "BHP.AX",
      "name": "BHP Group Ltd",
      "market_cap": 145000000000
    }
  ]
}
```

---

## Supabase-Specific Configuration

### Enable Row Level Security (Optional but Recommended)

Connect to Supabase dashboard or via SQL:

```sql
-- Enable RLS on user tables
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies (example for user_portfolios)
CREATE POLICY "Users can view own portfolios"
  ON user_portfolios FOR SELECT
  USING (user_id = current_setting('app.current_user_id')::INTEGER);

CREATE POLICY "Users can insert own portfolios"
  ON user_portfolios FOR INSERT
  WITH CHECK (user_id = current_setting('app.current_user_id')::INTEGER);

CREATE POLICY "Users can update own portfolios"
  ON user_portfolios FOR UPDATE
  USING (user_id = current_setting('app.current_user_id')::INTEGER);

CREATE POLICY "Users can delete own portfolios"
  ON user_portfolios FOR DELETE
  USING (user_id = current_setting('app.current_user_id')::INTEGER);
```

**Note:** This adds an extra security layer at the database level. The application already enforces user isolation via JWT tokens.

### Supabase Connection Pooling

For production, use Supabase's connection pooler:

```bash
# Transaction mode (recommended)
DATABASE_URL="postgresql://postgres:PASSWORD@db.gxjqezqndltaelmyctnl.supabase.co:6543/postgres?pgbouncer=true"

# Session mode (if using complex transactions)
DATABASE_URL="postgresql://postgres:PASSWORD@db.gxjqezqndltaelmyctnl.supabase.co:5432/postgres"
```

### Supabase Database Extensions

Ensure required extensions are enabled in Supabase dashboard:

1. Go to Database → Extensions
2. Enable:
   - `pg_stat_statements` (performance monitoring)
   - `uuid-ossp` (UUID generation, if needed)

---

## Background Jobs Setup

These jobs sync data and generate signals daily.

### Option 1: GitHub Actions (Recommended for Supabase)

Create `.github/workflows/daily-jobs.yml`:

```yaml
name: Daily Data Sync

on:
  schedule:
    # 2 AM UTC daily
    - cron: '0 2 * * *'
  workflow_dispatch: # Manual trigger

jobs:
  sync-data:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Sync Prices
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          EODHD_API_KEY: ${{ secrets.EODHD_API_KEY }}
        run: python3 jobs/sync_live_prices_job.py

      - name: Load Fundamentals
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          EODHD_API_KEY: ${{ secrets.EODHD_API_KEY }}
        run: python3 jobs/load_fundamentals_pipeline.py

      - name: Generate Model A Signals
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: python3 jobs/generate_signals.py

      - name: Generate Model B Signals
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: python3 jobs/generate_signals_model_b.py

      - name: Generate Ensemble Signals
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: python3 jobs/generate_ensemble_signals.py
```

### Option 2: Supabase Edge Functions

Create edge functions in Supabase for scheduled jobs:

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize
supabase init

# Create edge function
supabase functions new daily-sync
```

### Option 3: Cron Job (VPS/Server)

```bash
# Edit crontab
crontab -e

# Add jobs
0 2 * * * cd /app/asx-portfolio-os && source .env && python3 jobs/sync_live_prices_job.py
5 2 * * * cd /app/asx-portfolio-os && source .env && python3 jobs/load_fundamentals_pipeline.py
10 2 * * * cd /app/asx-portfolio-os && source .env && python3 jobs/generate_signals.py
15 2 * * * cd /app/asx-portfolio-os && source .env && python3 jobs/generate_signals_model_b.py
20 2 * * * cd /app/asx-portfolio-os && source .env && python3 jobs/generate_ensemble_signals.py
0 3 * * 0 cd /app/asx-portfolio-os && source .env && python3 jobs/audit_drift_job.py
```

---

## Production Deployment

### Deploy Backend (Recommended: Railway, Render, or Fly.io)

#### Railway:
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create project
railway init

# Set environment variables
railway variables set DATABASE_URL="postgresql://..."
railway variables set JWT_SECRET_KEY="..."
railway variables set OS_API_KEY="..."
railway variables set EODHD_API_KEY="..."

# Deploy
railway up
```

#### Render:
1. Connect GitHub repository
2. Create new Web Service
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 4`
5. Add environment variables in dashboard

### Deploy Frontend (Recommended: Vercel)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd frontend
vercel

# Set environment variables in Vercel dashboard
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

---

## Database Monitoring

### Supabase Dashboard

1. Go to Supabase → Database → Logs
2. Monitor slow queries
3. Check connection pool usage

### Query Performance

```sql
-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Active connections
SELECT count(*) FROM pg_stat_activity;
```

### User Activity

```sql
-- Registrations today
SELECT COUNT(*) FROM user_accounts
WHERE created_at > CURRENT_DATE;

-- Active users (logged in today)
SELECT COUNT(*) FROM user_accounts
WHERE last_login_at > CURRENT_DATE;

-- Watchlist growth
SELECT DATE(added_at), COUNT(*) as adds
FROM user_watchlist
WHERE added_at > CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(added_at)
ORDER BY DATE(added_at);
```

---

## Troubleshooting

### Connection Issues

**Error**: "could not connect to server"
```bash
# Check Supabase status
https://status.supabase.com/

# Test from different network
psql "$DATABASE_URL" -c "SELECT 1"

# Check if IP is blocked (Supabase allows all by default)
```

**Error**: "password authentication failed"
```bash
# Reset password in Supabase dashboard
# Update .env file with new password
source .env
```

### Schema Issues

**Error**: "relation does not exist"
```bash
# Re-apply schemas
bash setup_database.sh

# Verify tables exist
psql "$DATABASE_URL" -c "\dt"
```

### Performance Issues

**Slow queries**:
```sql
-- Add indexes
CREATE INDEX idx_user_watchlist_user_id ON user_watchlist(user_id);
CREATE INDEX idx_user_holdings_user_id ON user_holdings(user_id);
CREATE INDEX idx_user_portfolios_user_id ON user_portfolios(user_id);
CREATE INDEX idx_prices_ticker_date ON prices(ticker, dt);
CREATE INDEX idx_signals_symbol_date ON model_a_ml_signals(symbol, as_of);
```

---

## Security Checklist

Before going live:

- [ ] JWT_SECRET_KEY is secure (32+ hex characters)
- [ ] OS_API_KEY is secure (not shared publicly)
- [ ] Database password is strong
- [ ] EODHD_API_KEY is kept secret
- [ ] Supabase project has strong password
- [ ] Rate limiting is active (test with `bash scripts/verify_production_ready.sh`)
- [ ] All tests pass (`pytest tests/ -v`)
- [ ] No demo credentials in production
- [ ] Frontend environment variables use NEXT_PUBLIC only for safe values

---

## Backup & Recovery

### Automated Backups

Supabase provides daily backups automatically. Configure in:
- Supabase Dashboard → Database → Backups

### Manual Backup

```bash
# Full database backup
pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d).sql

# Restore from backup
psql "$DATABASE_URL" < backup_20260129.sql

# Backup specific tables
pg_dump "$DATABASE_URL" \
  -t user_accounts \
  -t user_portfolios \
  -t user_holdings \
  > user_data_backup.sql
```

---

## Scaling Considerations

### When to Scale

- More than 100 concurrent users
- API response times > 500ms
- Database CPU > 80%
- Connection pool exhausted

### Scaling Options

1. **Upgrade Supabase Plan**: More CPU, RAM, connections
2. **Add Backend Replicas**: Multiple FastAPI instances
3. **Add Redis Cache**: Cache frequent queries
4. **CDN for Frontend**: Cloudflare or Vercel Edge
5. **Read Replicas**: For analytics queries

---

## Success Checklist

- [ ] Database connected and schemas applied
- [ ] Environment variables configured
- [ ] Backend starts without errors
- [ ] Frontend loads at http://localhost:3000
- [ ] Can register new user
- [ ] Can log in
- [ ] Can upload portfolio
- [ ] Stock search returns results
- [ ] Watchlist works (add/remove)
- [ ] Charts show real data
- [ ] All tests pass

---

## Next Steps After Deployment

### Week 1
- [ ] Monitor error logs daily
- [ ] Check user registration rate
- [ ] Verify background jobs run successfully
- [ ] Monitor API response times

### Month 1
- [ ] Collect user feedback
- [ ] Optimize slow queries
- [ ] Implement HttpOnly cookies
- [ ] Add email verification
- [ ] Add password reset

---

## Support

**Documentation**:
- Quick Deploy: `QUICK_DEPLOY_GUIDE.md`
- Production Ready: `DEPLOYMENT_READY.md`
- Security: `PRODUCTION_SECURITY_CHECKLIST.md`
- User Journeys: `USER_JOURNEYS.md`

**Supabase Resources**:
- Dashboard: https://app.supabase.com/
- Docs: https://supabase.com/docs
- Status: https://status.supabase.com/

**Verification**:
```bash
bash scripts/verify_production_ready.sh
```

---

## Conclusion

Your ASX Portfolio OS is now configured for Supabase! The system is production-ready with:
- ✅ Secure authentication (JWT)
- ✅ User data isolation
- ✅ Rate limiting
- ✅ Real-time stock data
- ✅ V2 ensemble signals
- ✅ Comprehensive testing

**Status**: 🟢 Ready to deploy!
