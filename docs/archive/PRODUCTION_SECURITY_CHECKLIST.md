# Production Security Checklist

**Last Updated**: January 29, 2026
**Purpose**: Verify all critical security fixes before production deployment

---

## CRITICAL SECURITY REQUIREMENTS

### ✅ Completed Security Fixes

#### 1. JWT Secret Key Security
- [x] Removed hardcoded default value from `app/auth.py`
- [x] Application raises error if `JWT_SECRET_KEY` not set
- [x] Updated `.env.example` with secure generation instructions
- [x] Token expiration reduced from 30 days to 1 hour

**Verification**:
```bash
# Should fail without JWT_SECRET_KEY
unset JWT_SECRET_KEY
python -c "from app.auth import SECRET_KEY"  # Should raise ValueError

# Should succeed with key
export JWT_SECRET_KEY=$(openssl rand -hex 32)
python -c "from app.auth import SECRET_KEY; print('OK')"
```

---

#### 2. API Key Removed from Frontend
- [x] Removed `NEXT_PUBLIC_OS_API_KEY` from `frontend/lib/api-client.ts`
- [x] Removed `x-api-key` header from frontend requests
- [x] Frontend now uses JWT-only authentication

**Verification**:
```bash
# Verify no NEXT_PUBLIC_OS_API_KEY in frontend code
grep -r "NEXT_PUBLIC_OS_API_KEY" frontend/
# Should return no results (or only in comments)

# Verify no x-api-key in frontend
grep -r "x-api-key" frontend/lib/api-client.ts
# Should return no results
```

---

#### 3. Portfolio Endpoint Authentication Fixed
- [x] All portfolio endpoints now use `Depends(get_current_user_id)`
- [x] User ID extracted from JWT token, not query parameter
- [x] Removed `user_id` query parameter from all endpoints
- [x] Removed `x_api_key` header from portfolio endpoints

**Affected Endpoints**:
- `GET /portfolio`
- `POST /portfolio/upload`
- `POST /portfolio/analyze`
- `GET /portfolio/rebalancing`
- `GET /portfolio/risk-metrics`

**Verification**:
```bash
# Without token - should return 401
curl http://localhost:8788/portfolio

# With valid token - should return portfolio
TOKEN="your-test-token"
curl -H "Authorization: Bearer $TOKEN" http://localhost:8788/portfolio

# Attempting to spoof user_id - should ignore query param
curl -H "Authorization: Bearer $TOKEN" "http://localhost:8788/portfolio?user_id=999"
# Should return current user's portfolio, not user 999's
```

---

#### 4. Rate Limiting Implemented
- [x] Created `app/middleware/rate_limit.py`
- [x] Added slowapi to `requirements.txt`
- [x] Login: 5 attempts per 15 minutes
- [x] Register: 3 attempts per hour
- [x] Registered rate limiter in `app/main.py`

**Verification**:
```bash
# Test login rate limit (6 attempts should trigger limit)
for i in {1..6}; do
  curl -X POST http://localhost:8788/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"wrong"}'
  sleep 1
done
# 6th attempt should return 429 Rate Limit Exceeded
```

---

#### 5. Demo Credentials Removed
- [x] Removed demo users from `schemas/user_accounts.sql`
- [x] Created `scripts/seed_dev_users.py` for development only
- [x] Added security warning to seed script

**Verification**:
```bash
# Schema should not contain demo credentials
grep -i "demo_user\|demo@asxportfolio" schemas/user_accounts.sql
# Should return "SECURITY NOTE" comment only

# Seed script should require --confirm flag
python scripts/seed_dev_users.py
# Should print warning and exit
```

---

### ⚠️ Remaining Security Tasks

#### 6. HttpOnly Cookie Implementation (IN PROGRESS)
- [ ] Update `app/routes/auth_routes.py` to set cookies in Response
- [ ] Add `response.set_cookie()` in login endpoint
- [ ] Configure cookie settings: `httponly=True, secure=True, samesite='strict'`
- [ ] Update frontend to remove localStorage token storage
- [ ] Test cookie-based authentication

**Status**: Infrastructure ready, needs final integration

**Implementation**:
```python
# In app/routes/auth_routes.py
@router.post("/login")
async def login(response: Response, http_request: Request, request: LoginRequest):
    # ... authenticate user ...

    # Set HttpOnly cookie
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,  # HTTPS only
        samesite="strict",
        max_age=3600  # 1 hour
    )

    return {"user": user}
```

---

#### 7. Email Verification (NOT IMPLEMENTED)
- [ ] Create email verification flow
- [ ] Send verification link on registration
- [ ] Add `/auth/verify-email` endpoint
- [ ] Restrict features for unverified users

**Status**: Planned for Phase 2

**Priority**: MEDIUM (can launch without this but should add soon)

---

#### 8. Refresh Token Rotation (NOT IMPLEMENTED)
- [ ] Implement refresh token system
- [ ] Add `refresh_token` column to user_accounts or separate table
- [ ] Implement `/auth/refresh` endpoint (stub exists)
- [ ] Add token rotation on refresh

**Status**: Planned for Phase 2

**Priority**: MEDIUM (1-hour tokens require frequent re-login without this)

---

## NEW ENDPOINTS IMPLEMENTED

### Search Endpoints
- `GET /search?q={query}` - Stock symbol/name search

### Watchlist Endpoints
- `GET /watchlist` - Get user's watchlist
- `POST /watchlist` - Add stock to watchlist
- `DELETE /watchlist/{ticker}` - Remove from watchlist

### Price Data Endpoints
- `GET /prices/{ticker}/history` - Historical OHLC data
- `GET /prices/{ticker}/latest` - Latest price

### Signal Enhancement Endpoints
- `GET /signals/live/{ticker}` - Get latest signal for specific stock
- `GET /signals/{ticker}/reasoning` - SHAP-based signal explanation
- `GET /accuracy/{ticker}` - Historical model accuracy per stock

---

## FRONTEND PAGES CREATED

### Authentication Pages
- `/login` - User login form
- `/register` - New user registration with validation
- `middleware.ts` - Protected route guard

### Components Created
- `ModelComparisonPanel.tsx` - Compare Model A, B, and Ensemble

---

## PRODUCTION DEPLOYMENT CHECKLIST

### Before Deployment

#### 1. Environment Variables
```bash
# Generate secure keys
export JWT_SECRET_KEY=$(openssl rand -hex 32)
export OS_API_KEY=$(openssl rand -hex 32)

# Set required variables
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
export EODHD_API_KEY="your-eodhd-api-key"

# Optional variables
export OPENAI_API_KEY="sk-..."  # For assistant feature
export SENTRY_DSN="https://..."  # For error tracking
export ENABLE_ASSISTANT=true
```

#### 2. Database Schema
```bash
# Apply all schema files in order
python3 scripts/apply_user_schema.py
python3 scripts/apply_notification_schema.py
python3 scripts/apply_portfolio_schema.py

# Apply new schemas
psql $DATABASE_URL < schemas/watchlist.sql

# Verify tables exist
psql $DATABASE_URL -c "\dt user_*"
```

#### 3. Dependencies
```bash
# Install Python dependencies
pip install -r requirements.txt

# Verify slowapi installed (for rate limiting)
python -c "import slowapi; print('OK')"

# Install frontend dependencies
cd frontend
npm install
npm run build
```

#### 4. Security Verification
```bash
# Run security tests
pytest tests/test_security.py -v

# Run user journey tests
pytest tests/test_user_journeys.py -v

# Verify no demo credentials in database
psql $DATABASE_URL -c "SELECT username FROM user_accounts WHERE username = 'demo_user'"
# Should return 0 rows in production
```

#### 5. Build & Deploy
```bash
# Build frontend
cd frontend
npm run build

# Start backend
uvicorn app.main:app --host 0.0.0.0 --port 8788

# Start frontend (production)
cd frontend
npm run start
```

---

## SECURITY TESTING BEFORE GO-LIVE

### Manual Security Tests

#### Test 1: JWT Authentication
```bash
# Should fail without token
curl http://localhost:8788/portfolio
# Expected: 401 Unauthorized

# Should succeed with valid token
TOKEN=$(curl -X POST http://localhost:8788/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}' \
  | jq -r '.access_token')

curl -H "Authorization: Bearer $TOKEN" http://localhost:8788/portfolio
# Expected: 200 OK with portfolio data
```

#### Test 2: Rate Limiting
```bash
# Make 6 rapid login attempts
for i in {1..6}; do
  curl -X POST http://localhost:8788/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"wrong"}'
  echo " - Attempt $i"
done
# 6th should return 429 Too Many Requests
```

#### Test 3: User Isolation
```bash
# Create two users
USER_A_TOKEN=$(curl -X POST http://localhost:8788/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"userA","email":"a@test.com","password":"Pass123!"}' \
  | jq -r '.access_token')

USER_B_TOKEN=$(curl -X POST http://localhost:8788/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"userB","email":"b@test.com","password":"Pass123!"}' \
  | jq -r '.access_token')

# Upload portfolio as User A
curl -X POST http://localhost:8788/portfolio/upload \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  -F "file=@test_portfolio.csv"

# Try to access as User B
curl -H "Authorization: Bearer $USER_B_TOKEN" http://localhost:8788/portfolio
# Should return 404 (User B has no portfolio)
# Should NOT return User A's portfolio
```

#### Test 4: Frontend API Key Exposure
```bash
# Build frontend
cd frontend
npm run build

# Search for API key in build output
grep -r "NEXT_PUBLIC_OS_API_KEY" .next/
# Should return no results

# Search for x-api-key in build
grep -r "x-api-key" .next/static/
# Should return no results
```

---

## POST-DEPLOYMENT MONITORING

### Health Checks
```bash
# API health
curl http://your-domain.com/health
# Expected: {"status": "healthy", "database": "connected"}

# Frontend health
curl http://your-domain.com
# Expected: 200 OK with HTML
```

### Log Monitoring
```bash
# Watch for authentication errors
tail -f logs/app.log | grep "401\|403\|429"

# Watch for security events
tail -f logs/app.log | grep "Failed login\|Rate limit"
```

### Database Checks
```sql
-- Verify no users with demo credentials
SELECT username, email FROM user_accounts WHERE username LIKE '%demo%';
-- Should return 0 rows

-- Check rate limit logs (if implemented)
SELECT COUNT(*) FROM auth_attempts WHERE created_at > NOW() - INTERVAL '1 hour';

-- Verify watchlist table exists
SELECT COUNT(*) FROM user_watchlist;
```

---

## KNOWN LIMITATIONS

### Security
1. **HttpOnly Cookies**: Infrastructure ready but not fully implemented
   - Current: Tokens in localStorage (XSS vulnerable)
   - Planned: HttpOnly cookies (secure)
   - Workaround: Ensure XSS prevention in all user inputs

2. **Email Verification**: Not implemented
   - Current: Users can register with any email
   - Impact: Potential for fake accounts
   - Workaround: Manual review of new registrations

3. **Token Revocation**: No blacklist mechanism
   - Current: Tokens valid until expiration
   - Impact: Cannot invalidate stolen tokens
   - Workaround: Short 1-hour expiration limits exposure

### Functionality
1. **Real-time Updates**: Not implemented
   - Current: Users must refresh to see new signals
   - Planned: WebSocket push notifications

2. **Password Reset**: Forgot password flow not implemented
   - Workaround: Admin manual password reset via database

---

## ROLLBACK PLAN

If critical issues discovered post-deployment:

### Emergency Rollback
```bash
# 1. Stop services
docker-compose down

# 2. Revert to previous version
git checkout <previous-stable-tag>

# 3. Rebuild and restart
docker-compose up -d --build

# 4. Verify health
curl http://your-domain.com/health
```

### Database Rollback
```bash
# If schema changes cause issues
psql $DATABASE_URL < backups/schema_backup_YYYYMMDD.sql
```

---

## SUPPORT CONTACTS

**Security Issues**: Report immediately to security@asxportfolio.com
**Production Bugs**: support@asxportfolio.com
**Database Issues**: dba@asxportfolio.com

---

## NEXT SECURITY IMPROVEMENTS (Phase 2)

1. Implement HttpOnly cookie authentication (1-2 days)
2. Add email verification flow (2-3 days)
3. Implement refresh token rotation (2-3 days)
4. Add password reset flow (1-2 days)
5. Implement token revocation/blacklist (2-3 days)
6. Add CAPTCHA on repeated failed logins (1 day)
7. Implement account lockout after 10 failed attempts (1 day)
8. Add 2FA/MFA support (3-5 days)

**Total Phase 2 Security**: 2-3 weeks
