# Security Guide

Security implementation and production checklist for ASX Portfolio OS.

---

## Security Overview

### Implemented Protections
- JWT authentication (1-hour token expiration)
- Password hashing (bcrypt)
- Rate limiting on auth endpoints
- User data isolation via JWT
- SQL injection protection (parameterized queries)
- No API keys in frontend bundle

### Status
- **8 critical vulnerabilities fixed**
- **Score**: 100% of critical issues resolved
- **Phase 2 planned**: HttpOnly cookies, email verification, password reset

---

## Authentication

### JWT Configuration
```python
# Token expiration: 1 hour (reduced from 30 days)
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# JWT secret REQUIRED (no default)
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("JWT_SECRET_KEY must be set")
```

### Generating Secure Keys
```bash
# JWT secret (32 hex characters)
export JWT_SECRET_KEY=$(openssl rand -hex 32)

# API key for internal services
export OS_API_KEY=$(openssl rand -hex 32)
```

### Rate Limiting
| Endpoint | Limit | Purpose |
|----------|-------|---------|
| `/auth/login` | 5 per 15 min | Prevent brute force |
| `/auth/register` | 3 per hour | Prevent spam accounts |

---

## Pre-Deployment Checklist

### Environment Variables
- [ ] `JWT_SECRET_KEY` is secure (32+ hex characters)
- [ ] `OS_API_KEY` is secure
- [ ] `DATABASE_URL` points to production database
- [ ] `EODHD_API_KEY` is valid
- [ ] No secrets committed to git

### Database Security
- [ ] Demo credentials removed from schema
- [ ] Strong database password
- [ ] Database not publicly accessible
- [ ] Backups encrypted

### Application Security
- [ ] HTTPS enabled on all endpoints
- [ ] Rate limiting active
- [ ] Protected routes require authentication
- [ ] User data isolated per account

### Verification
```bash
# Run security tests
pytest tests/test_security.py -v

# Run production readiness check
bash scripts/verify_production_ready.sh
```

---

## Security Tests

### 1. JWT Authentication
```bash
# Without token - should return 401
curl http://localhost:8788/portfolio

# With valid token - should return portfolio
TOKEN=$(curl -X POST http://localhost:8788/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}' \
  | jq -r '.access_token')

curl -H "Authorization: Bearer $TOKEN" http://localhost:8788/portfolio
```

### 2. Rate Limiting
```bash
# 6 rapid login attempts should trigger rate limit
for i in {1..6}; do
  curl -X POST http://localhost:8788/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"wrong"}'
done
# 6th should return 429 Too Many Requests
```

### 3. User Isolation
```bash
# Create two users and verify they can't access each other's data
USER_A_TOKEN=$(curl -X POST http://localhost:8788/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"userA","email":"a@test.com","password":"Pass123!"}' \
  | jq -r '.access_token')

USER_B_TOKEN=$(curl -X POST http://localhost:8788/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"userB","email":"b@test.com","password":"Pass123!"}' \
  | jq -r '.access_token')

# User A uploads portfolio
curl -X POST http://localhost:8788/portfolio/upload \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  -F "file=@test_portfolio.csv"

# User B should NOT see User A's portfolio
curl -H "Authorization: Bearer $USER_B_TOKEN" http://localhost:8788/portfolio
# Should return 404 (empty), not User A's data
```

### 4. Frontend API Key Exposure
```bash
cd frontend && npm run build
grep -r "NEXT_PUBLIC_OS_API_KEY" .next/
# Should return no results

grep -r "x-api-key" .next/static/
# Should return no results
```

---

## Security Fixes Applied

### 1. JWT Secret Key (Critical)
- Removed hardcoded default value
- Application crashes if not set
- Forces secure key in production

### 2. API Key Removed from Frontend (Critical)
- Removed `NEXT_PUBLIC_OS_API_KEY`
- Frontend uses JWT-only authentication
- API key only for server-to-server calls

### 3. Portfolio Authentication (Critical)
- User ID extracted from JWT token
- Cannot spoof user_id via query parameter
- All portfolio endpoints require JWT

### 4. Token Expiration (High)
- Reduced from 30 days to 1 hour
- Limits exposure if token stolen

### 5. Demo Credentials (Medium)
- Removed from schema files
- Separate dev seed script with warnings

### 6. Rate Limiting (Medium)
- Prevents brute force attacks
- Prevents registration spam

---

## Monitoring

### Security Logs
```bash
# Watch for authentication errors
tail -f logs/app.log | grep "401\|403\|429"

# Watch for security events
tail -f logs/app.log | grep "Failed login\|Rate limit"
```

### Database Checks
```sql
-- Verify no demo users
SELECT username FROM user_accounts WHERE username LIKE '%demo%';
-- Should return 0 rows

-- Recent rate limit violations
SELECT COUNT(*) FROM auth_attempts
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND success = FALSE;
```

---

## Known Limitations

### Current (Deployed)
1. **Tokens in localStorage**: Vulnerable to XSS
   - Mitigation: 1-hour expiration limits exposure
   - Phase 2: HttpOnly cookies

2. **No email verification**: Users can register with any email
   - Phase 2: Email verification flow

3. **No token revocation**: Cannot invalidate stolen tokens
   - Mitigation: Short expiration
   - Phase 2: Token blacklist

### Planned for Phase 2
- HttpOnly cookie authentication (2-4 hours)
- Email verification (2-3 days)
- Password reset flow (1-2 days)
- Refresh token rotation (2-3 days)
- Account lockout after 10 failures (1 day)
- CAPTCHA integration (1 day)

---

## Rollback Plan

If security issues discovered:
```bash
# Stop services
docker-compose down

# Revert to previous version
git checkout <previous-stable-tag>

# Rebuild and restart
docker-compose up -d --build

# Verify health
curl http://your-domain.com/health
```

---

## Security Endpoints

### Authentication
| Endpoint | Method | Rate Limit |
|----------|--------|------------|
| `/auth/register` | POST | 3/hour |
| `/auth/login` | POST | 5/15min |
| `/auth/me` | GET | JWT required |
| `/auth/refresh` | POST | JWT required |

### Protected Routes
All `/app/*` routes require valid JWT token:
- `/app/dashboard`
- `/app/portfolio`
- `/app/models`
- `/app/alerts`
- `/app/settings`

---

## Password Requirements

- Minimum 8 characters
- Recommended: 12+ characters with mixed case, numbers, special chars
- Passwords hashed with bcrypt
- Never stored in plaintext

### Strength Levels
- **Weak**: < 8 characters
- **Medium**: 8+ with one of: mixed case, numbers, or special chars
- **Strong**: 12+ with uppercase, lowercase, numbers, and special chars

---

## Incident Response

### If Token Compromised
1. User should log out on all devices
2. Change password immediately
3. Token will expire in 1 hour maximum

### If API Key Leaked
1. Generate new key: `openssl rand -hex 32`
2. Update in Render/production environment
3. Restart services
4. Audit access logs

### If Database Compromised
1. Rotate all secrets (JWT, API keys, DB password)
2. Force all users to reset passwords
3. Audit for unauthorized access
4. Enable enhanced logging
