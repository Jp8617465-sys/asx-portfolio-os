# V3-V5 Roadmap Summary

**Purpose**: High-level overview of V3, V4, and V5 implementations
**Timeline**: V3 (Q4 2026) → V4 (Q2 2027) → V5 (Q4 2027)
**Status**: Planning Phase
**Development Approach**: Using Claude Code as dev team (bootstrap approach)
**Total Investment**: $1,160-$4,870 (infrastructure only, no personnel costs)
**Your Time**: 24 weeks with Claude Code across V3-V5

---

## V3: SENTIMENT & NEWS AWARENESS (Q4 2026)

### Timeline
- **Duration**: 8 weeks with Claude Code
- **Target Launch**: October 2026
- **Depends On**: V2 successfully deployed
- **Investment**: $140-$1,120 (infrastructure only)
- **Your Time**: 8 weeks (320 hours of focused work)

### Problem Solved
"What's the market saying about this stock?"

Users need to know when sentiment shifts (earnings downgrades, regulatory changes, M&A) that contradict momentum/fundamental signals.

### Key Capabilities

1. **Model C: Sentiment Analysis**
   - Fine-tuned FinBERT on ASX announcements
   - Classification: POSITIVE, NEUTRAL, NEGATIVE + confidence
   - Real-time processing (15-minute polling)

2. **ASX Announcements Ingestion**
   - Company updates, earnings, guidance, M&A
   - ~500 announcements/day
   - Filter routine announcements (dividends, AGM notices)

3. **Ensemble V3**
   - Weighted: 40% Model A + 30% Model B + 30% Model C
   - Sentiment override: NEGATIVE announcement → downgrade BUY to HOLD
   - Meta-learner (XGBoost) for dynamic weights

4. **Real-time Alerts**
   - Email/SMS when sentiment changes for watchlist stocks
   - Alert precision target: 70% (price moves >2% within 3 days)

5. **News Feed Frontend**
   - Recent announcements on dashboard
   - Sentiment timeline chart on stock detail page
   - Alert preferences page

### Implementation Phases

**Phase 1: Data Infrastructure (Week 1-4)**
- Set up ASX announcements API or web scraper
- Build announcement database
- Create 15-min polling job

**Phase 2: NLP Pipeline (Week 5-8)**
- Collect 10,000 ASX announcements for training
- Fine-tune FinBERT (label: price movement after announcement)
- Validate F1 score >0.75

**Phase 3: Model C Training (Week 9-12)**
- Train sentiment classifier
- Generate SHAP feature importance
- Backtest on historical announcements

**Phase 4: Real-time Processing (Week 13-16)**
- Implement real-time sentiment analysis job
- Build alert system (Twilio for SMS)
- Create alert endpoints

**Phase 5: Frontend (Week 17-20)**
- News feed on dashboard
- Sentiment timeline on stock detail
- Alert preferences page

**Phase 6: Ensemble V3 (Week 21-23)**
- Implement meta-learner for dynamic weights
- Backtest ensemble V3
- Validate 3-5% Sharpe improvement over V2

**Phase 7: Testing & Deployment (Week 24)**
- A/B testing (10% users see V3)
- Integration testing
- Production deployment

### Success Criteria

**Technical**:
- Model C F1 score >0.75 on sentiment classification
- Sentiment-price correlation: 65%+ of time price moves in direction of sentiment within 7 days
- Ensemble V3 Sharpe ratio 3-5% higher than V2
- Alert precision >70%

**User**:
- 250+ active users
- 50+ users subscribe to alerts
- Positive feedback on news feed

**Business**:
- User engagement (DAU/MAU) increases 15%
- Feature request: "Add portfolio optimization" (5+ requests)

### Technical Risks

1. **Sentiment Noise**: Routine announcements trigger false signals
   - Mitigation: Filter routine announcements, require high confidence (>70%)

2. **NLP Complexity**: FinBERT fine-tuning requires GPU
   - Mitigation: Use Google Colab or cloud GPU (AWS/GCP)

3. **Real-time Infrastructure**: 15-min polling may miss fast-moving news
   - Mitigation: Start with 15-min, optimize to 5-min if needed

4. **Alert Fatigue**: Too many alerts annoy users
   - Mitigation: Only alert on SIGNIFICANT sentiment shifts (>70% confidence)

---

## V4: PORTFOLIO OPTIMIZATION & RL (Q2 2027)

### Timeline
- **Duration**: 8 weeks with Claude Code
- **Target Launch**: May 2027
- **Depends On**: V3 successfully deployed
- **Investment**: $20-$400 (infrastructure only)
- **Your Time**: 8 weeks (320 hours of focused work)

### Problem Solved
"How should I allocate my portfolio?"

Users need holistic portfolio construction, not just individual stock picks. RL learns from outcomes to improve recommendations over time.

### Key Capabilities

1. **Portfolio Optimization Engine**
   - Mean-variance optimization (Markowitz)
   - Constraints: Max position size (10%), sector limits (30%), min diversification (10 stocks)
   - Output: Optimal weights for each stock

2. **Reinforcement Learning**
   - Algorithm: Proximal Policy Optimization (PPO)
   - State: Portfolio + signals + sentiment + volatility
   - Action: Rebalance weights (what to buy/sell)
   - Reward: Sharpe ratio over next month
   - Training: Historical simulations + opt-in user data

3. **Risk Profiling**
   - Questionnaire: Investment horizon, risk tolerance, loss aversion
   - Profiles: Conservative (Sharpe >1.5, vol <15%), Balanced (Sharpe >1.2, vol <20%), Aggressive (max Sharpe, vol <30%)
   - Personalized portfolio targets

4. **Simulation Engine**
   - Backtest strategies: "What if I followed Model A only for last 12 months?"
   - Monte Carlo simulation for risk assessment
   - Performance attribution: "30% from momentum, 20% from fundamentals"

5. **Frontend Updates**
   - Portfolio wizard (onboarding)
   - One-click rebalance planner
   - Simulation dashboard
   - Performance attribution page

### Implementation Phases

**Phase 1: Portfolio Optimization (Week 1-8)**
- Implement mean-variance optimizer
- Create risk profiling questionnaire
- Build simulation engine

**Phase 2: RL Infrastructure (Week 9-16)**
- Implement PPO algorithm
- Create RL training pipeline (offline, then online)
- Validate RL outperforms baseline by 10%+ Sharpe

**Phase 3: Safety & Testing (Week 17-18)**
- RL safety bounds (max 20% deviation from baseline)
- Kill switch (can disable RL instantly)
- Backtests on 10+ years of historical data

**Phase 4: Frontend (Week 19-22)**
- Portfolio wizard
- Rebalance planner
- Simulation dashboard

**Phase 5: Testing & Deployment (Week 23-24)**
- A/B testing (RL vs rule-based)
- Integration testing
- Production deployment

### Success Criteria

**Technical**:
- RL policy Sharpe ratio 10%+ higher than baseline
- Portfolio optimization meets target risk profile 80%+ of time
- Rebalancing suggestions improve Sharpe ratio in 65%+ of cases
- Zero runaway RL incidents

**User**:
- 500+ active users
- 100+ users try portfolio wizard
- 50+ users use one-click rebalance

**Business**:
- User engagement increases 20%
- Average portfolio value increases (users add more capital)

### Technical Risks

1. **RL Instability**: RL may recommend erratic trades
   - Mitigation: Conservative bounds (max 20% deviation), baseline comparison, kill switch

2. **Overfitting**: RL overoptimizes on historical data
   - Mitigation: Walk-forward validation, holdout test set, regularization

3. **User Trust**: Users may not trust "black box" RL
   - Mitigation: Show RL reasoning, always show baseline alternative

4. **Computational Cost**: RL training requires significant compute
   - Mitigation: Use cloud GPU, train weekly (not daily)

---

## V5: MULTI-ASSET INTELLIGENCE & TAX (Q4 2027)

### Timeline
- **Duration**: 8 weeks with Claude Code
- **Target Launch**: November 2027
- **Depends On**: V4 successfully deployed
- **Investment**: $1,000-$3,200 (infrastructure only)
- **Your Time**: 8 weeks (320 hours of focused work)

### Problem Solved
"How do I manage my entire financial portfolio?"

Users want to track net worth across ALL assets (equities, property, loans, bonds, crypto) and optimize for taxes.

### Key Capabilities

1. **Multi-Asset Data Ingestion**
   - Property: Manual input + suburb price indices
   - Loans: Manual input, equity calculation
   - Bonds: API integration (bond prices, yields)
   - Crypto: Wallet integration (Coinbase, Binance)
   - Cash: Bank account balances (Open Banking API)

2. **Cross-Asset Allocation Optimizer**
   - Mean-variance optimization across ALL asset classes
   - Asset correlation modeling (equities vs property vs bonds)
   - Regime detection (bull/bear/volatile markets)

3. **Tax Optimizer**
   - CGT calculator (capital gains tax)
   - Tax-loss harvesting: "Sell TSLA to realize $10K loss"
   - Year-end tax planning suggestions
   - ATO rules compliance

4. **Retirement Planner**
   - Monte Carlo simulation (10,000 runs)
   - Goal tracking: "You need $2M by 2040—currently at $800K"
   - Probability of reaching goal
   - Scenarios: Best case, median, worst case

5. **Frontend Updates**
   - Net worth dashboard (all assets)
   - Asset allocation page (pie chart)
   - Tax optimizer page
   - Retirement planner page

### Implementation Phases

**Phase 1: Multi-Asset Data (Week 1-8)**
- Property valuation API integration
- Crypto wallet integration
- Bond pricing API
- Open Banking API

**Phase 2: Cross-Asset Models (Week 9-12)**
- Asset correlation modeling
- Cross-asset allocation optimizer
- Regime detection

**Phase 3: Tax Optimizer (Week 13-16)**
- CGT calculator
- Tax-loss harvesting algorithm
- ATO rules validation

**Phase 4: Retirement Planner (Week 17-20)**
- Monte Carlo simulation engine
- Goal tracking
- Scenario analysis

**Phase 5: Frontend (Week 21-23)**
- Net worth dashboard
- Asset allocation page
- Tax optimizer page
- Retirement planner page

**Phase 6: Testing & Deployment (Week 24)**
- Multi-asset integration testing
- Tax calculation validation (match ATO examples)
- Production deployment

### Success Criteria

**Technical**:
- Net worth tracking within 5% of actual
- Property valuation within 10% of market value
- Tax optimization saves 15%+ on capital gains tax
- Retirement probability calculation accurate within 10%

**User**:
- 1000+ active users
- 200+ users add multi-asset data
- 50+ users use tax optimizer
- 30+ users use retirement planner

**Business**:
- Platform becomes "financial hub" (not just stock signals)
- Premium tier: $29/month for multi-asset + tax optimization

### Technical Risks

1. **Property Valuation Accuracy**: Suburb indices may be inaccurate
   - Mitigation: Show estimate range (±10%), allow manual override

2. **Tax Compliance**: ATO rules change frequently
   - Mitigation: Annual review of tax logic, disclaimer ("not tax advice")

3. **Data Privacy**: Users hesitant to link bank accounts/crypto wallets
   - Mitigation: Manual input option, emphasize security/encryption

4. **Complexity**: Multi-asset system is significantly more complex
   - Mitigation: Gradual rollout, optional features, clear documentation

---

## CROSS-VERSION THEMES

### 1. Modularity

Each version adds NEW capabilities without breaking existing ones:
- V2: Model B doesn't affect Model A
- V3: Model C doesn't break A or B
- V4: RL is advisory (not automatic)
- V5: Multi-asset is optional (equities-only still works)

**Implementation**: Feature flags, isolated modules, clear API boundaries

### 2. Incremental Delivery

Ship early, gather feedback, iterate:
- V2: Deploy to 10% users first (A/B test)
- V3: Sentiment alerts are opt-in
- V4: RL recommendations require user approval
- V5: Multi-asset data is optional

**Implementation**: A/B testing, feature flags, user surveys

### 3. User Trust

Always prioritize trust over complexity:
- Show real performance (not inflated metrics)
- Explain model reasoning (SHAP, feature importance)
- Historical signals never changed (append-only log)
- Disclaimers: "Predictions, not guarantees"

**Implementation**: Honest communication, transparent performance tracking

### 4. Performance

API latency targets:
- V1: 3-4s → optimize to <500ms
- V2: <500ms (cache fundamentals)
- V3: <500ms (cache sentiment)
- V4: <1s (portfolio optimization is compute-heavy)
- V5: <1s (multi-asset queries)

**Implementation**: Pre-computation, caching, database indexing

---

## RESOURCE REQUIREMENTS: CLAUDE CODE BOOTSTRAP APPROACH

### Development Team

**Traditional Approach** (removed):
- ~47 person-months across V2-V5
- Cost: ~$470K in personnel
- **NOT NEEDED with Claude Code**

**Claude Code Approach**:
- Your time: 28 weeks of focused work across V2-V5
- Claude Code handles: coding, testing, documentation
- You handle: prompting, reviewing, decision-making, deployment

### Time Breakdown

**V2** (4 weeks with Claude Code):
- Week 1: Data infrastructure + Model B training
- Week 2: Ensemble strategy + Backend APIs
- Week 3: Frontend updates
- Week 4: Testing + deployment

**V3** (8 weeks with Claude Code):
- Week 1-2: ASX announcements pipeline + NLP setup
- Week 3-4: FinBERT fine-tuning + sentiment analysis
- Week 5-6: Real-time alerts + frontend
- Week 7-8: Ensemble V3 + testing + deployment

**V4** (8 weeks with Claude Code):
- Week 1-3: Portfolio optimization engine
- Week 4-6: RL implementation (PPO)
- Week 7: Frontend (wizard, simulation)
- Week 8: Testing + deployment

**V5** (8 weeks with Claude Code):
- Week 1-3: Multi-asset data integrations
- Week 4-5: Tax optimizer + retirement planner
- Week 6-7: Frontend (net worth, tax, retirement)
- Week 8: Testing + deployment

### Infrastructure Costs (Bootstrap Options)

**V3 Bootstrap Strategies**:
| Component | Free Option | Cost | Paid Option | Cost |
|-----------|-------------|------|-------------|------|
| ASX Announcements | Web scraping | $0 | ASX API | $600 |
| GPU (FinBERT) | Colab Pro | $20 | AWS p3.2xlarge | $400 |
| SMS Alerts | - | - | Twilio | $120 |
| **V3 Total** | Bootstrap | **$140** | All Paid | **$1,120** |

**V4 Bootstrap Strategies**:
| Component | Free Option | Cost | Paid Option | Cost |
|-----------|-------------|------|-------------|------|
| GPU (RL Training) | Colab Pro | $20 | AWS p3.2xlarge | $400 |
| **V4 Total** | Bootstrap | **$20** | Paid | **$400** |

**V5 Bootstrap Strategies**:
| Component | Free Option | Cost | Paid Option | Cost |
|-----------|-------------|------|-------------|------|
| Property Valuation | Manual input | $0 | API | $300 |
| Crypto APIs | Public endpoints | $0 | - | $0 |
| Bond API | Manual input | $0 | API | $300 |
| Open Banking | Manual input | $0 | Plaid/Yodlee | $600 |
| Tax Consultant | Required | $1,000-$2,000 | - | - |
| **V5 Total** | Bootstrap | **$1,000-$2,000** | All Paid | **$3,200** |

### Total Investment Comparison

**Traditional Approach** (original plan):
- Personnel: $470K
- Infrastructure: $11,150
- **Total: $481,650** over 18 months

**Claude Code Bootstrap Approach**:
- Personnel: $0 (you + Claude Code)
- Infrastructure: $1,160-$4,870 (depends on free vs paid choices)
- **Total: $1,160-$4,870** over 18 months
- **Savings: $476K-$480K (99% cost reduction)**

### Recommended Investment Path

**Phase 1 (V2)**: $150
- Start with EODHD API ($50/month × 3 months)
- If budget constrained, use yfinance (free)

**Phase 2 (V3)**: $740
- Web scraping for ASX announcements (free)
- Colab Pro for FinBERT ($20)
- Twilio for alerts ($120)
- Skip expensive ASX API ($600 saved)

**Phase 3 (V4)**: $20
- Colab Pro for RL training
- Avoid AWS GPU ($380 saved)

**Phase 4 (V5)**: $1,200
- Manual input for property/bonds (free)
- Free crypto APIs
- Skip Open Banking ($600 saved)
- Tax consultant ($1,000-$2,000)

**Total Recommended: $2,110** (vs $481,650 traditional approach)

---

## SUCCESS METRICS BY VERSION

| Version | Users | Accuracy | Latency | Revenue |
|---------|-------|----------|---------|---------|
| V1 | 100 | 62% (Model A) | 3-4s | $0 (free beta) |
| V2 | 250 | 68% (Ensemble) | <500ms | $0 (free) |
| V3 | 500 | 71% (+ Sentiment) | <500ms | $500/month (ads) |
| V4 | 1000 | 75% (+ RL) | <1s | $2K/month (freemium) |
| V5 | 2000 | 75% | <1s | $10K/month (premium) |

---

## DECISION POINTS

### After V2 Launch (Month 2)

**Decision**: Should we proceed with V3 (sentiment) or V4 (portfolio optimization)?

**Criteria**:
- If user feedback requests "news/sentiment": → V3
- If user feedback requests "portfolio optimization": → V4
- Default: V3 (follows natural progression)

### After V3 Launch (Month 8)

**Decision**: Should we proceed with V4 or pivot?

**Criteria**:
- If user engagement is strong (DAU/MAU >40%): → V4
- If users request "tax optimization" before "portfolio optimization": → V5 first
- If growth stalls: → Pause, iterate on V1-V3

### After V4 Launch (Month 14)

**Decision**: Should we build V5 or focus on growth?

**Criteria**:
- If 1000+ users and $5K+/month revenue: → V5
- If revenue <$2K/month: → Focus on growth, not new features
- If competitors launch multi-asset: → V5 (defensive move)

---

## CONCLUSION

V3-V5 represent a 18-month roadmap that transforms the platform from a stock signal system (V1-V2) to a comprehensive financial intelligence platform (V5).

**Key Principles**:
1. **Incremental**: Each version adds value on its own
2. **Modular**: New features don't break existing ones
3. **User-Driven**: Build what users request (not just cool tech)
4. **Honest**: Always communicate limitations clearly
5. **Profitable**: V4-V5 introduce monetization (freemium/premium)

**Next Steps**:
1. Complete V1 deployment (frontend, monitoring)
2. Launch V2 by Q2 2026
3. Gather user feedback before committing to V3-V5 sequence
4. Re-evaluate roadmap every 6 months

---

**Prepared By**: Product & Engineering Team
**Date**: January 28, 2026
**Status**: Strategic Roadmap (Subject to Change Based on User Feedback)
