# ASX Portfolio Intelligence Platform: V1-V5 Implementation Plan

**Date**: January 28, 2026
**Status**: V1 Production Ready → Planning V2-V5
**Purpose**: Concrete implementation roadmap from current state to V5

---

## EXECUTIVE SUMMARY

This document translates the strategic V1-V5 roadmap into actionable implementation tasks. The platform evolves from a single-model momentum signal system (V1) to a comprehensive multi-asset financial intelligence platform (V5) over 18-24 months.

**Development Approach**: Using Claude Code as dev team with existing infrastructure (Render, Vercel, Supabase)
**Total Investment**: $1,470-$3,570 (infrastructure only, no personnel costs)
**Your Time**: ~28 weeks working with Claude Code over 18 months

**Current State**: V1 Production Ready
- Model A (momentum) with 0.68 ROC-AUC
- 46 production APIs
- 9-page Next.js frontend
- 1.2M historical price records
- Daily pipeline operational

**Implementation Timeline**:
- **V1**: ✅ Complete (Jan 2026)
- **V2**: Q2 2026 (4 weeks with Claude Code)
- **V3**: Q4 2026 (8 weeks with Claude Code)
- **V4**: Q2 2027 (8 weeks with Claude Code)
- **V5**: Q4 2027 (8 weeks with Claude Code)

---

## V1 STATUS: PRODUCTION READY ✅

### What's Complete

**Core Capabilities**:
- ✅ Model A (momentum-based LightGBM) trained and validated
- ✅ 12 technical indicators (momentum, volatility, trend, volume)
- ✅ 5-tier signal system (STRONG_BUY → STRONG_SELL)
- ✅ Daily pipeline (sync prices → compute features → generate signals)
- ✅ Portfolio management (CSV upload, holdings tracking, rebalancing)
- ✅ 46 REST API endpoints with rate limiting
- ✅ 9-page Next.js frontend with dark mode
- ✅ Data integrity audit (no leakage detected)
- ✅ 40% test coverage on critical paths

**Infrastructure**:
- ✅ Backend: FastAPI on Render
- ✅ Database: PostgreSQL on Supabase (1.2M records)
- ✅ ML Models: LightGBM classifier + regressor
- ✅ Monitoring: Sentry error tracking
- ✅ CI/CD: GitHub Actions + Husky hooks

**Performance**:
- Model: ROC-AUC 0.68, Accuracy 62%
- API: 3-4s latency (to be optimized to <500ms)
- Data: Daily updates by 9am AEST

### What's NOT in V1 (Deliberately)

- ❌ Model B (fundamentals) - planned for V2
- ❌ Model C (sentiment) - planned for V3
- ❌ Ensemble strategy - planned for V2
- ❌ Real-time alerts - planned for V3
- ❌ Portfolio optimization - planned for V4
- ❌ Multi-asset support - planned for V5
- ❌ Tax optimization - planned for V5

### V1 Remaining Tasks (Pre-V2)

**Priority 1 (Required)**:
- [ ] Deploy frontend to Vercel (15 min)
- [ ] Production smoke test (10 min)
- [ ] Apply database indexes (`schemas/add_indexes.sql`)
- [ ] Set up uptime monitoring (UptimeRobot)

**Priority 2 (Optional)**:
- [ ] Optimize API latency to <500ms (pre-compute features)
- [ ] Increase frontend test coverage to 80%
- [ ] Create OpenAPI documentation

---

## V2: FUNDAMENTAL INTELLIGENCE (Q2 2026)

### Version Intent

**Problem**: "Are these stocks fundamentally sound?"
**Solution**: Dual-signal system combining momentum (Model A) + fundamentals (Model B)
**Timeline**: 4 weeks working with Claude Code
**Investment**: $0-$150 (infrastructure only)
**Status**: 🟡 Planning

### Bootstrap Strategy

**Option A (Free)**:
- Use `yfinance` Python library for fundamental data
- Pros: $0 cost, quick setup
- Cons: Less reliable, rate limits, no official support
- **Total V2 Cost: $0**

**Option B (Recommended)**:
- Use EODHD Fundamentals API ($50/month × 3 months)
- Pros: Reliable, comprehensive data, official API
- Cons: $150 total cost
- **Total V2 Cost: $150**

### Key Capabilities

1. **Model B: Fundamental Analysis**
   - Features: P/E, P/B, debt/equity, ROE, revenue growth, profit margin
   - Output: Fundamental quality score (A-F)
   - Training: 500 largest ASX stocks, 3 years data
   - Target: 6-month forward return quintiles

2. **Ensemble Strategy**
   - Simple weighted average (60% Model A, 40% Model B)
   - Conflict detection (when models disagree)
   - Final signal: STRONG_BUY only if both agree

3. **Data Ingestion**
   - Source: EODHD Fundamentals API
   - Frequency: Weekly updates
   - Coverage: 500 stocks → expand to 2000

4. **Frontend Updates**
   - Dual signal display: [Momentum: BUY] [Fundamentals: A]
   - Fundamental metrics tab on stock detail page
   - Filter: "Show only stocks where both models agree"
   - Portfolio: Fundamental quality per holding

### Implementation Tasks

#### Phase 1: Data Infrastructure (Week 1-2)

**Task 1.1: Set up fundamentals data source**
- [ ] Register EODHD Fundamentals API (or Yahoo Finance)
- [ ] Test API endpoints for ASX stocks
- [ ] Document API rate limits and costs
- [ ] Add API key to environment variables

**Task 1.2: Create fundamentals ingestion pipeline**
- [ ] Create `jobs/sync_fundamentals.py`
  - Fetch P/E, P/B, debt/equity, ROE, revenue_growth, profit_margin
  - Validate data quality (no negative P/E > 1000)
  - Handle missing data (NaN for stocks without financials)
- [ ] Create database table `model_b_fundamentals_data`
- [ ] Schedule weekly cron job on Render
- [ ] Test ingestion for 10 stocks

**Task 1.3: Fundamentals data validation**
- [ ] Create `tests/test_fundamentals_ingestion.py`
  - Test API response parsing
  - Test data validation logic
  - Test missing data handling
- [ ] Run integration test with test database

**Deliverable**: Weekly fundamentals data for 500 stocks

---

#### Phase 2: Model B Training (Week 3-4)

**Task 2.1: Feature engineering for fundamentals**
- [ ] Create `models/build_fundamental_features.py`
  - Normalize features (Z-score by sector)
  - Handle outliers (cap P/E at 100)
  - Sector encoding (one-hot for 11 GICS sectors)
- [ ] Create training dataset (500 stocks × 3 years = 1500 samples)
- [ ] Validate no data leakage (fundamentals at t, returns at t+180 days)

**Task 2.2: Train Model B**
- [ ] Create `models/train_model_b_fundamentals.py`
  - LightGBM classifier (5 quintiles)
  - 5-fold stratified cross-validation by sector
  - Target: 6-month forward return quintile
  - Features: 10 fundamental metrics
- [ ] Hyperparameter tuning (Optuna)
- [ ] Save model to `outputs/model_b_fundamentals_v1.pkl`
- [ ] Generate feature importance (SHAP)

**Task 2.3: Model B validation**
- [ ] Create `models/validate_model_b.py`
  - Precision on top quintile (target >65%)
  - Sector-balanced performance
  - Compare to naive baseline (equal-weight portfolio)
- [ ] Create validation report `outputs/model_b_validation.md`

**Deliverable**: Trained Model B with >65% precision on top quintile

---

#### Phase 3: Ensemble Strategy (Week 5)

**Task 3.1: Implement ensemble logic**
- [ ] Create `models/ensemble_strategy.py`
  - Weighted average: 60% Model A + 40% Model B
  - Conflict detection: Flag if signals disagree by >2 levels
  - Override rule: STRONG_BUY only if both agree
- [ ] Create `tests/test_ensemble.py`
  - Test weighted average calculation
  - Test conflict detection logic
  - Test override rules

**Task 3.2: Ensemble validation**
- [ ] Backtest ensemble on historical data
  - Compare ensemble vs Model A alone
  - Target: 5%+ improvement in Sharpe ratio
- [ ] Create ensemble performance report

**Deliverable**: Ensemble strategy with validated 5%+ Sharpe improvement

---

#### Phase 4: Backend API (Week 6-7)

**Task 4.1: Create Model B signal generation**
- [ ] Create `jobs/generate_model_b_signals.py`
  - Load fundamentals data
  - Load Model B
  - Generate signals for all stocks
  - Write to `model_b_fundamentals_signals` table
- [ ] Schedule daily cron job (after fundamentals sync)

**Task 4.2: Create new API endpoints**
- [ ] `GET /signals/fundamentals` - Model B signals only
- [ ] `GET /signals/ensemble` - Combined Model A + B signals
- [ ] `GET /fundamentals/metrics?ticker=CBA` - Raw fundamental data
- [ ] `GET /fundamentals/quality?ticker=CBA` - Quality score (A-F)
- [ ] `GET /model/compare_ensemble` - Model A vs B vs Ensemble comparison

**Task 4.3: Update existing endpoints**
- [ ] Update `GET /dashboard/model_a_v1_1` to include Model B column
- [ ] Update `GET /portfolio/holdings` to include fundamental quality
- [ ] Update `GET /portfolio/rebalancing` to consider fundamentals

**Task 4.4: API tests**
- [ ] Create `tests/test_model_b_api.py`
  - Test all new endpoints
  - Test ensemble calculation in API
  - Test error handling (missing fundamentals)

**Deliverable**: 5 new API endpoints operational

---

#### Phase 5: Frontend Updates (Week 8-9)

**Task 5.1: Dual signal display**
- [ ] Update `components/DashboardClient.tsx`
  - Add Model B column to signals table
  - Add conflict indicator (⚠️ when models disagree)
  - Add filter: "Only show stocks where models agree"
- [ ] Update `app/stock/[ticker]/page.tsx`
  - Add "Fundamentals" tab
  - Display P/E, P/B, ROE, revenue growth
  - Show Model B reasoning

**Task 5.2: Portfolio fundamental quality**
- [ ] Update `components/PortfolioFusionClient.tsx`
  - Add "Quality Score" column (A-F)
  - Add quality distribution chart
  - Show average quality score

**Task 5.3: Models comparison page**
- [ ] Update `app/models/page.tsx`
  - Add Model B performance chart
  - Add ensemble vs single-model comparison
  - Show agreement rate (% of time models agree)

**Task 5.4: Frontend tests**
- [ ] Update `frontend/__tests__/pages.test.tsx`
  - Test dual signal rendering
  - Test fundamentals tab
  - Test filter functionality

**Deliverable**: Frontend displays Model A + B signals

---

#### Phase 6: Testing & Deployment (Week 10-12)

**Task 6.1: Integration testing**
- [ ] End-to-end test: Fundamentals sync → Model B training → Signal generation → API → Frontend
- [ ] Load testing: 100 req/min on new endpoints
- [ ] Data quality monitoring: Track missing fundamental data

**Task 6.2: Documentation**
- [ ] Update `README.md` to include Model B
- [ ] Create `docs/MODEL_B_GUIDE.md`
  - How Model B works
  - Fundamental metrics explained
  - Ensemble strategy
- [ ] Update `API_DOCUMENTATION.md` with new endpoints

**Task 6.3: Deployment**
- [ ] Deploy backend to Render staging
- [ ] Run integration tests on staging
- [ ] Deploy backend to production
- [ ] Deploy frontend to Vercel
- [ ] Smoke test production

**Task 6.4: Monitoring**
- [ ] Set up alerts for fundamental data sync failures
- [ ] Monitor Model B signal distribution (not all HOLD)
- [ ] Track ensemble agreement rate (target: 60-70%)

**Deliverable**: V2 live in production

---

### V2 Success Criteria

**Technical**:
- [ ] Model B precision >65% on top quintile
- [ ] Ensemble Sharpe ratio 5%+ higher than Model A alone
- [ ] API latency <500ms for all endpoints
- [ ] Fundamentals data freshness <7 days
- [ ] Zero critical errors in first week

**User Experience**:
- [ ] Users can filter signals by "both models agree"
- [ ] Stock detail page shows fundamental metrics
- [ ] Portfolio shows fundamental quality per holding
- [ ] Models page shows Model A vs B comparison

**Business**:
- [ ] 20+ users try dual-signal filtering
- [ ] Positive feedback on fundamental quality score
- [ ] Signal distribution stable (not all HOLD or all BUY)

---

## V3: SENTIMENT & NEWS AWARENESS (Q4 2026)

### Version Intent

**Problem**: "What's the market saying about this stock?"
**Solution**: Triple-signal system: Momentum + Fundamentals + Sentiment
**Timeline**: 8 weeks working with Claude Code
**Investment**: $140-$1,120 (infrastructure only)
**Status**: 🔴 Not Started

### Bootstrap Strategy

**ASX Announcements** (choose one):
- Option A (Bootstrap): Web scraping with Beautiful Soup = $0
- Option B: ASX API = $100/month × 6 months = $600

**GPU for FinBERT Training** (choose one):
- Option A (Bootstrap): Google Colab Pro = $10/month × 2 months = $20
- Option B: AWS p3.2xlarge = $200/month × 2 months = $400

**SMS Alerts**:
- Twilio = $20/month × 6 months = $120 (required)

**Recommended Bootstrap Path**: Scraping + Colab Pro + Twilio = **$140 total**
**Maximum Cost Path**: ASX API + Colab Pro + Twilio = **$740 total**

### Key Capabilities

1. **Model C: Sentiment Analysis**
   - FinBERT fine-tuned on ASX announcements
   - Output: POSITIVE/NEUTRAL/NEGATIVE + confidence
   - Real-time ingestion (15-min polling)

2. **Ensemble V3**
   - Weighted: 40% Model A + 30% Model B + 30% Model C
   - Sentiment override: NEGATIVE announcement → downgrade BUY to HOLD

3. **Real-time Alerts**
   - Notify when sentiment changes for watchlist stocks
   - Email/SMS alerts (via Twilio)

### Implementation Tasks (High-Level)

**Phase 1: Data Infrastructure (Week 1-4)**
- [ ] Set up ASX announcements API or web scraper
- [ ] Create `jobs/sync_asx_announcements.py` (15-min cron)
- [ ] Build announcement database (`asx_announcements` table)

**Phase 2: NLP Pipeline (Week 5-8)**
- [ ] Fine-tune FinBERT on 10,000 ASX announcements
  - Label: Use price movement after announcement (±5%)
- [ ] Create `models/train_model_c_sentiment.py`
- [ ] Validate F1 score >0.75 on test set

**Phase 3: Real-time Processing (Week 9-12)**
- [ ] Create `jobs/analyze_sentiment_realtime.py`
- [ ] Implement alert system (`services/alerts.py`)
- [ ] Create alert endpoints (`GET /alerts/subscribe`)

**Phase 4: Frontend (Week 13-16)**
- [ ] News feed on dashboard
- [ ] Sentiment timeline chart on stock detail page
- [ ] Alert preferences page

**Phase 5: Ensemble V3 (Week 17-20)**
- [ ] Implement dynamic weight meta-learner (XGBoost)
- [ ] Backtest ensemble V3
- [ ] Deploy to production

**Phase 6: Testing & Deployment (Week 21-24)**
- [ ] Integration testing
- [ ] A/B testing (some users see V2, some see V3)
- [ ] Production deployment

### V3 Success Criteria

- [ ] Model C F1 score >0.75 on sentiment classification
- [ ] Ensemble V3 Sharpe ratio 3-5% higher than V2
- [ ] Alert precision >70% (price moves >2% within 3 days)
- [ ] 50+ users subscribe to alerts

---

## V4: PORTFOLIO OPTIMIZATION & RL (Q2 2027)

### Version Intent

**Problem**: "How should I allocate my portfolio?"
**Solution**: Portfolio-level optimization + reinforcement learning
**Timeline**: 8 weeks working with Claude Code
**Investment**: $20-$400 (infrastructure only)
**Status**: 🔴 Not Started

### Bootstrap Strategy

**GPU for RL Training** (choose one):
- Option A (Bootstrap): Google Colab Pro = $10/month × 2 months = **$20 total**
- Option B: AWS GPU (p3.2xlarge) = $200/month × 2 months = **$400 total**

**Recommended**: Use Colab Pro, checkpoint frequently, manage session limits = **$20 total**

### Key Capabilities

1. **Portfolio Optimization Engine**
   - Mean-variance optimization (Markowitz)
   - Constraints: Max position size, sector limits, min diversification

2. **Reinforcement Learning**
   - Algorithm: Proximal Policy Optimization (PPO)
   - State: Portfolio + signals + sentiment + volatility
   - Action: Rebalance weights
   - Reward: Sharpe ratio over next month

3. **Risk Profiling**
   - Questionnaire: Investment horizon, risk tolerance
   - Profiles: Conservative, Balanced, Aggressive
   - Personalized portfolio targets

### Implementation Tasks (High-Level)

**Phase 1: Portfolio Optimization (Week 1-8)**
- [ ] Implement mean-variance optimizer (`models/portfolio_optimizer.py`)
- [ ] Create risk profiling questionnaire
- [ ] Build simulation engine (backtest strategies)

**Phase 2: RL Infrastructure (Week 9-16)**
- [ ] Implement PPO algorithm (`models/rl_portfolio_policy.py`)
- [ ] Create RL training pipeline (historical simulations)
- [ ] Validate RL outperforms baseline by 10%+ Sharpe

**Phase 3: Frontend (Week 17-20)**
- [ ] Portfolio wizard (onboarding)
- [ ] Rebalance planner (AI suggestions)
- [ ] Simulation dashboard (backtest strategies)

**Phase 4: Testing & Deployment (Week 21-24)**
- [ ] RL safety testing (bounded actions)
- [ ] A/B testing (RL vs rule-based)
- [ ] Production deployment with kill switch

### V4 Success Criteria

- [ ] RL policy Sharpe ratio 10%+ higher than baseline
- [ ] Portfolio optimization meets target risk profile 80%+ of time
- [ ] 100+ users try portfolio wizard
- [ ] Zero runaway RL incidents

---

## V5: MULTI-ASSET INTELLIGENCE & TAX (Q4 2027)

### Version Intent

**Problem**: "How do I manage my entire financial portfolio?"
**Solution**: Multi-asset fusion + tax optimization
**Timeline**: 8 weeks working with Claude Code
**Investment**: $1,000-$3,200 (infrastructure only)
**Status**: 🔴 Not Started

### Bootstrap Strategy

**Property Valuation** (choose one):
- Option A (Bootstrap): Manual input = $0
- Option B: API = $50/month × 6 months = $300

**Crypto APIs**:
- Free public endpoints = $0

**Bond API** (choose one):
- Option A (Bootstrap): Manual input = $0
- Option B: API = $50/month × 6 months = $300

**Open Banking** (choose one):
- Option A (Bootstrap): Manual input = $0
- Option B: Plaid/Yodlee = $100/month × 6 months = $600

**Tax Consultant** (required):
- One-time consultation to verify CGT calculations = $1,000-$2,000

**Minimum Bootstrap Path**: Manual inputs + free crypto + consultant = **$1,000-$2,000 total**
**Recommended Path**: Manual property + manual bonds + free crypto + skip Open Banking + consultant = **$1,000-$2,000 total**
**Maximum Cost Path**: All APIs + consultant = **$3,200 total**

### Key Capabilities

1. **Multi-Asset Data**
   - Property (manual input + suburb price indices)
   - Loans (manual input, equity calculation)
   - Bonds (API integration)
   - Crypto (wallet integration)

2. **Cross-Asset Allocation**
   - Mean-variance optimization across all asset classes
   - Correlation modeling between assets

3. **Tax Optimizer**
   - CGT calculation
   - Tax-loss harvesting suggestions
   - Year-end tax planning

4. **Retirement Planner**
   - Monte Carlo simulation (10,000 runs)
   - Probability of reaching retirement goal

### Implementation Tasks (High-Level)

**Phase 1: Multi-Asset Data (Week 1-8)**
- [ ] Property valuation API integration
- [ ] Crypto wallet integration (Coinbase, Binance)
- [ ] Bond pricing API
- [ ] Open Banking API (cash accounts)

**Phase 2: Cross-Asset Models (Week 9-12)**
- [ ] Asset correlation modeling
- [ ] Cross-asset allocation optimizer
- [ ] Regime detection (bull/bear/volatile)

**Phase 3: Tax Optimizer (Week 13-16)**
- [ ] CGT calculator (`services/tax_calculator.py`)
- [ ] Tax-loss harvesting algorithm
- [ ] ATO rules validation

**Phase 4: Retirement Planner (Week 17-20)**
- [ ] Monte Carlo simulation engine
- [ ] Goal tracking (target net worth by year)
- [ ] Scenario analysis (best/median/worst case)

**Phase 5: Frontend (Week 21-23)**
- [ ] Net worth dashboard
- [ ] Asset allocation page
- [ ] Tax optimizer page
- [ ] Retirement planner page

**Phase 6: Testing & Deployment (Week 24)**
- [ ] Multi-asset integration testing
- [ ] Tax calculation validation (match ATO examples)
- [ ] Production deployment

### V5 Success Criteria

- [ ] Net worth tracking within 5% of actual
- [ ] Property valuation within 10% of market value
- [ ] Tax optimization saves 15%+ on capital gains tax
- [ ] 200+ users add multi-asset data

---

## BUDGET SUMMARY: CLAUDE CODE BOOTSTRAP APPROACH

### Total Investment Required

**Minimum (Full Bootstrap)**: $1,160 over 18 months
- V2: $0 (yfinance free)
- V3: $140 (scraping + Colab Pro + Twilio)
- V4: $20 (Colab Pro)
- V5: $1,000 (tax consultant only)

**Recommended (Better Quality)**: $2,110 over 18 months
- V2: $150 (EODHD API)
- V3: $740 (scraping + Colab Pro + Twilio, skip expensive ASX API)
- V4: $20 (Colab Pro)
- V5: $1,200 (manual property/bonds, skip expensive Open Banking, include consultant)

**Maximum (All Paid APIs)**: $4,870 over 18 months
- V2: $150 (EODHD API)
- V3: $1,120 (ASX API + AWS GPU + Twilio)
- V4: $400 (AWS GPU)
- V5: $3,200 (all APIs + consultant)

### Time Investment

**Your Time with Claude Code**:
- V2: 4 weeks (160 hours of prompting/reviewing)
- V3: 8 weeks (320 hours)
- V4: 8 weeks (320 hours)
- V5: 8 weeks (320 hours)
- **Total: 28 weeks over 18 months**

### ROI Comparison

**Traditional Approach** (from original plan):
- Development Cost: $482K (personnel + infrastructure)
- Break-even: Month 22
- Time: Full-time team for 18 months

**Claude Code Bootstrap Approach**:
- Development Cost: $1.5K-$3.5K (infrastructure only)
- Break-even: Month 6-8 (much lower costs)
- Time: 28 weeks of your focused time
- **Savings: $478K+**

### Revenue Implications

With lower costs, profitability comes much faster:
- V1-V2: Can remain free longer
- V3: $500/month ads covers all costs
- V4: $1,800/month freemium = pure profit after Month 6
- V5: $8,700/month premium = strong profitability

**Break-Even Analysis**:
- Monthly burn with Claude Code: ~$150/month (avg infrastructure)
- Revenue needed: $150/month (achieved by Month 6-8 with ads/freemium)
- vs Traditional: $27K/month burn, break-even Month 22

---

## CROSS-VERSION PRIORITIES

### Epic 1: Data Integrity & Trust (V1-V5)

**Principle**: No fake metrics, no bypassing checks
**Actions**:
- [ ] V1: Data leakage audit ✅
- [ ] V2: Fundamental data validation
- [ ] V3: Sentiment sanity checks (filter routine announcements)
- [ ] V4: RL safety bounds (max 20% deviation from baseline)
- [ ] V5: Tax calculation verification (match ATO examples)

### Epic 2: Performance & Scalability (V1-V5)

**Current**: 3-4s API latency
**Targets**:
- [ ] V1: <500ms (pre-compute features)
- [ ] V2: <500ms (cache fundamentals)
- [ ] V3: <500ms (cache sentiment)
- [ ] V4: <1s (portfolio optimization is compute-heavy)
- [ ] V5: <1s (multi-asset queries)

**Actions**:
- [ ] Apply database indexes (`schemas/add_indexes.sql`)
- [ ] Implement caching (`services/cache.py`)
- [ ] Pre-compute features to database
- [ ] Add Redis for distributed caching (V3+)

### Epic 3: Testing & Quality (V1-V5)

**Current**: 40% backend coverage, 25 tests
**Targets**:
- [ ] V1: 40% ✅
- [ ] V2: 50% (add Model B tests)
- [ ] V3: 60% (add sentiment tests)
- [ ] V4: 70% (add RL tests)
- [ ] V5: 80% (add multi-asset tests)

**Actions**:
- [ ] Add integration tests with test database
- [ ] Add E2E tests for critical user flows
- [ ] Add performance regression tests
- [ ] Add data quality monitoring tests

### Epic 4: User Experience (V1-V5)

**V1**: Stock signals + portfolio tracking
**V2**: Dual signals + fundamental quality
**V3**: Triple signals + news feed + alerts
**V4**: Portfolio wizard + auto-rebalancing
**V5**: Net worth dashboard + tax optimizer

**Actions**:
- [ ] User research: Interview 10 users per version
- [ ] A/B testing: Test new features on 10% of users
- [ ] Feedback loop: "Was this helpful?" on every feature
- [ ] Analytics: Track feature usage (Mixpanel/Amplitude)

---

## RISK MITIGATION

### Technical Risks

| Risk | Impact | Mitigation | Version |
|------|--------|------------|---------|
| Model overfitting | Poor generalization | Walk-forward validation, regularization | V1-V5 |
| API rate limits | Data staleness | Implement caching, batch requests | V2-V5 |
| RL instability | Erratic recommendations | Conservative bounds, kill switch | V4 |
| Sentiment noise | False signals | Filter routine announcements | V3 |
| Multi-asset errors | Incorrect net worth | Manual validation, user feedback | V5 |

### User Trust Risks

| Risk | Impact | Mitigation | Version |
|------|--------|------------|---------|
| False confidence | Over-reliance on signals | Show confidence scores, disclaimers | V1-V5 |
| Signal whiplash | Daily signal changes confuse users | Show trend over time, explain changes | V1-V5 |
| Model disagreement | Confusion when A/B/C conflict | Explain conflicts, show all signals | V2-V3 |
| Over-promising | Users expect guaranteed returns | Honest performance metrics | V1-V5 |

### Complexity Risks

| Risk | Impact | Mitigation | Version |
|------|--------|------------|---------|
| Feature creep | Bloated product | Disciplined roadmap, user research | V3-V5 |
| Codebase monolith | Hard to maintain | Modular architecture, clear boundaries | V1-V5 |
| Data pipeline fragility | Jobs fail frequently | Monitoring, retries, error tracking | V1-V5 |

---

## IMPLEMENTATION PRINCIPLES

### 1. Modularity

**Principle**: New models don't break existing models
**How**:
- Each model has own training pipeline (`train_model_a.py`, `train_model_b.py`)
- Each model has own database table (`model_a_signals`, `model_b_signals`)
- Ensemble is middleware (can swap strategy without retraining models)
- Feature flags for each model (can disable Model C without affecting A/B)

### 2. Incremental Delivery

**Principle**: Ship early, ship often
**How**:
- V2: Deploy Model B to staging, A/B test on 10% of users
- V3: Deploy sentiment to opt-in users first
- V4: RL recommendations are advisory (not automatic)
- V5: Multi-asset data is optional (equities-only still works)

### 3. Honest Communication

**Principle**: Marketing matches reality
**How**:
- Show real performance: "68% accuracy" (not "AI-powered 95%")
- Explain limitations: "Predictions, not guarantees"
- Historical signals never changed (append-only log)
- Model performance reported honestly

### 4. Continuous Learning

**Principle**: Models improve without breaking trust
**How**:
- V1: Manual retraining, feature drift monitoring
- V2: Monthly fundamental retraining
- V3: Realtime sentiment updates
- V4: Weekly RL policy updates
- V5: Quarterly asset correlation updates

### 5. User Control

**Principle**: Advisory, not prescriptive
**How**:
- Users can choose to follow Model A only, B only, or ensemble
- RL recommendations require user approval
- Rebalancing is suggested, not automatic
- Portfolio wizard is optional

---

## MEASURING SUCCESS

### V1 Metrics (Current)

- Model: ROC-AUC 0.68, Accuracy 62%
- API: 46 endpoints, 3-4s latency
- Users: TBD (not yet launched)

### V2 Metrics (Target)

- Model B: Precision >65% on top quintile
- Ensemble: Sharpe ratio 5%+ higher than V1
- API: 51 endpoints, <500ms latency
- Users: 100+ users, 20+ try dual-signal filtering

### V3 Metrics (Target)

- Model C: F1 >0.75 on sentiment classification
- Ensemble: Sharpe ratio 3-5% higher than V2
- API: 59 endpoints, <500ms latency
- Users: 250+ users, 50+ subscribe to alerts

### V4 Metrics (Target)

- RL Policy: Sharpe ratio 10%+ higher than baseline
- Portfolio Optimization: Meets risk profile 80%+ of time
- API: 69 endpoints, <1s latency
- Users: 500+ users, 100+ try portfolio wizard

### V5 Metrics (Target)

- Net Worth: Tracking within 5% of actual
- Tax Optimization: Saves 15%+ on capital gains
- API: 84 endpoints, <1s latency
- Users: 1000+ users, 200+ add multi-asset data

---

## NEXT STEPS

### Immediate (Week 1)

1. ✅ Create roadmap implementation plan (this document)
2. [ ] Review V1 remaining tasks (deploy frontend, apply indexes)
3. [ ] Prioritize V1 optimizations vs V2 start
4. [ ] Set up project management (Linear, Jira, or GitHub Projects)

### Week 2-4 (V1 Polish)

1. [ ] Deploy frontend to Vercel
2. [ ] Apply database indexes
3. [ ] Optimize API latency to <500ms
4. [ ] Set up uptime monitoring
5. [ ] Gather user feedback

### Month 2-4 (V2 Planning)

1. [ ] User research: Interview 10 users about fundamentals
2. [ ] Finalize V2 requirements
3. [ ] Set up fundamentals data source (EODHD)
4. [ ] Begin V2 Phase 1 (data infrastructure)

---

## CONCLUSION

This roadmap provides a clear path from V1 (production ready) to V5 (multi-asset platform) over 18-24 months. Each version:
- Solves a specific user problem
- Delivers incremental value
- Maintains backward compatibility
- Prioritizes user trust

**Key Success Factors**:
1. Ship V1 and gather real user feedback before starting V2
2. Maintain modular architecture (new models don't break old ones)
3. Honest communication (no fake metrics, no over-promising)
4. Continuous learning (models improve transparently)
5. User control (advisory, not prescriptive)

**Ready to implement**: V1 is production-ready. V2 planning can begin after V1 launch and user feedback.

---

**Prepared By**: ASX Portfolio OS Engineering Team
**Date**: January 28, 2026
**Status**: V1 Production Ready → V2 Planning
