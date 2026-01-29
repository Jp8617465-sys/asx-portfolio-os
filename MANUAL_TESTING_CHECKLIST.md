# Manual Testing Checklist

**Version**: 0.5.0
**Date**: January 29, 2026

Use this checklist to manually test critical functionality before deploying to production.

---

## PRE-DEPLOYMENT CHECKLIST

### Environment Setup

- [ ] `.env` file configured with all required variables
- [ ] `JWT_SECRET_KEY` is secure (32+ hex characters)
- [ ] `OS_API_KEY` is secure
- [ ] `DATABASE_URL` points to correct database
- [ ] `EODHD_API_KEY` is valid
- [ ] Database schemas applied (run all apply_*_schema.py scripts)

### Services Health

- [ ] Backend API running: `curl http://localhost:8788/health`
- [ ] Frontend running: Visit http://localhost:3000
- [ ] Database connection working: `python3 -c "from app.core import db; print(db())"`
- [ ] API docs accessible: http://localhost:8788/docs

---

## AUTHENTICATION TESTS

### User Registration

- [ ] Can register new user with valid credentials
  - Go to registration page (if exists) or use API
  - Username: `test_user_$(date +%s)`
  - Email: `test@example.com`
  - Password: `testpass123`
  - **Expected**: Success, JWT token returned

- [ ] Cannot register with existing username
  - Try username: `demo_user`
  - **Expected**: Error "Username already registered"

- [ ] Cannot register with existing email
  - Try email: `demo@asxportfolio.com`
  - **Expected**: Error "Email already registered"

- [ ] Cannot register with weak password
  - Try password: `123`
  - **Expected**: Error "Password must be at least 8 characters"

### User Login

- [ ] Can login with username
  - Username: `demo_user`
  - Password: `testpass123`
  - **Expected**: Success, JWT token returned

- [ ] Can login with email
  - Username: `demo@asxportfolio.com`
  - Password: `testpass123`
  - **Expected**: Success, JWT token returned

- [ ] Cannot login with wrong password
  - Username: `demo_user`
  - Password: `wrongpass`
  - **Expected**: Error "Incorrect username or password"

- [ ] Cannot login with nonexistent user
  - Username: `nonexistent`
  - **Expected**: Error "Incorrect username or password"

### Token Management

- [ ] Can access protected endpoint with valid token
  - Endpoint: `GET /auth/me`
  - **Expected**: Returns user information

- [ ] Cannot access protected endpoint without token
  - Endpoint: `GET /auth/me` (no Authorization header)
  - **Expected**: 401 or 403 error

- [ ] Cannot access with invalid token
  - Authorization: `Bearer invalid.token.here`
  - **Expected**: 401 error

- [ ] Can refresh token
  - Endpoint: `POST /auth/refresh`
  - **Expected**: New token returned

---

## PORTFOLIO MANAGEMENT TESTS

### Portfolio Upload

- [ ] Can upload valid CSV portfolio
  ```csv
  ticker,shares,avg_cost,date_acquired
  BHP.AX,100,42.50,2023-06-15
  CBA.AX,50,98.00,2023-08-20
  ```
  - **Expected**: Success, portfolio_id returned

- [ ] Cannot upload CSV with missing columns
  ```csv
  ticker,shares
  BHP.AX,100
  ```
  - **Expected**: Error about missing columns

- [ ] Cannot upload CSV with negative shares
  ```csv
  ticker,shares,avg_cost
  BHP.AX,-100,42.50
  ```
  - **Expected**: Error about positive shares required

### Portfolio Retrieval

- [ ] Can get portfolio after upload
  - Endpoint: `GET /portfolio?user_id=1`
  - **Expected**: Returns portfolio with holdings

- [ ] Portfolio has correct number of holdings
  - **Expected**: Count matches uploaded CSV

- [ ] Holdings have correct ticker symbols
  - **Expected**: Tickers end with .AX suffix

### Portfolio Analysis

- [ ] Can analyze portfolio (sync prices)
  - Endpoint: `POST /portfolio/analyze?user_id=1`
  - **Expected**: Returns updated portfolio

- [ ] Holdings have current prices (if available)
  - **Expected**: `current_price` field populated

- [ ] Holdings have signals (if available)
  - **Expected**: `current_signal`, `ensemble_signal` populated

- [ ] Holdings have quality scores (if available)
  - **Expected**: `model_b_quality_score` populated

### Rebalancing

- [ ] Can get rebalancing suggestions
  - Endpoint: `GET /portfolio/rebalancing?user_id=1`
  - **Expected**: Returns suggestions array

- [ ] Suggestions have required fields
  - **Expected**: action, ticker, reason, priority

- [ ] Can regenerate suggestions
  - Endpoint: `GET /portfolio/rebalancing?regenerate=true`
  - **Expected**: New suggestions generated

### Risk Metrics

- [ ] Can get risk metrics
  - Endpoint: `GET /portfolio/risk-metrics?user_id=1`
  - **Expected**: Returns volatility, Sharpe, etc.

- [ ] Risk metrics are reasonable
  - **Expected**: Values within expected ranges

---

## NOTIFICATION TESTS

### Get Notifications

- [ ] Can get all notifications
  - Endpoint: `GET /notifications`
  - **Expected**: Returns notification list

- [ ] Can get only unread notifications
  - Endpoint: `GET /notifications?unread_only=true`
  - **Expected**: Returns only unread

- [ ] Pagination works
  - Endpoint: `GET /notifications?limit=5&offset=0`
  - **Expected**: Returns max 5 notifications

### Notification Actions

- [ ] Can mark notification as read
  - Endpoint: `PUT /notifications/{id}/read`
  - **Expected**: Notification marked as read

- [ ] Can mark all notifications as read
  - Endpoint: `POST /notifications/mark-all-read`
  - **Expected**: All marked as read

- [ ] Can delete notification
  - Endpoint: `DELETE /notifications/{id}`
  - **Expected**: Notification deleted

### Alert Preferences

- [ ] Can get alert preferences
  - Endpoint: `GET /alerts/preferences`
  - **Expected**: Returns preferences list

- [ ] Can update single preference
  - Endpoint: `PATCH /alerts/preferences/signal_strong_buy`
  - **Expected**: Preference updated

- [ ] Can bulk update preferences
  - Endpoint: `PUT /alerts/preferences`
  - **Expected**: All preferences updated

---

## V2 SIGNAL TESTS

### Model B Fundamentals

- [ ] Can get fundamental metrics
  - Endpoint: `GET /fundamentals/metrics?ticker=BHP.AX`
  - **Expected**: Returns PE, PB, ROE, etc.

- [ ] Can get quality score
  - Endpoint: `GET /fundamentals/quality?ticker=BHP.AX`
  - **Expected**: Returns A-F grade

### Model B Signals

- [ ] Can get latest Model B signals
  - Endpoint: `GET /signals/model_b/latest`
  - **Expected**: Returns signals list

- [ ] Can get signal for specific ticker
  - Endpoint: `GET /signals/model_b/BHP.AX`
  - **Expected**: Returns signal for BHP

### Ensemble Signals

- [ ] Can get latest ensemble signals
  - Endpoint: `GET /signals/ensemble/latest`
  - **Expected**: Returns combined signals

- [ ] Can get ensemble signal for ticker
  - Endpoint: `GET /signals/ensemble/BHP.AX`
  - **Expected**: Returns ensemble signal

- [ ] Can compare signals
  - Endpoint: `GET /signals/compare?ticker=BHP.AX`
  - **Expected**: Returns Model A vs Model B comparison

- [ ] Ensemble shows agreement status
  - **Expected**: `signals_agree` and `conflict` fields present

---

## FRONTEND TESTS

### Dashboard

- [ ] Dashboard loads without errors
- [ ] Shows top signals
- [ ] Stats cards display correctly
- [ ] Can navigate to stock details

### Models Page

- [ ] Model status summary displays
- [ ] Ensemble signals table shows
- [ ] Filter buttons work (All, Agreement, No Conflict)
- [ ] Drift chart renders
- [ ] Feature importance chart renders

### Stock Detail Page

- [ ] Stock detail loads for valid ticker
- [ ] Signal badge displays
- [ ] Confidence gauge animates
- [ ] Price chart renders
- [ ] Can switch between Overview and Fundamentals tabs
- [ ] Fundamentals tab shows quality score
- [ ] Can add/remove from watchlist

### Portfolio Page

- [ ] Can upload portfolio CSV
- [ ] Holdings table displays correctly
- [ ] Shows current prices (if available)
- [ ] Shows signals (if available)
- [ ] Shows quality scores (if available)
- [ ] Can export to CSV
- [ ] Rebalancing suggestions display

### Settings Page

- [ ] Can view settings
- [ ] Can update theme
- [ ] Can toggle notifications
- [ ] Changes persist after refresh

---

## BACKGROUND JOBS TESTS

### Price Sync Job

- [ ] Run: `python3 jobs/sync_live_prices_job.py`
- [ ] **Expected**: Prices table updated
- [ ] **Verify**: `SELECT MAX(dt) FROM prices` shows recent date

### Model B Signal Generation

- [ ] Run: `python3 jobs/generate_signals_model_b.py`
- [ ] **Expected**: model_b_ml_signals table updated
- [ ] **Verify**: `SELECT COUNT(*) FROM model_b_ml_signals` > 0

### Ensemble Signal Generation

- [ ] Run: `python3 jobs/generate_ensemble_signals.py`
- [ ] **Expected**: ensemble_signals table updated
- [ ] **Verify**: `SELECT COUNT(*) FROM ensemble_signals` > 0

### Portfolio Price Sync

- [ ] Run price sync function:
  ```python
  from app.core import db_context
  with db_context() as conn:
      cur = conn.cursor()
      cur.execute('SELECT sync_all_portfolio_prices()')
      conn.commit()
  ```
- [ ] **Expected**: Holdings updated with current prices
- [ ] **Verify**: Holdings have `current_price` populated

---

## PERFORMANCE TESTS

### API Response Times

- [ ] `/health` responds in < 100ms
- [ ] `/auth/login` responds in < 500ms
- [ ] `/portfolio` responds in < 1s
- [ ] `/signals/ensemble/latest` responds in < 2s

### Database Queries

- [ ] Portfolio query with 100 holdings < 500ms
- [ ] Signal query for 200 symbols < 1s
- [ ] Notification query < 200ms

### Frontend Load Times

- [ ] Dashboard first load < 3s
- [ ] Page transitions < 500ms
- [ ] Stock detail page < 2s

---

## SECURITY TESTS

### Authentication Security

- [ ] Passwords are hashed (not stored in plaintext)
- [ ] JWT tokens expire (check exp claim)
- [ ] Cannot access other user's data
- [ ] API key validation works
- [ ] SQL injection protected (try `' OR '1'='1`)

### Data Access Control

- [ ] Users can only see their own portfolios
- [ ] Users can only see their own notifications
- [ ] Cannot access admin endpoints without auth
- [ ] Cannot delete other user's holdings

---

## ERROR HANDLING TESTS

### API Errors

- [ ] 404 for nonexistent resources
- [ ] 400 for invalid input
- [ ] 401 for missing auth
- [ ] 403 for insufficient permissions
- [ ] 500 errors logged to Sentry (if enabled)

### Frontend Errors

- [ ] API errors display user-friendly messages
- [ ] Network errors handled gracefully
- [ ] Loading states show during API calls
- [ ] Error boundaries catch React errors

---

## REGRESSION TESTS

### V1 Functionality (Must Still Work)

- [ ] Model A signals still generate
- [ ] Model A endpoints functional
- [ ] Existing workflows unchanged
- [ ] Backward compatibility maintained

### V2 Functionality

- [ ] Model B signals generate
- [ ] Ensemble signals calculate correctly
- [ ] Fundamentals data fetched
- [ ] Quality scores computed

---

## ACCESSIBILITY TESTS

### Keyboard Navigation

- [ ] Can tab through forms
- [ ] Can submit with Enter key
- [ ] Can close modals with Escape
- [ ] Focus visible on interactive elements

### Screen Reader

- [ ] Buttons have aria-labels
- [ ] Form inputs have labels
- [ ] Error messages announced
- [ ] Tables have proper headers

---

## BROWSER COMPATIBILITY

Test in:

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

---

## SIGN-OFF

**Tested By**: _______________

**Date**: _______________

**Environment**: ☐ Local  ☐ Staging  ☐ Production

**All Critical Tests Passed**: ☐ Yes  ☐ No

**Issues Found**: _______________

**Ready for Deployment**: ☐ Yes  ☐ No

---

## NOTES

Use this space to document any issues, observations, or special conditions during testing:

```
[Your notes here]
```
