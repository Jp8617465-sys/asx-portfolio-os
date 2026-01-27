# ASX Portfolio OS - Complete Deployment Instructions

**Date**: January 27, 2026
**Version**: 1.0.0-rc1
**Status**: Ready for Production Deployment

---

## Prerequisites Checklist

- [x] All code committed and pushed to GitHub
- [x] Backend deployed to Render (https://asx-portfolio-os.onrender.com)
- [x] Database hosted on Supabase (PostgreSQL)
- [x] Environment variables configured
- [ ] Frontend to be deployed to Vercel
- [ ] Production monitoring to be configured

---

## Part 1: Frontend Deployment to Vercel

### Step 1: Connect GitHub to Vercel

1. **Go to Vercel**: https://vercel.com
2. **Sign in** with GitHub account
3. **Click "Add New Project"**
4. **Import** your repository: `Jp8617465-sys/asx-portfolio-os`

### Step 2: Configure Build Settings

**Project Settings**:
```
Framework Preset: Next.js
Root Directory: frontend
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```

**Environment Variables** (Click "Environment Variables"):
```bash
# Required
NEXT_PUBLIC_API_URL=https://asx-portfolio-os.onrender.com
NEXT_PUBLIC_API_KEY=<your-api-key>

# Optional (if using external services)
NEXT_PUBLIC_ANALYTICS_ID=<if-using-analytics>
```

**Important**:
- Root Directory MUST be set to `frontend`
- Do NOT include trailing slash in API_URL

### Step 3: Deploy

1. **Click "Deploy"**
2. **Wait** for build to complete (~2-3 minutes)
3. **Vercel** will assign a URL like: `https://asx-portfolio-os-abc123.vercel.app`

### Step 4: Configure Custom Domain (Optional)

1. **Go to** Project Settings → Domains
2. **Add** your custom domain (e.g., `asx-signals.com`)
3. **Update DNS** records as instructed by Vercel:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21

   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```
4. **Wait** for DNS propagation (5-60 minutes)

### Step 5: Verify Deployment

**Test checklist**:
```bash
# 1. Frontend loads
curl https://asx-portfolio-os-abc123.vercel.app

# 2. API connectivity
# Open browser console and check for API errors

# 3. Test key pages
- Landing page: /
- Dashboard: /app/dashboard
- Portfolio: /app/portfolio
- Models: /app/models
- Jobs: /app/jobs

# 4. Test portfolio upload
# Upload sample CSV and verify signals appear
```

---

## Part 2: Production Monitoring Setup

### Monitoring Component 1: Uptime Monitoring (UptimeRobot)

**Time**: 5 minutes

1. **Go to**: https://uptimerobot.com (Free plan)
2. **Create Account** (or sign in)
3. **Add New Monitor**:
   ```
   Monitor Type: HTTP(s)
   Friendly Name: ASX Portfolio API
   URL: https://asx-portfolio-os.onrender.com/health
   Monitoring Interval: 5 minutes
   ```
4. **Add Alert Contacts**:
   - Email: your-email@example.com
   - SMS (optional): your-phone-number
5. **Alert Settings**:
   - Alert when down for: 5 minutes
   - Re-alert every: 30 minutes

6. **Add Second Monitor** for Frontend:
   ```
   Monitor Type: HTTP(s)
   Friendly Name: ASX Portfolio Frontend
   URL: https://asx-portfolio-os.vercel.app
   Monitoring Interval: 5 minutes
   ```

**Expected Result**: Email/SMS alerts if site is down > 5 minutes

---

### Monitoring Component 2: Sentry Error Tracking

**Time**: 10 minutes

**Status**: ✅ Already configured in backend

**Verify Configuration**:

1. **Check** `.env` file has:
   ```bash
   SENTRY_DSN=https://...@sentry.io/...
   ```

2. **Test** error tracking:
   ```bash
   # Trigger a test error
   curl -H "x-api-key: invalid" \
     https://asx-portfolio-os.onrender.com/dashboard/model_a_v1_1
   ```

3. **Check Sentry Dashboard**: https://sentry.io
   - Should see the error logged
   - Verify stack traces are readable

**Configure Alerts**:

1. **Go to** Sentry → Alerts
2. **Create Alert Rule**:
   ```
   Alert Name: High Error Rate
   Condition: Number of events > 10 in 1 hour
   Action: Send email to your-email@example.com
   ```

3. **Create Second Alert**:
   ```
   Alert Name: Critical 5xx Errors
   Condition: Event level is error AND status_code >= 500
   Action: Send email immediately
   ```

---

### Monitoring Component 3: API Response Time Tracking

**Time**: 15 minutes

**Option A: Simple - New Relic** (Free tier)

1. **Sign up**: https://newrelic.com/signup
2. **Install APM**:
   ```bash
   pip install newrelic
   ```
3. **Add to** `requirements.txt`:
   ```
   newrelic==9.4.0
   ```
4. **Update** `app/main.py`:
   ```python
   import newrelic.agent
   newrelic.agent.initialize('newrelic.ini')
   ```
5. **Deploy** updated code to Render

**Option B: Custom - Prometheus + Grafana** (Advanced)

See `MONITORING_ADVANCED.md` for setup instructions.

---

### Monitoring Component 4: Job Execution Monitoring

**Time**: 10 minutes

**Method 1: Manual Check** (Simple)

```bash
# Check job history daily
curl -H "x-api-key: $API_KEY" \
  https://asx-portfolio-os.onrender.com/jobs/history | jq '.jobs[:5]'

# Look for:
# - "generate_signals" ran today
# - "sync_prices" ran today
# - Status: "success"
```

**Method 2: Automated Alert** (Recommended)

Create a monitoring script:

```python
# monitoring/check_jobs.py
import requests
import os
from datetime import datetime, timedelta

API_KEY = os.getenv("OS_API_KEY")
BASE_URL = "https://asx-portfolio-os.onrender.com"

response = requests.get(
    f"{BASE_URL}/jobs/history",
    headers={"x-api-key": API_KEY}
)

jobs = response.json()["jobs"]

# Check if signals generated in last 24 hours
signal_jobs = [j for j in jobs if j["job_name"] == "generate_signals"]
if not signal_jobs:
    send_alert("⚠️ No signal generation jobs found!")
elif signal_jobs[0]["status"] != "success":
    send_alert(f"⚠️ Last signal generation failed: {signal_jobs[0]['message']}")

# Check if prices synced in last 24 hours
price_jobs = [j for j in jobs if j["job_name"] == "sync_prices"]
if not price_jobs:
    send_alert("⚠️ No price sync jobs found!")
```

**Schedule** with cron or GitHub Actions:
```yaml
# .github/workflows/monitor-jobs.yml
name: Monitor Jobs
on:
  schedule:
    - cron: '0 7 * * *'  # Daily at 7 AM
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: python monitoring/check_jobs.py
```

---

## Part 3: Database Optimization

**Time**: 2 minutes

### Apply Performance Indexes

```bash
# Connect to database
psql $DATABASE_URL -f schemas/add_indexes.sql

# Expected output:
# CREATE INDEX (x20)
# ANALYZE (x8)
# SELECT (list of indexes)
```

### Verify Indexes Created

```sql
-- Check indexes
SELECT
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('prices', 'model_a_ml_signals', 'portfolio_fusion', 'job_history')
ORDER BY tablename, indexname;

-- Should see:
-- idx_prices_symbol_dt
-- idx_prices_dt
-- idx_signals_as_of
-- idx_signals_rank
-- ... (20+ indexes total)
```

---

## Part 4: Daily Job Scheduling

**Time**: 5 minutes

### Configure Render Cron Jobs

1. **Go to** Render Dashboard → Your Service
2. **Add Cron Job** tab
3. **Add First Job**:
   ```
   Name: sync-prices
   Command: python jobs/sync_live_prices_job.py
   Schedule: 0 5 * * *  # Daily at 5 AM UTC
   ```

4. **Add Second Job**:
   ```
   Name: generate-signals
   Command: python jobs/generate_signals.py
   Schedule: 0 6 * * *  # Daily at 6 AM UTC (after prices)
   ```

5. **Add Third Job**:
   ```
   Name: build-features
   Command: python jobs/build_extended_feature_set.py
   Schedule: 0 1 * * *  # Daily at 1 AM UTC
   ```

**Schedule Order**:
```
1 AM: Build features (pre-computation optimization)
5 AM: Sync prices from EODHD
6 AM: Generate signals (using latest prices)
```

---

## Part 5: Production Smoke Test

**Time**: 10 minutes

### Test Checklist

```bash
# Set your API key
export API_KEY="your-api-key"
export API_URL="https://asx-portfolio-os.onrender.com"

# 1. Health check
curl "$API_URL/health"
# Expected: {"status": "healthy", "database": "connected"}

# 2. Get signals
curl -H "x-api-key: $API_KEY" "$API_URL/signals/live?limit=10" | jq '.signals[:3]'
# Expected: Array of 10 signals with BUY/SELL

# 3. Get dashboard
curl -H "x-api-key: $API_KEY" "$API_URL/dashboard/model_a_v1_1" | jq '.summary'
# Expected: Summary with signal counts

# 4. Test frontend (browser)
open https://asx-portfolio-os.vercel.app
# - Landing page loads
# - Click "Get Started" → Dashboard
# - Dashboard shows signals
# - Click "Portfolio" → Upload CSV
# - Upload test portfolio
# - Verify signals overlay on holdings

# 5. Check job history
curl -H "x-api-key: $API_KEY" "$API_URL/jobs/history?limit=5" | jq '.jobs[:2]'
# Expected: Recent job executions

# 6. Test performance (should be < 2s)
time curl -H "x-api-key: $API_KEY" "$API_URL/dashboard/model_a_v1_1" > /dev/null
# Expected: real 0m1.5s (or less)
```

### Create Test Portfolio CSV

```bash
cat > test_portfolio.csv <<EOF
symbol,shares,avg_cost
CBA.AX,100,95.50
BHP.AX,200,42.30
WES.AX,150,55.80
CSL.AX,50,280.00
WOW.AX,120,38.50
EOF

# Upload via frontend UI or API
curl -H "x-api-key: $API_KEY" \
  -F "file=@test_portfolio.csv" \
  "$API_URL/portfolio/upload"
```

---

## Part 6: Post-Deployment Monitoring

**First 24 Hours**:

- [ ] Check Sentry for errors every 2 hours
- [ ] Monitor API response times
- [ ] Verify daily jobs ran successfully
- [ ] Check uptime status
- [ ] Test portfolio upload functionality

**First Week**:

- [ ] Daily check of job execution
- [ ] Monitor signal distribution (not all HOLD or all BUY)
- [ ] Check database growth (should be steady)
- [ ] Gather user feedback

**First Month**:

- [ ] Weekly performance review
- [ ] Analyze API usage patterns
- [ ] Optimize slow endpoints
- [ ] Plan Phase 2 features (Models B/C)

---

## Troubleshooting

### Issue: Frontend Can't Connect to API

**Symptoms**: CORS errors, "Failed to fetch"

**Solution**:
1. Check `NEXT_PUBLIC_API_URL` is correct (no trailing slash)
2. Verify API key is set: `NEXT_PUBLIC_API_KEY`
3. Check CORS settings in `app/main.py`:
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["https://asx-portfolio-os.vercel.app"],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

### Issue: Slow API Responses

**Symptoms**: Dashboard takes > 3 seconds to load

**Solution**:
1. Apply database indexes: `psql $DATABASE_URL -f schemas/add_indexes.sql`
2. Enable caching: Add `@cached(ttl=300)` decorator to endpoints
3. Pre-compute features: Run `python jobs/build_extended_feature_set.py`
4. Update API to read from `model_a_features_extended` table

### Issue: Daily Jobs Not Running

**Symptoms**: No new signals, stale data

**Solution**:
1. Check Render cron jobs are scheduled
2. View logs in Render dashboard
3. Manually trigger job to test: `python jobs/generate_signals.py`
4. Check database connection in job logs

### Issue: Database Connection Errors

**Symptoms**: 500 errors, "Connection refused"

**Solution**:
1. Verify `DATABASE_URL` is correct
2. Check Supabase dashboard for connectivity
3. Test connection: `psql $DATABASE_URL -c "SELECT 1;"`
4. Check connection pooling limits

---

## Success Criteria

**Deployment is successful when**:

- [x] Commits pushed to GitHub
- [ ] Frontend live at Vercel URL
- [ ] Dashboard loads in < 2 seconds
- [ ] Portfolio upload works
- [ ] Daily signals generating automatically
- [ ] Uptime monitoring active (emails on downtime)
- [ ] Sentry catching errors
- [ ] Job execution monitored
- [ ] Database indexes applied
- [ ] Zero 5xx errors in first 24 hours

---

## Next Steps After Deployment

**Week 1**:
- Monitor for errors and performance issues
- Gather initial user feedback
- Fine-tune monitoring alerts

**Month 1**:
- Implement remaining optimizations (feature pre-computation in API)
- Increase test coverage to 80%
- Create comprehensive API documentation

**Month 2-3** (Phase 2):
- Plan Model B (fundamentals)
- Plan Model C (sentiment)
- Design ensemble strategy

---

## Support Contacts

**Issues**: GitHub Issues at `Jp8617465-sys/asx-portfolio-os`
**API Status**: https://asx-portfolio-os.onrender.com/health
**Documentation**: See repository `/docs` folder

---

**Deployment Owner**: James Pcino
**Date Prepared**: January 27, 2026
**Version**: 1.0.0-rc1
**Status**: ✅ Ready for Production
