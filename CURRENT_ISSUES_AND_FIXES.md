# Current Issues & Fixes

**Date**: January 30, 2026
**Status**: Frontend works, but API calls failing

---

## Summary

You can now:
- ✅ **Login** with `demo_user` / `testpass123`
- ✅ **Navigate** the app
- ✅ **See styled UI**
- ✅ **Logout** functionality works

But these don't work yet:
- ❌ **Stock search** - Database schema issue
- ❌ **Watchlist** - Database schema issue
- ❌ **Notifications** - Likely database issue

---

## Root Cause

### Issue 1: Database Schema Incomplete

The backend is missing database tables/columns. When you try to search for stocks:

```
ERROR: column "sector" does not exist
```

This means the database schema hasn't been fully set up.

### Issue 2: API URL Configuration

The frontend `.env.local` is correct:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8788
```

But you need to **verify** it's being used. Check browser console (F12) to see what URL it's calling.

---

## How to Fix

### Fix 1: Set up the database schema

Run the database schema scripts:

```bash
# From the project root
cd /Users/jamespcino/Projects/asx-portfolio-os

# Apply the schema
psql $DATABASE_URL < schemas/stock_data.sql
psql $DATABASE_URL < schemas/watchlist.sql
psql $DATABASE_URL < schemas/notifications.sql
```

### Fix 2: Verify frontend is using localhost API

1. Open browser dev tools (F12)
2. Go to Network tab
3. Try to search for a stock
4. Look at the request URL

**Expected**: `http://localhost:8788/search?q=...`
**If you see**: `https://asx-portfolio-os.onrender.com/...` - the env var isn't loading

If the production URL is being called, restart the frontend:
```bash
cd frontend
pkill -f "next dev"
npm run dev
```

---

## Backend Endpoints Available

These endpoints ARE working:

| Endpoint | Purpose | Status |
|----------|---------|--------|
| `/auth/login` | Login | ✅ Works |
| `/auth/register` | Register | ✅ Works |
| `/users/me` | Get user info | ✅ Works |
| `/search` | Stock search | ⚠️ DB schema issue |
| `/watchlist` | Watchlist CRUD | ⚠️ DB schema issue |
| `/notifications` | Notifications | ⚠️ DB schema issue |
| `/signals/live/{ticker}` | Live signals | ❓ Unknown |
| `/portfolio` | Portfolio | ❓ Unknown |

---

## Testing the Fixes

### Test 1: Stock Search

After applying schemas:

```bash
curl "http://localhost:8788/search?q=CBA"
```

**Expected**: JSON with stock results
**Current**: Error about missing `sector` column

### Test 2: Watchlist

```bash
# Get JWT token from browser localStorage after login
TOKEN="your_token_here"

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8788/watchlist
```

**Expected**: Empty array `[]` or watchlist items
**Current**: Likely database error

---

## Quick Summary

**What works now:**
- ✅ Login/Logout
- ✅ Navigation
- ✅ UI styling

**What needs fixing:**
1. Run database schema scripts
2. Verify API URL in browser

**Next steps:**
1. Apply database schemas (see Fix 1 above)
2. Test stock search again
3. If still failing, check browser console for API URL

---

## Database Connection Info

Your database is configured via environment variables. Check:

```bash
# Backend uses this
echo $DATABASE_URL

# Or check .env file
cat .env | grep DATABASE
```

The database should be **PostgreSQL** (likely Supabase based on your config).

---

## Need Help?

If the database schemas don't exist or are incomplete, we may need to:
1. Create them from scratch
2. Or restore from a backup
3. Or run migrations

Let me know what error you get after trying the fixes!
