# ASX Portfolio OS - Quick Deploy Guide

**For**: Production deployment
**Time**: 15-30 minutes (first time)
**Prerequisites**: PostgreSQL, Python 3.10+, Node.js 18+

---

## 1. ENVIRONMENT SETUP (2 minutes)

```bash
# Generate secure keys
export JWT_SECRET_KEY=$(openssl rand -hex 32)
export OS_API_KEY=$(openssl rand -hex 32)

# Database
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"

# EODHD API
export EODHD_API_KEY="your-eodhd-api-key"

# Optional
export OPENAI_API_KEY="sk-..."  # For AI assistant
export SENTRY_DSN="https://..."  # For error tracking
```

**Save to .env file**:
```bash
cat > .env << EOF
JWT_SECRET_KEY=$JWT_SECRET_KEY
OS_API_KEY=$OS_API_KEY
DATABASE_URL=$DATABASE_URL
EODHD_API_KEY=$EODHD_API_KEY
EOF
```

---

## 2. DATABASE SETUP (5 minutes)

```bash
# Apply schemas in order
python3 scripts/apply_user_schema.py
python3 scripts/apply_notification_schema.py
psql $DATABASE_URL < schemas/portfolio_management.sql
psql $DATABASE_URL < schemas/watchlist.sql

# Verify
psql $DATABASE_URL -c "\dt" | grep user_
# Should show: user_accounts, user_holdings, user_portfolios, user_watchlist
```

---

## 3. INSTALL DEPENDENCIES (3 minutes)

```bash
# Backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
cd ..
```

---

## 4. RUN VERIFICATION (1 minute)

```bash
bash scripts/verify_production_ready.sh
```

**Expected output**:
```
✅ PASS - JWT_SECRET_KEY is set and secure
✅ PASS - OS_API_KEY is set
✅ PASS - DATABASE_URL is set
✅ PASS - Demo credentials removed from schema
✅ PASS - No API key in frontend code
✅ PASS - All new route modules import successfully
...
✅ ALL CHECKS PASSED
```

---

## 5. RUN TESTS (2 minutes)

```bash
# Security tests
pytest tests/test_security.py -v

# User journey tests
pytest tests/test_user_journeys.py -v
```

---

## 6. BUILD FRONTEND (2 minutes)

```bash
cd frontend
npm run build
cd ..
```

---

## 7. START SERVICES (1 minute)

### Option A: Development Mode
```bash
# Backend (port 8788)
uvicorn app.main:app --reload --port 8788 &

# Frontend (port 3000)
cd frontend && npm run dev &
```

### Option B: Production Mode
```bash
# Backend (4 workers)
uvicorn app.main:app --host 0.0.0.0 --port 8788 --workers 4 &

# Frontend (optimized)
cd frontend && npm run start &
```

### Option C: Docker Compose
```bash
docker-compose up -d
```

---

## 8. SMOKE TESTS (2 minutes)

```bash
# Health check
curl http://localhost:8788/health
# Expected: {"status": "healthy", "database": "connected"}

# Register test user
curl -X POST http://localhost:8788/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser1",
    "email": "test1@example.com",
    "password": "SecurePass123!"
  }'
# Expected: {"access_token": "...", "user": {...}}

# Login test
curl -X POST http://localhost:8788/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser1",
    "password": "SecurePass123!"
  }'
# Expected: {"access_token": "...", "user": {...}}

# Search test
curl "http://localhost:8788/search?q=BHP"
# Expected: {"results": [...]}

# Frontend test
curl http://localhost:3000
# Expected: 200 OK with HTML
```

---

## 9. SCHEDULE BACKGROUND JOBS (5 minutes)

Add to crontab:
```bash
crontab -e
```

Add these lines:
```cron
# Daily data sync at 2 AM UTC
0 2 * * * cd /app && python3 jobs/sync_live_prices_job.py
5 2 * * * cd /app && python3 jobs/load_fundamentals_pipeline.py
10 2 * * * cd /app && python3 jobs/generate_signals.py
15 2 * * * cd /app && python3 jobs/generate_signals_model_b.py
20 2 * * * cd /app && python3 jobs/generate_ensemble_signals.py

# Weekly drift audit (Sunday 3 AM)
0 3 * * 0 cd /app && python3 jobs/audit_drift_job.py
```

---

## 10. MONITORING SETUP (Optional, 5 minutes)

### Application Logs
```bash
# Create log directory
mkdir -p logs

# Watch logs in real-time
tail -f logs/app.log
```

### Sentry (Error Tracking)
```bash
export SENTRY_DSN="https://your-sentry-dsn"
# Errors automatically reported
```

### Database Monitoring
```sql
-- User growth
SELECT DATE(created_at), COUNT(*)
FROM user_accounts
GROUP BY DATE(created_at)
ORDER BY DATE(created_at) DESC
LIMIT 7;

-- Portfolio uploads
SELECT DATE(created_at), COUNT(*)
FROM user_portfolios
GROUP BY DATE(created_at)
ORDER BY DATE(created_at) DESC
LIMIT 7;

-- Watchlist activity
SELECT DATE(added_at), COUNT(*)
FROM user_watchlist
GROUP BY DATE(added_at)
ORDER BY DATE(added_at) DESC
LIMIT 7;
```

---

## COMMON ISSUES & FIXES

### Issue: "JWT_SECRET_KEY not set" on startup
```bash
export JWT_SECRET_KEY=$(openssl rand -hex 32)
echo "JWT_SECRET_KEY=$JWT_SECRET_KEY" >> .env
```

### Issue: Database connection failed
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check URL format
echo $DATABASE_URL
# Should be: postgresql://user:pass@host:port/dbname
```

### Issue: Frontend shows 401 errors
```bash
# Check backend is running
curl http://localhost:8788/health

# Check API URL in frontend
cat frontend/.env.local | grep NEXT_PUBLIC_API_URL
# Should be: http://localhost:8788 (dev) or https://api.yourdomain.com (prod)
```

### Issue: Rate limit triggering too quickly
```bash
# Increase limits in app/routes/auth_routes.py
@limiter.limit("10/15minutes")  # Instead of 5/15minutes

# Or restart to clear in-memory limits
systemctl restart asx-portfolio-backend
```

### Issue: Watchlist table doesn't exist
```bash
psql $DATABASE_URL < schemas/watchlist.sql
```

---

## ROLLBACK PROCEDURE

If critical issues found:

```bash
# 1. Stop services
systemctl stop asx-portfolio-backend
systemctl stop asx-portfolio-frontend

# 2. Revert to previous version
git checkout v0.4.0

# 3. Restore database (if schema changed)
psql $DATABASE_URL < backups/schema_backup_20260128.sql

# 4. Rebuild
pip install -r requirements.txt
cd frontend && npm install && npm run build

# 5. Restart
systemctl start asx-portfolio-backend
systemctl start asx-portfolio-frontend

# 6. Verify
curl http://localhost:8788/health
```

---

## NEXT STEPS AFTER DEPLOYMENT

### Day 1
- [x] Monitor error logs
- [x] Check user registration rate
- [x] Verify background jobs run
- [x] Monitor API response times

### Week 1
- [ ] Collect user feedback
- [ ] Review security logs
- [ ] Optimize slow queries
- [ ] Plan Phase 2 features

### Month 1
- [ ] Implement HttpOnly cookies
- [ ] Add email verification
- [ ] Add password reset
- [ ] Implement refresh tokens
- [ ] Security penetration testing

---

## SUPPORT

**Documentation**:
- Security: `PRODUCTION_SECURITY_CHECKLIST.md`
- User Flows: `USER_JOURNEYS.md`
- Testing: `tests/test_security.py`, `tests/test_user_journeys.py`
- Development: `DEVELOPMENT.md`

**Verification**:
```bash
bash scripts/verify_production_ready.sh
```

**Questions**: See `README.md` or open GitHub issue

---

## SUCCESS CRITERIA

✅ Health endpoint returns 200
✅ User can register account
✅ User can log in
✅ User can upload portfolio
✅ Stock search returns results
✅ Watchlist operations work
✅ Charts show real data (not random)
✅ No security warnings in verification script
✅ All tests pass

**Status**: 🟢 READY FOR PRODUCTION DEPLOYMENT

---

**Total deployment time**: ~15-30 minutes (excluding job scheduling)
**Recommended timeline**: Deploy to staging this week, production next week
