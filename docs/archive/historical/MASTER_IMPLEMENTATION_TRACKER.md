# Master Implementation Tracker: V1-V5 Roadmap

**Date**: January 28, 2026
**Purpose**: Central tracking document for all roadmap implementation tasks
**Status**: V1 Complete → V2-V5 Planning
**Development Approach**: Claude Code as dev team (bootstrap approach)
**Total Investment**: $1,160-$4,870 (infrastructure only, no personnel costs)
**Your Time**: ~28 weeks with Claude Code over 18 months

---

## QUICK STATUS OVERVIEW

| Version | Status | Timeline | Progress | Priority |
|---------|--------|----------|----------|----------|
| **V1** | ✅ COMPLETE | Jan 2026 | 100% | Deployed |
| **V2** | 🟡 PLANNED | Q2 2026 (12 weeks) | 0% | Next |
| **V3** | ⚪ FUTURE | Q4 2026 (24 weeks) | 0% | After V2 |
| **V4** | ⚪ FUTURE | Q2 2027 (24 weeks) | 0% | After V3 |
| **V5** | ⚪ FUTURE | Q4 2027 (24 weeks) | 0% | After V4 |

**Current Focus**: Complete V1 deployment tasks before starting V2

---

## V1: MOMENTUM FOUNDATION (COMPLETE ✅)

### Status: Production Ready

**Completion Date**: January 27, 2026

### What's Complete

- [x] Model A (momentum-based LightGBM) trained and validated (0.68 ROC-AUC)
- [x] 12 technical indicators (momentum, volatility, trend, volume)
- [x] 5-tier signal system (STRONG_BUY → STRONG_SELL)
- [x] Daily pipeline (sync prices → compute features → generate signals)
- [x] Portfolio management (CSV upload, holdings tracking, rebalancing)
- [x] 46 REST API endpoints with rate limiting
- [x] 9-page Next.js frontend with dark mode
- [x] Data integrity audit (no leakage detected)
- [x] 40% test coverage on critical paths
- [x] CI/CD pipeline (GitHub Actions + Husky)
- [x] Production hardening (Sentry, rate limiting, connection pooling)
- [x] Database cleanup (70% reduction in unused tables)
- [x] Documentation aligned with reality

### V1 Remaining Tasks (Pre-V2)

**Priority 1: Deployment (Required)**
- [ ] Deploy frontend to Vercel (15 min)
- [ ] Production smoke test (10 min)
- [ ] Apply database indexes (`psql $DATABASE_URL -f schemas/add_indexes.sql`)
- [ ] Set up uptime monitoring (UptimeRobot, 5 min)

**Priority 2: Performance (Optional)**
- [ ] Optimize API latency to <500ms (pre-compute features to database, 4 hours)
- [ ] Implement caching layer (`services/cache.py` already created, 2 hours to integrate)
- [ ] Monitor API response times in Sentry

**Priority 3: Quality (Optional)**
- [ ] Increase frontend test coverage to 80% (4 hours)
- [ ] Create OpenAPI documentation (3 hours)
- [ ] Add integration tests with test database (4 hours)

**Blockers**: None - V1 is production ready

**Decision Point**: Should we complete all V1 optional tasks before starting V2, or deploy V1 and iterate?
- **Recommendation**: Deploy V1 ASAP, complete Priority 1 tasks, then start V2. Complete Priority 2-3 in parallel with V2 planning.

---

## V2: FUNDAMENTAL INTELLIGENCE (PLANNED 🟡)

### Status: Ready to Start

**Target Launch**: May 2026 (4 weeks with Claude Code)
**Investment**: $0-$150 (infrastructure only)
**Your Time**: 4 weeks (160 hours of focused work with Claude Code)

### Key Milestones

| Week | Phase | Deliverable | Owner |
|------|-------|-------------|-------|
| 1-2 | Data Infrastructure | Fundamentals data syncing | Backend |
| 3-5 | Model B Training | Model B trained (>65% precision) | ML |
| 6 | Ensemble Strategy | Ensemble validated (5%+ Sharpe improvement) | ML |
| 7-8 | Backend API | 5 new endpoints operational | Backend |
| 9-10 | Frontend Updates | Dual signals UI | Frontend |
| 11-12 | Testing & Deployment | V2 live in production | All |

### High-Level Task List

**Phase 1: Data Infrastructure (Week 1-2)**
- [ ] Set up EODHD Fundamentals API (4 hours)
- [ ] Create `jobs/sync_fundamentals.py` (8 hours)
- [ ] Create `model_b_fundamentals_data` table
- [ ] Create fundamentals ingestion tests (4 hours)
- [ ] Schedule weekly cron job on Render

**Phase 2: Model B Training (Week 3-5)**
- [ ] Build fundamental feature set (8 hours)
- [ ] Create training dataset (500 stocks × 3 years)
- [ ] Train Model B (`models/train_model_b_fundamentals.py`, 12 hours)
- [ ] Validate Model B (>65% precision, 6 hours)
- [ ] Generate SHAP feature importance

**Phase 3: Ensemble Strategy (Week 6)**
- [ ] Implement ensemble logic (`models/ensemble_strategy.py`, 6 hours)
- [ ] Create ensemble tests (3 hours)
- [ ] Backtest ensemble (8 hours)
- [ ] Validate 5%+ Sharpe improvement

**Phase 4: Backend API (Week 7-8)**
- [ ] Create `jobs/generate_model_b_signals.py` (6 hours)
- [ ] Create 5 new API endpoints (10 hours)
  - `GET /signals/fundamentals`
  - `GET /signals/ensemble`
  - `GET /fundamentals/metrics?ticker=CBA`
  - `GET /fundamentals/quality?ticker=CBA`
  - `GET /model/compare_ensemble`
- [ ] Create API tests (4 hours)

**Phase 5: Frontend Updates (Week 9-10)**
- [ ] Dual signal display on dashboard (8 hours)
- [ ] Stock detail page - fundamentals tab (6 hours)
- [ ] Portfolio - fundamental quality column (4 hours)
- [ ] Models page - comparison chart (6 hours)
- [ ] Frontend tests (4 hours)

**Phase 6: Testing & Deployment (Week 11-12)**
- [ ] End-to-end integration test (8 hours)
- [ ] Load testing (100 req/min, 4 hours)
- [ ] Documentation (`docs/MODEL_B_GUIDE.md`, 4 hours)
- [ ] Deploy to staging (2 hours)
- [ ] Deploy to production (4 hours)
- [ ] Smoke test production (2 hours)
- [ ] Configure monitoring (4 hours)

**Total Estimated Effort**: ~160 hours (2 people × 12 weeks = realistic)

**Detailed Task Breakdown**: See `V2_IMPLEMENTATION_TASKS.md`

**Blockers**:
- None (all prerequisites met)
- V1 deployment not strictly required (can run in parallel)

**Decision Point (Week 6)**: If Model B precision <65% or ensemble improvement <5%, should we:
- Option A: Iterate on features/hyperparameters (add 2-4 weeks)
- Option B: Ship V2 with lower performance but gather user feedback
- **Recommendation**: Option A (quality over speed)

---

## V3: SENTIMENT & NEWS AWARENESS (FUTURE ⚪)

### Status: Planning

**Target Launch**: October 2026 (24 weeks)

**Depends On**: V2 successfully deployed + user feedback

### Key Milestones

| Week | Phase | Deliverable |
|------|-------|-------------|
| 1-4 | Data Infrastructure | ASX announcements ingestion (15-min) |
| 5-8 | NLP Pipeline | FinBERT fine-tuned (F1 >0.75) |
| 9-12 | Model C Training | Sentiment classifier trained |
| 13-16 | Real-time Processing | Alert system operational |
| 17-20 | Frontend | News feed + sentiment timeline |
| 21-23 | Ensemble V3 | Meta-learner (3-5% Sharpe improvement) |
| 24 | Deployment | V3 live in production |

### Critical Path

1. **ASX Announcements API** (Week 1)
   - Options: ASX API ($100/month), web scraping (free), NewsAPI ($50/month)
   - Decision needed: Which data source?

2. **FinBERT Fine-Tuning** (Week 5-8)
   - Requires GPU (Google Colab or AWS p3.2xlarge)
   - Need 10,000 labeled announcements
   - Decision needed: How to label? (Use price movement as proxy label)

3. **Real-time Infrastructure** (Week 13-16)
   - 15-min polling vs webhooks
   - SMS alerts (Twilio $20/month)
   - Decision needed: Alert frequency (immediate, daily digest, weekly)?

### Pre-Work (Can Start Now)

- [ ] Research ASX announcements data sources
- [ ] Collect sample ASX announcements (1000) for feasibility test
- [ ] Test FinBERT on sample announcements (accuracy check)
- [ ] User research: Do users want real-time alerts? What frequency?

**Blockers**:
- V2 must be deployed first
- User feedback on V2 needed (sentiment may not be priority)

**Decision Point (After V2 Launch)**: Should we build V3 or V4 next?
- If users request "news/sentiment": → V3
- If users request "portfolio optimization": → Skip to V4
- **Recommendation**: Wait for V2 user feedback (2 months)

---

## V4: PORTFOLIO OPTIMIZATION & RL (FUTURE ⚪)

### Status: Research

**Target Launch**: May 2027 (24 weeks)

**Depends On**: V3 successfully deployed

### Key Milestones

| Week | Phase | Deliverable |
|------|-------|-------------|
| 1-8 | Portfolio Optimization | Mean-variance optimizer |
| 9-16 | RL Infrastructure | PPO algorithm trained |
| 17-18 | Safety & Testing | RL safety validated |
| 19-22 | Frontend | Portfolio wizard + rebalance planner |
| 23-24 | Deployment | V4 live in production |

### Critical Decisions

1. **RL Training Data** (Week 9)
   - Option A: Historical simulations only (safe, limited)
   - Option B: Opt-in user data (better, privacy concerns)
   - **Recommendation**: Start with A, add B if users opt-in

2. **RL Safety** (Week 17)
   - Max deviation from baseline: 10%, 20%, 30%?
   - Kill switch: Manual or automatic (if Sharpe drops >10%)?
   - **Recommendation**: 20% deviation, manual kill switch

3. **Monetization** (Week 24)
   - Should V4 be free or paid?
   - Option A: Free (grow user base)
   - Option B: Freemium ($9/month for RL recommendations)
   - **Recommendation**: Freemium (RL is premium feature)

### Pre-Work

- [ ] Research PPO implementation (Stable Baselines3)
- [ ] Build portfolio optimization prototype (2 days)
- [ ] Define RL state/action/reward space
- [ ] User research: Would users trust RL recommendations?

**Blockers**:
- V3 must be deployed first
- Need 1000+ users for RL opt-in training data
- Requires cloud GPU ($200/month)

---

## V5: MULTI-ASSET INTELLIGENCE & TAX (FUTURE ⚪)

### Status: Concept

**Target Launch**: November 2027 (24 weeks)

**Depends On**: V4 successfully deployed

### Key Milestones

| Week | Phase | Deliverable |
|------|-------|-------------|
| 1-8 | Multi-Asset Data | Property, crypto, bonds, cash integration |
| 9-12 | Cross-Asset Models | Asset correlation + allocation optimizer |
| 13-16 | Tax Optimizer | CGT calculator + loss harvesting |
| 17-20 | Retirement Planner | Monte Carlo simulation |
| 21-23 | Frontend | Net worth dashboard + tax page |
| 24 | Deployment | V5 live in production |

### Critical Decisions

1. **Property Valuation** (Week 1)
   - Option A: Manual input (simple, inaccurate)
   - Option B: API integration ($50/month, accurate)
   - **Recommendation**: Start with A, add B if users request

2. **Tax Compliance** (Week 13)
   - Should we consult tax professionals? ($5K one-time)
   - Risk: Tax advice liability
   - **Recommendation**: Yes, consultant + disclaimer ("not tax advice")

3. **Monetization** (Week 24)
   - V5 should be premium ($29/month)
   - Users pay for tax optimization value
   - **Recommendation**: Premium tier unlock

### Pre-Work

- [ ] Research property valuation APIs (CoreLogic, RP Data)
- [ ] Research crypto wallet APIs (Coinbase, Binance)
- [ ] Research Open Banking APIs (Plaid, Yodlee)
- [ ] Validate ATO CGT calculation logic
- [ ] User research: Would users pay $29/month for multi-asset + tax?

**Blockers**:
- V4 must be deployed first
- Requires 2000+ users and $5K+/month revenue
- Legal review of tax optimization feature

---

## RESOURCE PLANNING: CLAUDE CODE APPROACH

### Team Requirements

**Traditional Approach** (REMOVED):
- V2-V5: 47 person-months
- Cost: $470K in personnel
- **NOT NEEDED**

**Claude Code Approach**:
- Your time: 28 weeks of focused work with Claude Code
- Claude Code handles: Code generation, testing, documentation
- You handle: Requirements, prompting, reviewing, decisions, deployment

### Time Allocation with Claude Code

**V2** (4 weeks):
- 160 hours of your time prompting/reviewing
- Claude Code generates: data pipeline, Model B, ensemble, APIs, frontend

**V3** (8 weeks):
- 320 hours of your time prompting/reviewing
- Claude Code generates: scraping, FinBERT, alerts, ensemble V3, frontend

**V4** (8 weeks):
- 320 hours of your time prompting/reviewing
- Claude Code generates: portfolio optimizer, RL (PPO), frontend, simulation

**V5** (8 weeks):
- 320 hours of your time prompting/reviewing
- Claude Code generates: multi-asset integrations, tax calculator, retirement planner

**Total Your Time**: ~1,120 hours over 18 months (~28 weeks)

---

## BUDGET ESTIMATES: BOOTSTRAP APPROACH

### V2 Costs (4 weeks)

**Option A (Full Bootstrap)**:
- Personnel: $0 (you + Claude Code)
- Infrastructure: yfinance library (free)
- **Total V2**: $0

**Option B (Recommended)**:
- Personnel: $0 (you + Claude Code)
- Infrastructure: EODHD API $50/month × 3 months = $150
- **Total V2**: $150

### V3 Costs (8 weeks)

**Option A (Full Bootstrap)**:
- Personnel: $0 (you + Claude Code)
- ASX Announcements: Web scraping (Beautiful Soup) = $0
- GPU: Google Colab Pro $10/month × 2 months = $20
- SMS Alerts: Twilio $20/month × 6 months = $120
- **Total V3**: $140

**Option B (Recommended - Skip Expensive ASX API)**:
- Personnel: $0 (you + Claude Code)
- ASX Announcements: Web scraping = $0
- GPU: Google Colab Pro = $20
- SMS Alerts: Twilio = $120
- **Total V3**: $140

**Option C (Maximum - All Paid)**:
- Personnel: $0 (you + Claude Code)
- ASX API: $100/month × 6 months = $600
- GPU: AWS p3.2xlarge $200/month × 2 months = $400
- SMS Alerts: Twilio = $120
- **Total V3**: $1,120

### V4 Costs (8 weeks)

**Option A (Bootstrap)**:
- Personnel: $0 (you + Claude Code)
- GPU: Google Colab Pro $10/month × 2 months = $20
- **Total V4**: $20

**Option B (Paid)**:
- Personnel: $0 (you + Claude Code)
- GPU: AWS p3.2xlarge $200/month × 2 months = $400
- **Total V4**: $400

### V5 Costs (8 weeks)

**Option A (Full Bootstrap)**:
- Personnel: $0 (you + Claude Code)
- Property: Manual input = $0
- Crypto: Free public APIs = $0
- Bonds: Manual input = $0
- Open Banking: Manual input = $0
- Tax Consultant: $1,000-$2,000 (required)
- **Total V5**: $1,000-$2,000

**Option B (Recommended - Skip Open Banking)**:
- Personnel: $0 (you + Claude Code)
- Property: Manual input = $0
- Crypto: Free = $0
- Bonds: Manual input = $0
- Open Banking: Manual input = $0
- Tax Consultant: $1,000-$2,000
- **Total V5**: $1,000-$2,000

**Option C (Maximum - All Paid)**:
- Personnel: $0 (you + Claude Code)
- Property API: $50/month × 6 months = $300
- Crypto: Free = $0
- Bond API: $50/month × 6 months = $300
- Open Banking: $100/month × 6 months = $600
- Tax Consultant: $2,000
- **Total V5**: $3,200

### Grand Totals

**Minimum (Full Bootstrap)**:
- V2: $0 + V3: $140 + V4: $20 + V5: $1,000 = **$1,160 over 18 months**

**Recommended (Better Quality)**:
- V2: $150 + V3: $140 + V4: $20 + V5: $1,200 = **$1,510 over 18 months**

**Maximum (All Paid Options)**:
- V2: $150 + V3: $1,120 + V4: $400 + V5: $3,200 = **$4,870 over 18 months**

**Traditional Approach Cost**: $481,650
**Claude Code Savings**: $476,780-$480,490 (99% cost reduction)

### Revenue Projections (Unchanged)
- V1-V2: $0 (free beta)
- V3: $500/month (ads, Month 12)
- V4: $1,800/month (freemium, Month 18)
- V5: $8,700/month (premium, Month 24)

### Break-Even Analysis

**Traditional Approach**:
- Monthly burn: ~$27K average
- Break-even: Month 22
- Cumulative loss at Month 22: $481K

**Claude Code Approach**:
- Monthly infrastructure: ~$85/month average (V2-V5 spread over 18 months)
- Monthly revenue by Month 6: $500 (ads)
- **Break-even: Month 6-8**
- Cumulative cost at Month 24: $1.5K-$5K
- **Pure profit after Month 6**

---

## SUCCESS METRICS

### V2 Success Criteria

**Launch (Week 12)**:
- [ ] Model B precision >65%
- [ ] Ensemble Sharpe 5%+ better than V1
- [ ] API latency <500ms
- [ ] Zero critical errors in Week 1

**Month 1**:
- [ ] 100+ active users
- [ ] 20+ users use "models agree" filter
- [ ] Positive feedback (80% satisfaction)

**Month 3**:
- [ ] 250+ active users
- [ ] 10%+ increase in DAU/MAU
- [ ] 5+ feature requests for V3 (sentiment)

### V3 Success Criteria

**Launch (Week 24)**:
- [ ] Model C F1 >0.75
- [ ] Ensemble Sharpe 3-5% better than V2
- [ ] Alert precision >70%
- [ ] Zero alert spam complaints

**Month 1**:
- [ ] 50+ users subscribe to alerts
- [ ] Positive feedback on news feed

**Month 3**:
- [ ] 500+ active users
- [ ] 15%+ increase in DAU/MAU
- [ ] $500/month revenue (ads)

### V4 Success Criteria

**Launch (Week 24)**:
- [ ] RL Sharpe 10%+ better than baseline
- [ ] Portfolio optimization 80%+ accurate
- [ ] Zero runaway RL incidents

**Month 1**:
- [ ] 100+ users try portfolio wizard
- [ ] 50+ users use one-click rebalance

**Month 3**:
- [ ] 1000+ active users
- [ ] 20%+ increase in DAU/MAU
- [ ] $5K/month revenue (freemium)

### V5 Success Criteria

**Launch (Week 24)**:
- [ ] Net worth within 5% of actual
- [ ] Tax optimizer saves 15%+ on CGT

**Month 1**:
- [ ] 200+ users add multi-asset data
- [ ] 50+ users use tax optimizer

**Month 3**:
- [ ] 2000+ active users
- [ ] $10K/month revenue (premium tier)

---

## DECISION FRAMEWORK

### Go/No-Go Decision Points

**After V2 Launch (Month 4)**:
- **Go if**: 250+ users, 80% satisfaction, 5+ V3 feature requests
- **No-Go if**: <100 users, negative feedback, users want V1 improvements
- **Pivot if**: Users request different features (e.g., V4 before V3)

**After V3 Launch (Month 10)**:
- **Go if**: 500+ users, 15%+ engagement increase, $1K+/month revenue
- **No-Go if**: <250 users, <5% engagement increase
- **Pivot if**: Competitors launch portfolio optimization (skip to V4)

**After V4 Launch (Month 16)**:
- **Go if**: 1000+ users, $5K+/month revenue
- **No-Go if**: <500 users, <$2K/month revenue
- **Pivot if**: Users don't trust RL (focus on rule-based optimization)

**Before V5 Start (Month 16)**:
- **Go if**: 1000+ users, $5K+/month revenue, users request multi-asset
- **No-Go if**: <500 users, <$2K/month revenue
- **Focus on Growth if**: Users are happy with V1-V4, don't need V5

---

## RISK REGISTER

### High-Priority Risks

1. **V2: Fundamentals API Rate Limits**
   - **Impact**: Data staleness
   - **Probability**: Medium
   - **Mitigation**: Cache for 7 days, batch requests
   - **Owner**: Backend Engineer

2. **V3: Sentiment Noise**
   - **Impact**: False signals, user distrust
   - **Probability**: High
   - **Mitigation**: Filter routine announcements, high confidence threshold
   - **Owner**: ML Engineer

3. **V4: RL Instability**
   - **Impact**: Erratic recommendations, user distrust
   - **Probability**: Medium
   - **Mitigation**: Safety bounds, kill switch, baseline comparison
   - **Owner**: ML/RL Engineer

4. **V5: Tax Compliance**
   - **Impact**: Legal liability
   - **Probability**: Low
   - **Mitigation**: Tax professional consultant, disclaimers
   - **Owner**: Legal + Tax Engineer

### Medium-Priority Risks

5. **All Versions: User Churn**
   - **Impact**: Low user retention
   - **Probability**: Medium
   - **Mitigation**: A/B testing, user feedback loops, iterate quickly
   - **Owner**: Product Manager

6. **All Versions: Competitor Launch**
   - **Impact**: Users switch to competitors
   - **Probability**: Medium
   - **Mitigation**: Differentiate on ASX focus, transparency, quality
   - **Owner**: Product Manager

### Low-Priority Risks

7. **V2-V5: Budget Overrun**
   - **Impact**: Need to raise more capital
   - **Probability**: Low
   - **Mitigation**: Prioritize, cut scope if needed
   - **Owner**: CTO

---

## NEXT STEPS

### Immediate (This Week)

1. [ ] Review V1 remaining tasks (deployment, monitoring)
2. [ ] Decide: Deploy V1 now or complete all optional tasks first?
3. [ ] Set up project management tool (Linear, Jira, or GitHub Projects)
4. [ ] Create V2 Kickoff meeting agenda

### Week 2-4 (V1 Completion)

1. [ ] Deploy frontend to Vercel
2. [ ] Apply database indexes
3. [ ] Set up uptime monitoring
4. [ ] Smoke test production

### Month 2 (V2 Start)

1. [ ] V2 Kickoff meeting
2. [ ] Set up EODHD Fundamentals API
3. [ ] Create V2 sprint plan (12 weeks, 2-week sprints)
4. [ ] Begin Phase 1: Data Infrastructure

### Month 3-4 (V2 Execution)

1. [ ] Weekly sprint reviews
2. [ ] Track V2 progress against milestones
3. [ ] User feedback on V1 (shapes V3 priorities)

### Month 5 (V2 Launch)

1. [ ] V2 deployment to production
2. [ ] Monitor for errors, performance issues
3. [ ] Gather user feedback on dual signals
4. [ ] Decide: V3 or V4 next?

---

## TRACKING & REPORTING

### Weekly Updates

**Every Monday**:
- [ ] Update progress on current version (% complete)
- [ ] Report blockers/risks
- [ ] Adjust timeline if needed

### Monthly Reviews

**Last Friday of Month**:
- [ ] Review success metrics (users, engagement, revenue)
- [ ] Review budget vs actual spend
- [ ] Go/No-Go decision for next version

### Quarterly Planning

**Every 3 Months**:
- [ ] Re-evaluate roadmap priority (V3 vs V4 vs V5)
- [ ] Update resource plan
- [ ] Update budget forecast
- [ ] User research (interviews, surveys)

---

## DOCUMENT UPDATES

**This document will be updated**:
- Weekly (progress, blockers)
- After each version launch (lessons learned)
- After Go/No-Go decisions (timeline adjustments)

**Last Updated**: January 28, 2026
**Next Update**: February 4, 2026 (after V1 deployment)

---

## RELATED DOCUMENTS

- `ROADMAP_IMPLEMENTATION_PLAN.md` - High-level strategic roadmap
- `V2_IMPLEMENTATION_TASKS.md` - Detailed V2 task breakdown
- `V3_V4_V5_ROADMAP_SUMMARY.md` - V3-V5 overview
- `V1_PRODUCTION_READINESS_COMPLETE.md` - V1 completion report
- `REMAINING_TASKS.md` - V1 remaining tasks

---

**Prepared By**: Product & Engineering Team
**Date**: January 28, 2026
**Status**: Living Document (Updated Weekly)
