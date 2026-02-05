# Deployment Guide

Deploy ASX Portfolio OS to production using Render (backend), Vercel (frontend), and Supabase (database).

---

## Prerequisites

**Accounts needed:**
- GitHub account
- Supabase account (database)
- Render account (backend)
- Vercel account (frontend)

**API Keys:**
| Service | Purpose | Cost |
|---------|---------|------|
| EODHD | Market data | $79.99/mo |
| NewsAPI | ASX announcements | Free tier |
| OpenAI | AI assistant (optional) | Pay-as-you-go |

**Generate internal keys:**
```bash
export JWT_SECRET_KEY=$(openssl rand -hex 32)
export OS_API_KEY=$(openssl rand -hex 32)
```

---

## Step 1: Database Setup (Supabase)

### Create Project
1. Go to https://supabase.com/dashboard
2. Create new project: `asx-portfolio-os`
3. Choose region (Sydney for AU)
4. Copy Database URL from Settings -> Database

### Apply Schemas
```bash
# Test connection
psql "$DATABASE_URL" -c "SELECT version();"

# Apply schemas
python3 scripts/apply_user_schema.py
python3 scripts/apply_notification_schema.py
psql "$DATABASE_URL" < schemas/portfolio_management.sql
psql "$DATABASE_URL" < schemas/watchlist.sql

# Verify tables
psql "$DATABASE_URL" -c "\dt user_*"
```

### Add Performance Indexes
```sql
CREATE INDEX idx_user_watchlist_user_id ON user_watchlist(user_id);
CREATE INDEX idx_user_holdings_user_id ON user_holdings(user_id);
CREATE INDEX idx_prices_ticker_date ON prices(ticker, dt);
CREATE INDEX idx_signals_symbol_date ON model_a_ml_signals(symbol, as_of);
```

---

## Step 2: Backend Deployment (Render)

### Connect Repository
1. Go to https://dashboard.render.com
2. New -> Web Service
3. Connect GitHub repository
4. Select branch: `main`

### Configure Service
```yaml
Name: asx-portfolio-api
Branch: main
Build Command: pip install -r requirements.txt
Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 4
```

### Set Environment Variables
**Required:**
```bash
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
JWT_SECRET_KEY=[generated-32-char-hex]
OS_API_KEY=[generated-32-char-hex]
EODHD_API_KEY=[your-eodhd-key]
```

**Optional:**
```bash
ENABLE_ASSISTANT=false
OPENAI_API_KEY=sk-...
SENTRY_DSN=https://...@sentry.io/...
```

### Deploy
1. Click "Create Web Service"
2. Wait for build (~3-5 minutes)
3. Test health: `curl https://your-app.onrender.com/health`

---

## Step 3: Frontend Deployment (Vercel)

### Import Project
1. Go to https://vercel.com/dashboard
2. Click "Add New Project"
3. Import repository: `asx-portfolio-os`

### Configure Build
```yaml
Framework Preset: Next.js
Root Directory: frontend  # CRITICAL
Build Command: npm run build
Output Directory: .next
```

### Set Environment Variables
```bash
NEXT_PUBLIC_API_URL=https://your-app.onrender.com
NEXT_PUBLIC_API_KEY=[your-os-api-key]
```

### Deploy
1. Click "Deploy"
2. Wait for build (~2-3 minutes)
3. Test: Visit your Vercel URL

---

## Step 4: Background Jobs

### Cron Schedule (UTC)
Add to crontab or Render Cron Jobs:
```bash
# Daily data sync (2 AM UTC)
0 2 * * * python3 jobs/sync_live_prices_job.py
5 2 * * * python3 jobs/load_fundamentals_pipeline.py
10 2 * * * python3 jobs/generate_signals.py
15 2 * * * python3 jobs/generate_signals_model_b.py
20 2 * * * python3 jobs/generate_ensemble_signals.py

# Weekly drift audit (Sunday 3 AM)
0 3 * * 0 python3 jobs/audit_drift_job.py
```

### GitHub Actions Alternative
```yaml
# .github/workflows/daily-jobs.yml
name: Daily Data Sync
on:
  schedule:
    - cron: '0 2 * * *'
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      - run: pip install -r requirements.txt
      - run: python3 jobs/sync_live_prices_job.py
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          EODHD_API_KEY: ${{ secrets.EODHD_API_KEY }}
```

---

## Step 5: Verification

### Health Checks
```bash
# Backend health
curl https://your-app.onrender.com/health

# Test registration
curl -X POST https://your-app.onrender.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"SecurePass123!"}'

# Test signals
curl -H "x-api-key: $OS_API_KEY" \
  https://your-app.onrender.com/signals/live
```

### Validation Script
```bash
bash scripts/verify_production_ready.sh
```

---

## Monitoring

### Uptime Monitoring (UptimeRobot)
1. Go to https://uptimerobot.com
2. Add monitor: `https://your-app.onrender.com/health`
3. Set interval: 5 minutes
4. Configure email alerts

### Error Tracking (Sentry)
```bash
export SENTRY_DSN="https://your-sentry-dsn"
```

### Database Monitoring
```sql
-- Active users today
SELECT COUNT(*) FROM user_accounts WHERE last_login_at > CURRENT_DATE;

-- Watchlist activity
SELECT DATE(added_at), COUNT(*) FROM user_watchlist
WHERE added_at > CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(added_at);
```

---

## Docker Deployment

### Docker Compose
```bash
docker-compose up -d
```

### Build Images
```bash
docker build -t asx-backend:latest .
docker build -t asx-frontend:latest ./frontend
```

---

## Database Migrations

### Backup
```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### Restore
```bash
psql $DATABASE_URL < backup_20260129.sql
```

---

## Troubleshooting

### Database Connection Refused
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check URL format
echo $DATABASE_URL
```

### API 401 Unauthorized
```bash
# Check API key
curl -H "x-api-key: $OS_API_KEY" http://localhost:8788/health
```

### Frontend Can't Reach Backend
```bash
# Check NEXT_PUBLIC_API_URL
cat frontend/.env.local

# Verify backend is running
curl https://your-app.onrender.com/health
```

### Schema Not Applied
```bash
python3 scripts/apply_user_schema.py
python3 scripts/apply_notification_schema.py
```

### Jobs Not Running
```bash
# Manually trigger
python3 jobs/sync_live_prices_job.py

# Check logs
tail -f logs/price_sync.log
```

---

## Rollback

```bash
# Stop services
systemctl stop asx-portfolio-backend

# Revert code
git checkout v0.4.0

# Restore database
psql $DATABASE_URL < backups/backup_YYYYMMDD.sql

# Rebuild and restart
pip install -r requirements.txt
systemctl start asx-portfolio-backend
```

---

## Security Checklist

- [ ] JWT_SECRET_KEY is secure (32+ hex characters)
- [ ] OS_API_KEY is secure
- [ ] Database password is strong
- [ ] HTTPS enabled on all endpoints
- [ ] Rate limiting active
- [ ] No demo credentials in production
- [ ] Environment variables not committed to git
- [ ] Database backups configured

---

## Maintenance

### Daily
- Monitor job execution logs
- Check error rates
- Verify price sync successful

### Weekly
- Review drift monitoring
- Check database growth
- Vacuum database: `VACUUM ANALYZE;`

### Monthly
- Model retraining
- Security updates
- Dependency updates
- Backup verification
