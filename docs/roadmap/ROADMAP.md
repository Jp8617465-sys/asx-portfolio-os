# Product Roadmap

Transform ASX Portfolio OS from a stock signal platform to a comprehensive financial intelligence platform.

**Timeline**: 18-24 months (V1 to V5)
**Current Status**: V2 Complete

---

## Vision

| Version | Problem Solved | Key Feature |
|---------|----------------|-------------|
| V1 | Should I buy this stock? | Momentum signals (Model A) |
| V2 | Is this stock fundamentally sound? | Fundamental analysis (Model B) + Ensemble |
| V3 | What's the market saying? | Sentiment & news (Model C) |
| V4 | How should I allocate my portfolio? | Portfolio optimization & RL |
| V5 | How do I manage my finances? | Multi-asset & tax optimization |

---

## V1: Momentum Foundation (Complete)

**Status**: Production ready

### Delivered
- Model A (momentum-based LightGBM) - 68% ROC-AUC
- 46 REST APIs with rate limiting
- Next.js frontend (9 pages)
- Daily signal generation pipeline
- Portfolio management (CSV upload, tracking)
- User authentication (JWT)

---

## V2: Fundamental Intelligence (Complete)

**Status**: Production ready

### Delivered
- Model B (fundamental analysis)
- Quality scores (A-F grades)
- Ensemble signals (60% momentum + 40% fundamentals)
- Conflict detection (model disagreement warnings)
- EODHD API integration
- Comprehensive test suite (2,241 lines)

### Success Criteria
- Model B precision >65% on top quintile
- Ensemble Sharpe ratio 5%+ better than Model A alone
- 100+ active users

---

## V3: Sentiment & News Awareness (Planned)

**Target**: Q4 2026
**Duration**: 8 weeks

### Key Capabilities
1. **Model C: Sentiment Analysis**
   - Fine-tuned FinBERT on ASX announcements
   - Classification: POSITIVE, NEUTRAL, NEGATIVE

2. **ASX Announcements Ingestion**
   - ~500 announcements/day
   - 15-minute polling

3. **Ensemble V3**
   - Weights: 40% Model A + 30% Model B + 30% Model C
   - Sentiment override on negative announcements

4. **Real-time Alerts**
   - Email/SMS when sentiment changes
   - Alert precision target: 70%

### Success Criteria
- Model C F1 score >0.75
- Ensemble Sharpe 3-5% better than V2
- 50+ alert subscribers

---

## V4: Portfolio Optimization & RL (Planned)

**Target**: Q2 2027
**Duration**: 8 weeks

### Key Capabilities
1. **Portfolio Optimization**
   - Mean-variance optimization (Markowitz)
   - Risk profiling (Conservative/Balanced/Aggressive)

2. **Reinforcement Learning**
   - PPO algorithm
   - State: Portfolio + signals + volatility
   - Reward: Sharpe ratio over next month

3. **Simulation Engine**
   - Backtest strategies
   - Monte Carlo risk assessment

4. **One-Click Rebalancing**
   - Portfolio wizard (onboarding)
   - Rebalance planner

### Success Criteria
- RL Sharpe 10%+ better than baseline
- 100+ users try portfolio wizard
- Zero RL safety incidents

---

## V5: Multi-Asset Intelligence & Tax (Planned)

**Target**: Q4 2027
**Duration**: 8 weeks

### Key Capabilities
1. **Multi-Asset Tracking**
   - Property, loans, bonds, crypto, cash
   - Net worth dashboard

2. **Cross-Asset Allocation**
   - Mean-variance across all asset classes
   - Regime detection (bull/bear)

3. **Tax Optimizer**
   - CGT calculator
   - Tax-loss harvesting
   - ATO compliance

4. **Retirement Planner**
   - Monte Carlo simulation
   - Goal tracking

### Success Criteria
- Net worth tracking within 5% of actual
- Tax optimizer saves 15%+ on CGT
- 200+ users add multi-asset data

---

## Decision Framework

### After V2 (Current)
**Go to V3 if:**
- 250+ users
- 80% satisfaction
- 5+ requests for sentiment/news

### After V3
**Go to V4 if:**
- 500+ users
- 15%+ engagement increase
- $1K+/month revenue

### After V4
**Go to V5 if:**
- 1000+ users
- $5K+/month revenue
- Users request multi-asset

---

## Revenue Model

| Version | Model | Price | Target |
|---------|-------|-------|--------|
| V1-V2 | Free | $0 | Build user base |
| V3 | Ads | $0 | $500/mo revenue |
| V4 | Freemium | $9/mo | $2K/mo revenue |
| V5 | Premium | $29/mo | $10K/mo revenue |

---

## Competitive Advantages

1. **ASX Focus**: Only platform tailored to Australian equities
2. **Multi-Model Ensemble**: 3 models (competitors have 1-2)
3. **Transparency**: Real performance (68% accuracy, not "95%")
4. **Explainability**: SHAP feature importance
5. **Tax Optimization**: Unique in Australia

---

## Key Principles

### 1. Incremental Delivery
Ship early, gather feedback, iterate. Each version valuable on its own.

### 2. Modularity
New models don't break existing ones. Feature flags allow disabling experimental features.

### 3. User Trust
- No fake metrics
- Honest communication
- Historical signals never changed

### 4. User Control
Advisory, not prescriptive. Users make final decisions.

---

## Metrics

### North Star
- User Growth: 20%+ QoQ
- Engagement: DAU/MAU >40%
- Revenue: $10K/month by Month 24
- Accuracy: Sharpe improves 15%+ from V1 to V5

### By Version
| Version | KPI | Target |
|---------|-----|--------|
| V1 | Active users | 100+ |
| V2 | Dual-signal usage | 20+ users |
| V3 | Alert subscribers | 50+ users |
| V4 | Portfolio wizard usage | 100+ users |
| V5 | Premium subscribers | 300+ users |
