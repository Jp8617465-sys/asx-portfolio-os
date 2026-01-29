# ASX Portfolio OS - Complete User Journeys

**Last Updated**: January 29, 2026
**Version**: 0.5.0
**Status**: Production Ready (Pending HttpOnly Cookie Implementation)

---

## OVERVIEW

This document describes all complete user journeys through the ASX Portfolio OS platform.

### Journey Status

| Journey | Status | Pages | Endpoints | Notes |
|---------|--------|-------|-----------|-------|
| Registration | ✅ Ready | `/register` | `POST /auth/register` | Working |
| Login | ✅ Ready | `/login` | `POST /auth/login` | Working |
| Portfolio Upload | ✅ Ready | `/app/portfolio` | `POST /portfolio/upload` | Secure with JWT |
| Stock Research | ✅ Ready | `/stock/[ticker]` | Multiple | Real data |
| Model Monitoring | ✅ Ready | `/app/models` | Multiple | V2 complete |
| Watchlist | ✅ Ready | Dashboard, stock pages | `GET/POST/DELETE /watchlist` | New |
| Notifications | ⚠️ Partial | `/app/alerts` | `GET /notifications` | No email/push yet |

---

## JOURNEY 1: NEW USER REGISTRATION

### Pages Involved
- Landing page: `/`
- Registration: `/register`
- Dashboard: `/app/dashboard`

### User Flow

```
1. User visits https://asxportfolio.com
   └─ Sees landing page with features, sample signals, pricing

2. User clicks "Get Started" button
   └─ Redirects to /register

3. Registration form loads
   ├─ Username field (3-50 chars, alphanumeric + _ -)
   ├─ Email field (validated)
   ├─ Full name field (optional)
   ├─ Password field (min 8 chars)
   │  └─ Shows strength meter (weak/medium/strong)
   ├─ Confirm password field
   └─ Terms of service checkbox

4. User fills form and submits
   └─ Frontend validates inputs client-side

5. POST /auth/register
   ├─ Backend validates username uniqueness
   ├─ Backend validates email uniqueness
   ├─ Backend hashes password with bcrypt
   ├─ Creates user_accounts row
   ├─ Creates default user_settings
   └─ Returns JWT token + user info

6. Frontend stores token in localStorage
   └─ Sets user data in local state

7. Redirects to /app/dashboard
   └─ Dashboard loads with empty portfolio

8. User sees welcome banner
   └─ "Welcome! Upload your portfolio to get started"
```

### API Endpoints
- `POST /auth/register`
- `GET /auth/me` (verify token works)

### Success Criteria
- User can register with unique username/email
- Password is hashed (never stored plain text)
- JWT token returned immediately
- User can access dashboard without re-login
- Rate limit prevents spam registrations (3/hour)

---

## JOURNEY 2: EXISTING USER LOGIN

### Pages Involved
- Landing page: `/`
- Login: `/login`
- Dashboard: `/app/dashboard`

### User Flow

```
1. User visits https://asxportfolio.com
   └─ Sees landing page

2. User clicks "Sign In" button
   └─ Redirects to /login

3. Login form loads
   ├─ Username or Email field
   ├─ Password field
   ├─ "Remember me" checkbox
   └─ "Forgot password?" link

4. User enters credentials and submits
   └─ Frontend validates non-empty fields

5. POST /auth/login
   ├─ Backend queries user_accounts by username or email
   ├─ Verifies password with bcrypt
   ├─ Checks is_active = true
   ├─ Updates last_login_at timestamp
   └─ Returns JWT token + user info

6. Frontend stores token in localStorage
   └─ Sets user data in state

7. Redirects to /app/dashboard
   └─ Dashboard loads user's watchlist, alerts

8. Protected routes now accessible
   ├─ /app/portfolio
   ├─ /app/models
   ├─ /app/alerts
   └─ /app/assistant
```

### API Endpoints
- `POST /auth/login`
- `GET /auth/me`

### Error Scenarios
- **Wrong password**: Returns 401 "Incorrect username or password"
- **Inactive account**: Returns 403 "Account is inactive"
- **Rate limited**: Returns 429 after 5 failed attempts in 15 minutes

### Success Criteria
- User can log in with username or email
- Dashboard loads with personalized data
- Token grants access to all protected routes
- Failed attempts are rate limited

---

## JOURNEY 3: PORTFOLIO UPLOAD & ANALYSIS

### Pages Involved
- Dashboard: `/app/dashboard`
- Portfolio: `/app/portfolio`

### User Flow

```
1. User logs in → Dashboard
   └─ Sees "Upload Portfolio" CTA

2. User navigates to /app/portfolio
   └─ Portfolio page loads

3. User clicks "Upload Portfolio" button
   └─ File picker dialog opens

4. User selects CSV file
   Example format:
   ticker,shares,avg_cost,date_acquired
   BHP.AX,100,42.50,2023-06-15
   CBA.AX,50,98.00,2023-08-20
   WES.AX,75,45.30,2023-09-10

5. POST /portfolio/upload
   ├─ user_id extracted from JWT token (SECURE)
   ├─ Backend parses CSV
   ├─ Validates ticker symbols
   ├─ Creates/updates user_portfolios row
   ├─ Creates user_holdings rows
   ├─ Calls sync_holding_prices() for each holding
   └─ Returns portfolio_id + holdings_count

6. Portfolio table updates showing:
   ├─ Ticker symbol
   ├─ Company name
   ├─ Shares owned
   ├─ Average cost
   ├─ Current price (from prices table)
   ├─ Current value (shares × price)
   ├─ Unrealized P&L ($ and %)
   ├─ Signal badge (from model_a_ml_signals)
   └─ Quality score (from model_b_ml_signals)

7. User clicks "Analyze Portfolio"
   └─ POST /portfolio/analyze

8. Backend processing:
   ├─ Calls sync_portfolio_prices() stored procedure
   ├─ Enriches holdings with:
   │  ├─ Latest prices from prices table
   │  ├─ Model A signals (momentum-based)
   │  ├─ Model B quality scores (fundamentals)
   │  └─ Ensemble recommendations
   └─ Updates portfolio totals

9. Portfolio view refreshes with:
   ├─ Updated prices and values
   ├─ Current signals for each holding
   ├─ Total portfolio value
   ├─ Total unrealized P&L
   └─ Signal distribution chart

10. Rebalancing panel appears with AI suggestions:
    ├─ "SELL CBA.AX - Signal: SELL (72% conf), Quality: C"
    ├─ "HOLD BHP.AX - Signal: BUY (87% conf), Quality: A"
    └─ "ADD WES.AX - Signal: STRONG_BUY (82% conf), Quality: B"
```

### API Endpoints
- `POST /portfolio/upload`
- `GET /portfolio`
- `POST /portfolio/analyze`
- `GET /portfolio/rebalancing`
- `GET /portfolio/risk-metrics`

### Data Flow
```
CSV File → FastAPI → user_portfolios table
                  └→ user_holdings table
                  └→ sync_holding_prices() → Enriched holdings
                  └→ sync_portfolio_prices() → Portfolio totals
```

### Success Criteria
- User can upload CSV with holdings
- All tickers validated against universe table
- Current prices fetched from prices table
- Signals pulled from model_a_ml_signals and model_b_ml_signals
- Rebalancing suggestions generated based on signals
- User cannot access other users' portfolios

---

## JOURNEY 4: STOCK RESEARCH & SIGNAL ANALYSIS

### Pages Involved
- Dashboard: `/app/dashboard`
- Stock detail: `/stock/[ticker]`

### User Flow

```
1. User on dashboard sees "Top Signals Today"
   Example: BHP.AX - STRONG BUY (87% confidence)

2. User clicks on BHP.AX
   └─ Navigates to /stock/BHP.AX

3. Stock detail page loads

   ┌─────────────────────────────────────────────────────────┐
   │ HEADER SECTION                                          │
   ├─────────────────────────────────────────────────────────┤
   │ BHP Group Ltd                        $45.32  ↑ +3.2%   │
   │ [STRONG BUY - 87%]                   [Add to Watchlist] │
   └─────────────────────────────────────────────────────────┘

   ┌─────────────────────────────────────────────────────────┐
   │ MODEL COMPARISON PANEL (V2 Feature)                     │
   ├─────────────────────────────────────────────────────────┤
   │  ┌─────────┐  ┌─────────┐  ┌──────────────┐            │
   │  │ Model A │  │ Model B │  │  Ensemble    │            │
   │  │Technical│  │Fundmtls │  │  Combined    │            │
   │  ├─────────┤  ├─────────┤  ├──────────────┤            │
   │  │STRONG   │  │  BUY    │  │ STRONG BUY   │            │
   │  │  BUY    │  │Quality:A│  │   89% conf   │            │
   │  │87% conf │  │         │  │              │            │
   │  │   [━]   │  │   [A]   │  │    [━━]      │            │
   │  └─────────┘  └─────────┘  └──────────────┘            │
   │                                                          │
   │  ✅ Models Agree - Both technical and fundamental       │
   │     analysis support this signal                        │
   └─────────────────────────────────────────────────────────┘

   ┌─────────────────────────────────────────────────────────┐
   │ PRICE CHART (Real Data)                                 │
   ├─────────────────────────────────────────────────────────┤
   │  [3M] [6M] [1Y] [2Y] [5Y]  ← Timeframe selector        │
   │                                                          │
   │   $50 ┤              ╱╲                                 │
   │       │             ╱  ╲      ╱╲                        │
   │   $45 ┤            ╱    ╲    ╱  ╲                       │
   │       │           ╱      ╲  ╱    ╲╱                     │
   │   $40 ┤     ╱╲   ╱        ╲╱                            │
   │       └──────────────────────────────                   │
   │        Jan   Feb   Mar   Apr   May                      │
   │                                                          │
   │  Volume bars below price chart                          │
   └─────────────────────────────────────────────────────────┘

   ┌─────────────────────────────────────────────────────────┐
   │ TABS: [Overview] [Fundamentals]                         │
   └─────────────────────────────────────────────────────────┘

   OVERVIEW TAB:
   ├─ Signal Reasoning Panel
   │  "Why STRONG BUY?"
   │  ├─ Momentum Score: +0.45 (positive)
   │  ├─ Volume Trend: +0.32 (increasing)
   │  ├─ RSI: -0.15 (slightly overbought)
   │  └─ MA Crossover: +0.28 (bullish)
   │
   └─ Historical Accuracy Display
      "Model Performance on BHP.AX"
      ├─ STRONG_BUY: 72% accurate (8/11 correct)
      ├─ BUY: 65% accurate (10/15 correct)
      └─ Overall: 68% win rate

   FUNDAMENTALS TAB:
   ├─ Quality Score: A (top 20%)
   ├─ Valuation Metrics
   │  ├─ P/E Ratio: 12.3 (vs industry 15.2)
   │  ├─ P/B Ratio: 1.8
   │  └─ Market Cap: $145B
   ├─ Profitability
   │  ├─ ROE: 18.5%
   │  ├─ Profit Margin: 22.1%
   │  └─ EPS: $3.67
   └─ Growth Metrics
      ├─ Revenue Growth: 8.2% YoY
      └─ EPS Growth: 12.4%

4. User clicks "Add to Watchlist"
   └─ POST /watchlist with ticker

5. Watchlist updated
   └─ Heart icon changes to filled
   └─ Stock appears on dashboard watchlist
```

### API Endpoints
- `GET /signals/live/{ticker}` - Current signal
- `GET /signals/{ticker}/reasoning` - SHAP explanation
- `GET /signals/compare?ticker={ticker}` - Model A vs B vs Ensemble
- `GET /fundamentals/metrics?ticker={ticker}` - Financial metrics
- `GET /fundamentals/quality?ticker={ticker}` - Quality score
- `GET /prices/{ticker}/history` - OHLC chart data
- `GET /accuracy/{ticker}` - Historical model performance
- `POST /watchlist` - Add to watchlist
- `GET /watchlist` - Get user's watchlist
- `DELETE /watchlist/{ticker}` - Remove from watchlist

### Data Sources
- **Prices**: `prices` table (from EODHD API)
- **Signals**: `model_a_ml_signals` table
- **Quality**: `model_b_ml_signals` table
- **Ensemble**: `ensemble_signals` table
- **Fundamentals**: `fundamentals` table
- **Company Info**: `universe` table

### Success Criteria
- All data is real (no mock/random data)
- Chart shows historical price movements
- Signal reasoning explains decision
- Model comparison shows A, B, and Ensemble
- Fundamentals tab shows real financial metrics
- Watchlist persists across sessions

---

## JOURNEY 5: MODEL MONITORING & DRIFT ANALYSIS

### Pages Involved
- Models page: `/app/models`
- Stock detail: `/stock/[ticker]`

### User Flow

```
1. User navigates to /app/models
   └─ Models overview page loads

2. Model Status Cards
   ┌─────────────────────────────────────────┐
   │ Model A v1.1 (Momentum)                 │
   ├─────────────────────────────────────────┤
   │ ROC-AUC: 0.84                           │
   │ RMSE: 0.12                              │
   │ Drift Status: Low (PSI < 0.1)           │
   │ Status: ✅ Active                       │
   │ Last Trained: Jan 15, 2026              │
   └─────────────────────────────────────────┘

   ┌─────────────────────────────────────────┐
   │ Model B v1.0 (Fundamentals)             │
   ├─────────────────────────────────────────┤
   │ Quality Score: A                        │
   │ Coverage: 95% of ASX200                 │
   │ Status: ✅ Active                       │
   │ Last Updated: Jan 28, 2026              │
   └─────────────────────────────────────────┘

3. Drift Monitoring Chart
   ├─ X-axis: Date (last 90 days)
   ├─ Y-axis: PSI Score
   └─ Lines for each feature:
      ├─ momentum (blue) - PSI: 0.08 ✅
      ├─ volume_ma_ratio (green) - PSI: 0.15 ⚠️
      └─ rsi (red) - PSI: 0.22 🔴

4. Feature Importance Chart
   Top features by SHAP value:
   1. momentum: 0.45 ████████████████████
   2. volume_trend: 0.32 ██████████████
   3. ma_cross: 0.28 ████████████
   4. rsi: 0.18 ████████
   5. pe_ratio: 0.15 ██████

5. Ensemble Signals Table (V2)
   ┌─────────┬───────────┬──────────┬───────────┬──────────┐
   │ Symbol  │ Model A   │ Model B  │ Ensemble  │ Agreement│
   ├─────────┼───────────┼──────────┼───────────┼──────────┤
   │ BHP.AX  │ STRONG_BUY│ BUY (A)  │ STRONG_BUY│ ✅ Agree │
   │         │ 87% conf  │          │ 89% conf  │          │
   ├─────────┼───────────┼──────────┼───────────┼──────────┤
   │ CBA.AX  │ SELL      │ BUY (B)  │ HOLD      │ ⚠️ Confct│
   │         │ 72% conf  │          │ 65% conf  │          │
   ├─────────┼───────────┼──────────┼───────────┼──────────┤
   │ WES.AX  │ BUY       │ BUY (A)  │ BUY       │ ✅ Agree │
   │         │ 78% conf  │          │ 80% conf  │          │
   └─────────┴───────────┴──────────┴───────────┴──────────┘

6. Filter options:
   ├─ [All Signals] - Show everything
   ├─ [Agreement Only] - Models agree
   └─ [Conflicts] - Models disagree

7. User clicks "View Details" on BHP.AX
   └─ Redirects to /stock/BHP.AX with full analysis
```

### API Endpoints
- `GET /model/status/summary` - Model metadata
- `GET /drift/summary` - Drift audit history
- `GET /insights/feature-importance` - SHAP feature rankings
- `GET /signals/ensemble/latest` - All ensemble signals
- `GET /signals/compare?ticker={ticker}` - Compare models

### Success Criteria
- Model cards show real training metrics
- Drift chart displays historical PSI scores
- Feature importance reflects actual model
- Ensemble table shows all three signals
- Conflict detection works correctly
- Filter buttons work

---

## JOURNEY 6: WATCHLIST MANAGEMENT

### Pages Involved
- Dashboard: `/app/dashboard`
- Stock detail: `/stock/[ticker]`

### User Flow

```
1. User researches BHP.AX on stock detail page
   └─ Sees "Add to Watchlist" button

2. User clicks "Add to Watchlist"
   ├─ POST /watchlist with ticker="BHP.AX"
   ├─ Backend creates user_watchlist row
   ├─ Returns success confirmation
   └─ Button changes to "In Watchlist" (filled heart icon)

3. User navigates to /app/dashboard
   └─ Watchlist table loads

4. GET /watchlist
   ├─ Backend queries user_watchlist for user_id
   ├─ Joins with universe for stock names
   ├─ Joins with prices for current price
   ├─ Joins with model_a_ml_signals for signals
   ├─ Joins with model_b_ml_signals for quality
   └─ Returns enriched watchlist items

5. Watchlist table displays:
   ├─ Ticker symbol
   ├─ Company name
   ├─ Current price
   ├─ Price change % today
   ├─ Signal badge
   ├─ Confidence %
   ├─ Quality score
   └─ Remove button (X icon)

6. User clicks "View Details" on BHP.AX
   └─ Navigates to /stock/BHP.AX

7. User returns to dashboard

8. User clicks Remove (X) on CBA.AX
   ├─ DELETE /watchlist/CBA.AX
   ├─ Backend deletes from user_watchlist
   └─ Row disappears from table
```

### API Endpoints
- `POST /watchlist` - Add stock
- `GET /watchlist` - Get all items with enriched data
- `DELETE /watchlist/{ticker}` - Remove stock

### Database Schema
```sql
CREATE TABLE user_watchlist (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES user_accounts(user_id),
    ticker VARCHAR(20) NOT NULL,
    added_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, ticker)
);
```

### Success Criteria
- Watchlist persists across sessions
- Shows real-time prices and signals
- Add/remove operations instant
- Each user sees only their watchlist
- Duplicate prevention (UNIQUE constraint)

---

## JOURNEY 7: NOTIFICATIONS & ALERTS

### Pages Involved
- All pages: Notification bell in header
- Alerts settings: `/app/alerts`

### User Flow

```
1. User logs in → Dashboard
   └─ Notification bell shows count badge (e.g., "3")

2. User clicks bell icon
   └─ Dropdown opens with recent notifications:

   ├─ 🔔 CBA.AX changed to SELL signal (2 hours ago)
   ├─ 🔔 BHP.AX reached 90% confidence (5 hours ago)
   └─ 🔔 Portfolio rebalancing suggested (1 day ago)

3. User clicks notification
   ├─ PUT /notifications/{id}/read
   ├─ Marks as read
   └─ Redirects to relevant page (e.g., /stock/CBA.AX)

4. User navigates to /app/alerts
   └─ Alert preferences page loads

5. GET /alerts/preferences
   └─ Returns current settings

6. Settings displayed:
   ┌─────────────────────────────────────────┐
   │ NOTIFICATION CHANNELS                   │
   ├─────────────────────────────────────────┤
   │ [✓] Email notifications                 │
   │ [✓] Browser push notifications          │
   │ [ ] SMS alerts (Premium)                │
   └─────────────────────────────────────────┘

   ┌─────────────────────────────────────────┐
   │ ALERT TYPES                             │
   ├─────────────────────────────────────────┤
   │ [✓] Signal changes                      │
   │ [✓] High confidence signals (80%+)      │
   │ [✓] Significant price movements (5%+)   │
   │ [✓] Watchlist updates                   │
   │ [✓] Portfolio rebalancing suggestions   │
   └─────────────────────────────────────────┘

   ┌─────────────────────────────────────────┐
   │ DAILY DIGEST                            │
   ├─────────────────────────────────────────┤
   │ [✓] Send daily digest: 08:00 AM AEST   │
   │ [✓] Include top signals                 │
   │ [✓] Include portfolio summary           │
   └─────────────────────────────────────────┘

7. User adjusts threshold for high confidence alerts
   ├─ Changes 80% → 85%
   └─ PATCH /alerts/preferences/signal_high_confidence

8. Settings saved
   └─ Confirmation message shown
```

### API Endpoints
- `GET /notifications` - Get unread notifications
- `PUT /notifications/{id}/read` - Mark as read
- `POST /notifications/mark-all-read` - Mark all as read
- `GET /alerts/preferences` - Get alert settings
- `PATCH /alerts/preferences/{alert_type}` - Update specific alert

### Current Limitations
- Email/push notifications NOT yet sent (preferences stored only)
- Daily digest NOT yet scheduled
- Notifications created manually via API (no background job yet)

### Success Criteria
- Notification bell shows count
- Dropdown displays recent notifications
- Mark as read works
- Preferences can be updated
- Settings persist across sessions

---

## JOURNEY 8: AI ASSISTANT (OPTIONAL FEATURE)

### Pages Involved
- Assistant: `/app/assistant`

### Prerequisites
- `OPENAI_API_KEY` must be set
- `ENABLE_ASSISTANT=true`

### User Flow

```
1. User navigates to /app/assistant
   └─ Chat interface loads

2. Pre-seeded example questions shown:
   ├─ "Why did BHP.AX get a STRONG BUY signal?"
   ├─ "What's driving drift in momentum features?"
   ├─ "Should I rebalance my portfolio now?"
   └─ "Compare Model A and Model B for CBA.AX"

3. User types: "Why did CBA.AX signal change to SELL?"

4. POST /assistant/chat
   ├─ Backend retrieves context:
   │  ├─ Recent signals for CBA.AX
   │  ├─ SHAP reasoning values
   │  ├─ User's portfolio (if owns CBA)
   │  └─ Price history
   ├─ Sends to OpenAI API with context
   └─ Returns AI-generated response

5. AI explains:
   "CBA.AX signal changed to SELL because:
   1. Momentum score decreased from +0.35 to -0.22
   2. Price broke below 50-day moving average
   3. Increasing volume on down days (distribution)
   4. Model B quality score deteriorated (B → C)
   5. Ensemble now recommends SELL (78% confidence)"

6. User continues conversation
   └─ Follow-up questions answered with context
```

### API Endpoints
- `POST /assistant/chat`

### Status
- Backend: Implemented but requires OPENAI_API_KEY
- Frontend: Component ready (`AssistantClient.tsx`)
- Default: Disabled in production

---

## DATA FLOW ARCHITECTURE

### Background Jobs (Scheduled Daily)

```
2:00 AM UTC - sync_live_prices_job.py
  └─ Fetches latest prices from EODHD
  └─ Inserts into prices table

2:05 AM UTC - load_fundamentals_pipeline.py
  └─ Fetches fundamental data from EODHD
  └─ Inserts into fundamentals table

2:10 AM UTC - generate_signals.py (Model A)
  └─ Reads prices table
  └─ Computes technical indicators
  └─ Runs LightGBM classifier
  └─ Inserts into model_a_ml_signals

2:15 AM UTC - generate_signals_model_b.py
  └─ Reads fundamentals table
  └─ Computes quality scores (A-F)
  └─ Inserts into model_b_ml_signals

2:20 AM UTC - generate_ensemble_signals.py
  └─ Reads model_a_ml_signals + model_b_ml_signals
  └─ Combines with 60/40 weighting
  └─ Detects conflicts
  └─ Inserts into ensemble_signals

3:00 AM UTC (Weekly) - audit_drift_job.py
  └─ Calculates PSI scores
  └─ Inserts into model_a_drift_audit
```

### Request Flow

```
User Browser → Frontend (Next.js) → Backend (FastAPI) → PostgreSQL

Example: Portfolio Upload
1. User selects CSV file
2. POST /portfolio/upload with JWT token
3. FastAPI extracts user_id from token
4. Parses CSV and validates tickers
5. Inserts into user_portfolios + user_holdings
6. Calls sync_holding_prices() stored procedure
7. Returns enriched portfolio to frontend
8. React component updates UI
```

---

## TESTING USER JOURNEYS

### Manual Test Script

```bash
# 1. Test Registration
curl -X POST http://localhost:8788/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser1",
    "email": "test1@example.com",
    "password": "SecurePass123!"
  }'
# Should return: {"access_token": "...", "user": {...}}

# 2. Test Login
curl -X POST http://localhost:8788/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser1", "password": "SecurePass123!"}'
# Should return: {"access_token": "...", "user": {...}}

# 3. Test Portfolio Upload (with token)
TOKEN="paste-token-here"
curl -X POST http://localhost:8788/portfolio/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F 'file=@test_portfolio.csv'
# Should return: {"status": "success", "holdings_count": N}

# 4. Test Watchlist
curl -X POST http://localhost:8788/watchlist \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ticker": "BHP.AX"}'
# Should return: {"status": "success", "message": "BHP.AX added to watchlist"}

# 5. Test Stock Search
curl http://localhost:8788/search?q=BHP
# Should return: {"query": "BHP", "results": [...], "count": N}
```

---

## BROWSER TESTING CHECKLIST

### Registration Journey
- [ ] Visit `/register` page
- [ ] Enter username (test validation: too short, invalid chars)
- [ ] Enter email (test validation: invalid format)
- [ ] Enter password (verify strength meter updates)
- [ ] Enter mismatched password confirmation (verify error shown)
- [ ] Submit form with valid data
- [ ] Verify redirects to `/app/dashboard`
- [ ] Verify dashboard shows welcome message

### Login Journey
- [ ] Visit `/login` page
- [ ] Enter valid credentials
- [ ] Verify redirects to dashboard
- [ ] Verify watchlist loads (if user has items)
- [ ] Log out (clear localStorage)
- [ ] Visit `/app/dashboard` directly
- [ ] Verify redirects to `/login` (middleware protection)

### Portfolio Journey
- [ ] Navigate to `/app/portfolio`
- [ ] Click "Upload Portfolio"
- [ ] Select valid CSV file
- [ ] Verify upload succeeds
- [ ] Verify holdings table populates with real data
- [ ] Click "Analyze Portfolio"
- [ ] Verify signals appear
- [ ] Verify quality scores appear
- [ ] Check rebalancing suggestions panel

### Stock Research Journey
- [ ] Type "BHP" in search bar
- [ ] Select BHP.AX from results
- [ ] Verify stock page loads
- [ ] Verify price chart shows real data (not random)
- [ ] Verify Model Comparison Panel shows A, B, Ensemble
- [ ] Switch to Fundamentals tab
- [ ] Verify real P/E, ROE, etc. appear (not mock)
- [ ] Click "Add to Watchlist"
- [ ] Navigate back to dashboard
- [ ] Verify BHP.AX appears in watchlist

### Model Monitoring Journey
- [ ] Navigate to `/app/models`
- [ ] Verify model status cards load
- [ ] Verify drift chart renders
- [ ] Verify feature importance chart renders
- [ ] Verify ensemble signals table loads
- [ ] Click filter "Agreement Only"
- [ ] Verify table filters correctly
- [ ] Click "View Details" on a stock
- [ ] Verify redirects to stock page

---

## AUTOMATED E2E TESTS

Run with:
```bash
pytest tests/test_user_journeys.py -v
```

Tests include:
- Registration flow
- Login flow
- Portfolio upload and analysis
- Stock research and watchlist
- Model monitoring
- Security enforcement (no spoofing)
- No mock data validation

---

## PRODUCTION READINESS SUMMARY

### ✅ Production Ready
1. User registration and login
2. JWT-based authentication
3. Portfolio upload and management
4. Stock research with real data
5. Model monitoring and comparison
6. Watchlist management
7. Rate limiting active
8. No hardcoded credentials
9. User data isolation enforced

### ⚠️ Phase 2 Improvements
1. HttpOnly cookie implementation
2. Email verification
3. Password reset flow
4. Refresh token rotation
5. Email/push notification delivery
6. Daily digest scheduling
7. Real-time WebSocket updates

### 🔒 Security Status
- **Critical vulnerabilities**: ✅ FIXED
- **Authentication**: ✅ SECURE (JWT with short expiration)
- **Authorization**: ✅ ENFORCED (user_id from token)
- **Rate limiting**: ✅ ACTIVE
- **API key exposure**: ✅ REMOVED
- **Demo credentials**: ✅ REMOVED

**Recommendation**: Ready for production deployment with current security posture. Phase 2 improvements should be implemented within first month of operation.

---

## NEXT STEPS

1. **Week 1**: Deploy to staging environment
2. **Week 1-2**: User acceptance testing
3. **Week 2**: Load testing (100 concurrent users)
4. **Week 3**: Security penetration testing
5. **Week 4**: Production deployment
6. **Month 2**: Implement Phase 2 security improvements
