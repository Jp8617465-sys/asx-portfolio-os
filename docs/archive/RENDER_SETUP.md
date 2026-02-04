# Render Deployment - Environment Variables Setup

## Critical Issue: JWT_SECRET_KEY Missing

Your Render deployment is failing because `JWT_SECRET_KEY` is not set in Render's environment variables.

## Fix Steps

### 1. Go to Render Dashboard
Visit: https://dashboard.render.com/

### 2. Select Your Service
Find and click on: **asx-portfolio-api**

### 3. Add Environment Variables
Go to **Environment** tab, then click **Add Environment Variable**

Add these REQUIRED variables:

#### Required Security Keys

**JWT_SECRET_KEY** (CRITICAL - App won't start without this)
```
9ea333fe1b0e9a271e1ae288529b642f6c9c4455ed5ac7264209565fcfe893b9
```

**OS_API_KEY** (Backend API authentication)
```
ac80624019e4e268a085e5937a3c0a08e63c8b0cfc34ce52a97df198dc500214
```

#### Required Database

**DATABASE_URL** (Supabase connection)
```
postgresql://postgres:HugoRalph2026_DB_Pass_01@db.gxjqezqndltaelmyctnl.supabase.co:5432/postgres
```

**SUPABASE_DB_URL** (Same as DATABASE_URL)
```
postgresql://postgres:HugoRalph2026_DB_Pass_01@db.gxjqezqndltaelmyctnl.supabase.co:5432/postgres
```

#### Required External APIs

**EODHD_API_KEY** (Market data)
```
68d8b2f7f26f26.20014269
```

### 4. Optional Variables

**OPENAI_API_KEY** (For AI assistant feature)
- Only needed if you want the AI assistant
- Leave blank if not using

**SENTRY_DSN** (Error tracking)
- Only needed if you want error monitoring
- Leave blank if not using

### 5. Save and Redeploy

1. Click **Save Changes**
2. Render will automatically redeploy
3. Wait 5-10 minutes for build to complete
4. Check logs to confirm successful startup

## Verification

After deployment succeeds, verify:

1. **Health Check**
   ```bash
   curl https://asx-portfolio-api.onrender.com/health
   ```
   Should return:
   ```json
   {
     "status": "ok",
     "timestamp": "2026-01-29T...",
     "version": "0.4.0",
     "checks": {
       "database": "ok"
     }
   }
   ```

2. **Login Test**
   ```bash
   curl -X POST https://asx-portfolio-api.onrender.com/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username": "demo_user", "password": "testpass123"}'
   ```
   Should return a JWT token.

## Common Issues

### Build Still Failing?

**Check Render Logs**:
- Go to service → **Logs** tab
- Look for specific error messages
- Common errors:
  - `JWT_SECRET_KEY environment variable must be set` → Variable not set correctly
  - `Database connection failed` → DATABASE_URL incorrect
  - `Module not found` → Build command issue

### Service Running But Errors?

**Check Runtime Logs**:
- Filter logs by "ERROR" or "Exception"
- Look for authentication failures
- Check database connection issues

### Need to Regenerate Keys?

If you need new secure keys:
```bash
# Generate new JWT secret
openssl rand -hex 32

# Generate new API key
openssl rand -hex 32
```

## Security Notes

⚠️ **IMPORTANT**:
- Never commit actual secrets to git
- Use `.env` for local development
- Use Render Environment Variables for production
- Rotate keys periodically (every 90 days recommended)

## Support

If issues persist:
1. Check Render status: https://status.render.com/
2. Review deployment logs carefully
3. Verify all environment variables are set
4. Test database connection separately
