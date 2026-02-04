# ASX Portfolio OS: V1-V5 Roadmap - Executive Summary

**Date**: January 28, 2026
**Current Status**: V1 Production Ready
**Development Approach**: Claude Code as dev team (bootstrap approach)
**Timeline**: 18-24 months to V5
**Investment Required**: $1,470-$3,570 (infrastructure only, no personnel costs)
**Your Time Required**: ~28 weeks working with Claude Code
**Projected ROI**: Break-even Month 6-8, $104K+/year by Month 24
**Cost Savings**: $478K+ (99% reduction vs traditional approach)

---

## THE VISION

Transform from a single-model stock signal platform (V1) to a comprehensive, AI-powered financial intelligence platform (V5) that helps Australian investors manage their entire financial lives.

**User Journey**:
- **V1**: "Should I buy this stock?" → Momentum signals
- **V2**: "Is this stock fundamentally sound?" → + Fundamental analysis
- **V3**: "What's the market saying?" → + Sentiment & news
- **V4**: "How should I allocate my portfolio?" → + Portfolio optimization & RL
- **V5**: "How do I manage my finances?" → + Multi-asset & tax optimization

---

## VERSION OVERVIEW: CLAUDE CODE BOOTSTRAP APPROACH

| Version | Problem Solved | Your Time | Infrastructure Cost | Key Feature |
|---------|----------------|-----------|---------------------|-------------|
| **V1** | Where to invest? | ✅ Complete | $0 (sunk) | Momentum signals (Model A) |
| **V2** | Are stocks sound? | 4 weeks | $0-$150 | Fundamental analysis (Model B) |
| **V3** | What's the news? | 8 weeks | $140-$1,120 | Sentiment & alerts (Model C) |
| **V4** | How to allocate? | 8 weeks | $20-$400 | Portfolio optimization & RL |
| **V5** | Manage finances? | 8 weeks | $1,000-$3,200 | Multi-asset & tax optimization |

**Total Investment**: $1,160-$4,870 over 18 months (infrastructure only)
**Total Your Time**: 28 weeks working with Claude Code (vs $482K with traditional team)

---

## V1: MOMENTUM FOUNDATION (COMPLETE ✅)

### Status
- **Launch Date**: January 2026
- **Current State**: Production ready, needs final deployment
- **Performance**: 68% ROC-AUC, 62% accuracy

### What's Working
- Model A (momentum-based LightGBM) trained and validated
- 46 REST APIs with rate limiting
- 9-page Next.js frontend
- Daily signal generation pipeline
- Portfolio management (CSV upload, tracking, rebalancing)
- Data integrity verified (no leakage)

### What's Next
- Deploy frontend to Vercel (15 min)
- Apply database indexes for 5-10x performance boost
- Set up uptime monitoring
- Optimize API latency: 3-4s → <500ms

### Key Learning
**Marketing must match reality**: Removed 1500+ lines of aspirational code that claimed multi-model ensemble when only Model A existed. Honesty builds trust.

---

## V2: FUNDAMENTAL INTELLIGENCE (NEXT)

### The Problem
Users get momentum signals (technical analysis) but don't know if stocks are fundamentally sound. Need to avoid "value traps" - stocks with great momentum but terrible financials.

### The Solution
**Dual-signal system**: Momentum (Model A) + Fundamentals (Model B)
- Model B analyzes P/E, ROE, debt ratios, revenue growth
- Quality score: A (best) to F (worst)
- Ensemble: 60% momentum + 40% fundamentals
- Conflict detection: Warn when models disagree

### Timeline & Investment (Claude Code Approach)
- **Your Time**: 4 weeks working with Claude Code (~160 hours)
- **Launch Target**: May 2026

### Investment Options
**Option A (Free Bootstrap)**:
- Use yfinance Python library (free)
- **Total: $0**
- Trade-off: Less reliable, rate limits

**Option B (Recommended)**:
- Use EODHD API ($50/month × 3 months)
- **Total: $150**
- Trade-off: More reliable, comprehensive data

**vs Traditional Approach**: $70,650 (personnel + infrastructure)
**Savings**: $70,500-$70,650 (99% cost reduction)

### Success Criteria
- Model B precision >65% on top quintile stocks
- Ensemble Sharpe ratio 5%+ better than Model A alone
- 100+ active users by Month 1
- 20+ users filter by "models agree"

### Key Risks
1. **Fundamentals API rate limits** → Mitigation: Cache for 7 days
2. **Model B overfitting** → Mitigation: Sector-balanced training
3. **User confusion (models disagree)** → Mitigation: Clear UI + tooltips

### Why V2 Matters
- Differentiates from pure technical analysis platforms
- Catches fundamentally weak stocks before they crash
- Builds trust (multi-model validation)

---

## V3: SENTIMENT & NEWS AWARENESS

### The Problem
Momentum and fundamentals are backward-looking. Need real-time awareness of news (earnings, guidance, M&A) that shifts sentiment before it fully reflects in price.

### The Solution
**Triple-signal system**: Momentum + Fundamentals + Sentiment
- Model C: FinBERT fine-tuned on ASX announcements
- Real-time alerts (15-min polling)
- News feed on dashboard
- Sentiment timeline per stock

### Timeline & Investment (Claude Code Approach)
- **Your Time**: 8 weeks working with Claude Code (~320 hours)
- **Launch Target**: October 2026

### Investment Options
**Full Bootstrap**:
- Web scraping (Beautiful Soup) for ASX announcements = $0
- Google Colab Pro for FinBERT training = $20
- Twilio for SMS alerts = $120
- **Total: $140**

**Recommended (Skip Expensive ASX API)**:
- Same as bootstrap = **$140**

**Maximum (All Paid)**:
- ASX API ($600) + AWS GPU ($400) + Twilio ($120)
- **Total: $1,120**

**vs Traditional Approach**: $131,800
**Savings**: $130,680-$131,660 (99% cost reduction)

### Success Criteria
- Model C F1 score >0.75 on sentiment classification
- Ensemble Sharpe 3-5% better than V2
- Alert precision >70% (price moves within 3 days)
- 50+ users subscribe to alerts

### Key Risks
1. **Sentiment noise (false signals)** → Mitigation: Filter routine announcements
2. **NLP complexity (GPU required)** → Mitigation: Google Colab or AWS
3. **Alert fatigue** → Mitigation: High confidence threshold (>70%)

### Why V3 Matters
- Catches sentiment shifts before competitors
- Real-time alerts = higher engagement
- News feed = user spends more time on platform

---

## V4: PORTFOLIO OPTIMIZATION & RL

### The Problem
Users have individual stock signals but don't know how to construct optimal portfolios. Need holistic allocation advice, not just "buy this stock."

### The Solution
**Portfolio-level optimization + Reinforcement Learning**
- Mean-variance optimization (Markowitz)
- RL learns from outcomes (PPO algorithm)
- Risk profiling (Conservative, Balanced, Aggressive)
- One-click rebalancing
- Simulation: "What if I followed Model A only?"

### Timeline & Investment (Claude Code Approach)
- **Your Time**: 8 weeks working with Claude Code (~320 hours)
- **Launch Target**: May 2027

### Investment Options
**Bootstrap**:
- Google Colab Pro for RL training = $20
- **Total: $20**
- Trade-off: Slower training, session limits, checkpointing needed

**Paid**:
- AWS p3.2xlarge GPU = $400
- **Total: $400**
- Trade-off: Faster training, no session limits

**vs Traditional Approach**: $141,800
**Savings**: $141,400-$141,780 (99% cost reduction)

### Success Criteria
- RL policy Sharpe 10%+ better than baseline
- Portfolio optimization meets risk profile 80%+ of time
- 100+ users try portfolio wizard
- Zero runaway RL incidents (safety critical)

### Key Risks
1. **RL instability (erratic trades)** → Mitigation: Safety bounds, kill switch
2. **User distrust of RL** → Mitigation: Show reasoning, baseline alternative
3. **Computational cost** → Mitigation: Weekly training (not daily)

### Why V4 Matters
- Moves from stock-picking to portfolio management
- RL is cutting-edge (few competitors have this)
- Monetization opportunity (freemium: $9/month for RL)

---

## V5: MULTI-ASSET INTELLIGENCE & TAX

### The Problem
Users manage more than just stocks (property, loans, crypto). Need holistic financial view + tax optimization.

### The Solution
**Multi-asset platform + Tax optimization**
- Property, loans, bonds, crypto, cash tracking
- Net worth dashboard
- Cross-asset allocation
- CGT calculator
- Tax-loss harvesting
- Retirement planner (Monte Carlo)

### Timeline & Investment (Claude Code Approach)
- **Your Time**: 8 weeks working with Claude Code (~320 hours)
- **Launch Target**: November 2027

### Investment Options
**Full Bootstrap**:
- Manual input for property/bonds = $0
- Free public crypto APIs = $0
- Skip Open Banking (manual input) = $0
- Tax consultant (required) = $1,000-$2,000
- **Total: $1,000-$2,000**

**Recommended (Same as bootstrap)**:
- **Total: $1,000-$2,000**

**Maximum (All Paid APIs)**:
- Property API ($300) + Bond API ($300) + Open Banking ($600) + Tax consultant ($2,000)
- **Total: $3,200**

**vs Traditional Approach**: $137,400
**Savings**: $134,200-$136,400 (99% cost reduction)

### Success Criteria
- Net worth tracking within 5% of actual
- Property valuation within 10% of market
- Tax optimizer saves 15%+ on capital gains
- 200+ users add multi-asset data

### Key Risks
1. **Property valuation accuracy** → Mitigation: Show estimate range (±10%)
2. **Tax compliance (legal risk)** → Mitigation: Tax consultant + disclaimers
3. **Data privacy (bank/crypto accounts)** → Mitigation: Manual input option

### Why V5 Matters
- Becomes "financial hub" (not just stock platform)
- Premium tier: $29/month (multi-asset + tax)
- Sticky users (entire financial life in one place)

---

## FINANCIAL PROJECTIONS: CLAUDE CODE APPROACH

### Revenue Model (Unchanged)

| Version | Model | Price | Target Users | Monthly Revenue |
|---------|-------|-------|--------------|-----------------|
| V1 | Free | $0 | 100 | $0 |
| V2 | Free | $0 | 250 | $0 |
| V3 | Ads | $0 | 500 | $500 (Month 12) |
| V4 | Freemium | $9/month | 1000 (200 paid) | $1,800 (Month 18) |
| V5 | Premium | $29/month | 2000 (300 paid) | $8,700 (Month 24) |

### Cost Structure: Traditional vs Claude Code

**Traditional Approach**:
| Version | Personnel | Infrastructure | Total |
|---------|-----------|----------------|-------|
| V1 | $100K (sunk) | $0 | $100K |
| V2 | $70K | $150 | $70,650 |
| V3 | $130K | $1,800 | $131,800 |
| V4 | $140K | $1,800 | $141,800 |
| V5 | $130K | $7,400 | $137,400 |
| **Total** | **$570K** | **$11,150** | **$581,650** |

**Claude Code Bootstrap Approach**:
| Version | Your Time | Infrastructure (Min) | Infrastructure (Recommended) | Infrastructure (Max) |
|---------|-----------|---------------------|------------------------------|----------------------|
| V1 | Complete | $0 (sunk) | $0 (sunk) | $0 (sunk) |
| V2 | 4 weeks | $0 | $150 | $150 |
| V3 | 8 weeks | $140 | $140 | $1,120 |
| V4 | 8 weeks | $20 | $20 | $400 |
| V5 | 8 weeks | $1,000 | $1,200 | $3,200 |
| **Total** | **28 weeks** | **$1,160** | **$1,510** | **$4,870** |

**Cost Savings**: $576,780-$580,490 (99% reduction)

### Break-Even Analysis: Claude Code Approach

**Monthly Infrastructure Costs** (averaged over 18 months):
- Minimum: $65/month
- Recommended: $85/month
- Maximum: $270/month

**Break-Even Timeline**:

**Minimum Bootstrap Path** ($65/month average):
- Month 1-5: Burn $65/month
- Month 6: V3 ads = $500/month revenue
- **Break-even: Month 6** (revenue > costs)
- Month 12+: Pure profit

**Recommended Path** ($85/month average):
- Month 1-6: Burn $85/month
- Month 7-8: V3 ads = $500/month revenue
- **Break-even: Month 6-8** (revenue > costs)
- Month 12+: Pure profit

**vs Traditional Approach**:
- Break-even: Month 22 (was)
- Break-even: Month 6-8 (now)
- **16 months faster profitability**

### ROI Comparison

**Traditional Approach**:
- Investment: $581,650
- Break-even: Month 22
- Month 24 profit: $3,700/month
- ROI at Month 24: -95% (still deeply in red)

**Claude Code Approach**:
- Investment: $1,160-$4,870
- Break-even: Month 6-8
- Month 24 profit: $8,700/month (all revenue is profit after infrastructure)
- ROI at Month 24: +2,100% (cumulative $104K profit from Month 6-24)

### Sensitivity Analysis

**Best Case** (faster user growth + minimum bootstrap):
- Break-even: Month 4
- Month 24 revenue: $15K/month
- Cumulative profit by Month 24: $180K+

**Base Case** (planned growth + recommended path):
- Break-even: Month 6-8
- Month 24 revenue: $8.7K/month
- Cumulative profit by Month 24: $104K

**Worst Case** (slower growth + maximum costs):
- Break-even: Month 12
- Month 24 revenue: $3K/month
- Cumulative profit by Month 24: $30K
- Still profitable (vs traditional: -$450K)

---

## KEY DIFFERENTIATORS

### Why Users Will Choose Us

1. **ASX Focus**: Only platform tailored to Australian equities
2. **Multi-Model Ensemble**: Momentum + Fundamentals + Sentiment (competitors have 1-2)
3. **Transparency**: Show model performance honestly (68% accuracy, not "AI 95%")
4. **Explainability**: SHAP feature importance (not black box)
5. **Portfolio-Level**: Optimize portfolios, not just stock picking
6. **Tax Optimization**: Save 15%+ on capital gains (unique in Australia)

### Competitive Landscape

| Competitor | Focus | Models | Tax Optimization | Price |
|------------|-------|--------|------------------|-------|
| **ASX Portfolio OS** | ASX | 3 (A+B+C) | Yes (V5) | $0-$29/month |
| OpenMarkets | ASX | 1 (technical) | No | $20/month |
| Stocklight | ASX | 1 (fundamental) | No | Free |
| Simply Wall St | Global | 1 (fundamental) | No | $15/month |
| TradingView | Global | 0 (charts only) | No | $15/month |

**Competitive Advantage**: Only platform with multi-model ensemble + tax optimization for ASX.

---

## IMPLEMENTATION PRINCIPLES

### 1. Incremental Delivery
Ship early, ship often. Each version is valuable on its own.

### 2. Modularity
New models don't break existing ones. Feature flags allow disabling experimental features.

### 3. User Trust
- No fake metrics (68% accuracy, not "95%")
- Honest communication (disclaimers, limitations)
- Historical signals never changed (append-only)

### 4. Continuous Learning
Models improve over time without breaking trust. Weekly retraining, transparent performance tracking.

### 5. User Control
Advisory, not prescriptive. Users make final decisions. RL recommendations require approval.

---

## DECISION FRAMEWORK

### Go/No-Go After V2 (Month 4)

**Go to V3 if**:
- 250+ users
- 80% satisfaction
- 5+ requests for sentiment/news

**No-Go if**:
- <100 users
- Negative feedback
- Users want V1 improvements instead

**Pivot if**:
- Users request V4 features (portfolio optimization) before V3

### Go/No-Go After V3 (Month 10)

**Go to V4 if**:
- 500+ users
- 15%+ engagement increase
- $1K+/month revenue

**No-Go if**:
- <250 users
- <5% engagement increase

**Pivot if**:
- Competitors launch portfolio optimization (defensive move)

### Go/No-Go After V4 (Month 16)

**Go to V5 if**:
- 1000+ users
- $5K+/month revenue
- Users request multi-asset

**No-Go if**:
- <500 users
- <$2K/month revenue
- Focus on growth instead

---

## CRITICAL SUCCESS FACTORS

### Technical Excellence
- Model performance (Sharpe improvements every version)
- API latency <500ms
- Data integrity (no leakage)
- Zero critical incidents

### User Experience
- Simple, clear UI
- Fast load times (<2s)
- Mobile-responsive
- Explainability (not black box)

### Trust & Credibility
- Honest performance reporting
- Data privacy (no data breaches)
- Regulatory compliance (disclaimers)
- Customer support (respond <24 hours)

### Business Viability
- User growth (20%+ QoQ)
- Engagement (DAU/MAU >40%)
- Monetization (freemium conversion >10%)
- Break-even by Month 22

---

## RISKS & MITIGATION

### High-Priority Risks

1. **User Churn** (Impact: High, Probability: Medium)
   - Mitigation: A/B testing, user feedback loops, fast iteration

2. **RL Instability** (Impact: High, Probability: Medium)
   - Mitigation: Safety bounds, kill switch, baseline comparison

3. **Tax Compliance** (Impact: High, Probability: Low)
   - Mitigation: Tax consultant, disclaimers, legal review

### Medium-Priority Risks

4. **Competitor Launch** (Impact: Medium, Probability: Medium)
   - Mitigation: Differentiate on ASX focus, transparency, multi-model

5. **Data Quality** (Impact: Medium, Probability: Medium)
   - Mitigation: Validation pipelines, sanity checks, monitoring

6. **Budget Overrun** (Impact: Medium, Probability: Low)
   - Mitigation: Prioritize ruthlessly, cut scope if needed

---

## NEXT STEPS

### Immediate (Week 1)
1. ✅ Create roadmap implementation plans (DONE)
2. [ ] Review with stakeholders
3. [ ] Approve budget ($482K over 18 months)
4. [ ] Set up project management (Linear/Jira)

### Week 2-4 (V1 Completion)
1. [ ] Deploy frontend to Vercel
2. [ ] Apply database indexes
3. [ ] Set up monitoring
4. [ ] Launch V1 publicly

### Month 2 (V2 Kickoff)
1. [ ] Hire/allocate V2 team (ML, Backend, Frontend)
2. [ ] Set up EODHD Fundamentals API
3. [ ] V2 Sprint 1 (Data Infrastructure)

### Month 4 (V2 Launch + Go/No-Go)
1. [ ] Deploy V2 to production
2. [ ] Gather user feedback
3. [ ] Decide: V3 or V4 next?

### Month 10 (V3 Launch + Go/No-Go)
1. [ ] Deploy V3 to production
2. [ ] Evaluate monetization (ads working?)
3. [ ] Decide: Continue to V4?

### Month 16 (V4 Launch + Go/No-Go)
1. [ ] Deploy V4 to production
2. [ ] Evaluate freemium conversion
3. [ ] Decide: Build V5 or focus on growth?

### Month 22 (V5 Launch)
1. [ ] Deploy V5 to production
2. [ ] Launch premium tier ($29/month)
3. [ ] Celebrate break-even!

---

## MEASURING SUCCESS

### North Star Metrics

1. **User Growth**: 20%+ QoQ
2. **Engagement**: DAU/MAU >40%
3. **Revenue**: $10K/month by Month 24
4. **Accuracy**: Sharpe ratio improves 15%+ from V1 to V5
5. **Trust**: 80%+ user satisfaction

### Version-Specific KPIs

| Version | KPI | Target |
|---------|-----|--------|
| V1 | Active users | 100+ |
| V2 | Dual-signal usage | 20+ users |
| V3 | Alert subscribers | 50+ users |
| V4 | Portfolio wizard usage | 100+ users |
| V5 | Premium subscribers | 300+ users |

---

## CONCLUSION

This roadmap transforms ASX Portfolio OS from a single-model stock signal platform to a comprehensive financial intelligence platform over 18 months.

**Key Strengths with Claude Code Approach**:
- **Cost Efficiency**: 99% cost reduction ($1.5K vs $482K)
- **Speed to Market**: Same features, much lower risk
- **Profitability**: Break-even Month 6-8 (vs Month 22)
- **Flexibility**: Bootstrap options let you start free, upgrade as revenue grows
- **Incremental delivery**: Ship V2, gather feedback, iterate
- **Clear differentiation**: ASX focus, multi-model, tax optimization
- **Honest communication**: No fake metrics, transparent performance
- **Modular architecture**: New features don't break old ones

**Key Risks**:
- **Your Time Commitment**: 28 weeks of focused work over 18 months
- **User Growth**: Need 2000+ users by Month 24 (same as before)
- **Competition**: Other platforms may copy features
- **Execution Risk**: Much lower (no team management, no hiring)

**Bootstrap Strategy Benefits**:
1. **Start Free**: V2 can use yfinance ($0), V3 can scrape ASX ($0)
2. **Upgrade Selectively**: Only pay for APIs when users complain about free options
3. **Test First**: Validate V2 with free data before spending $150 on EODHD
4. **Low Risk**: If V2 fails, you've only spent time, not $70K

**Recommendation**: **PROCEED WITH V2 IMMEDIATELY**

V1 is production-ready. V2 with Claude Code is:
- **Low Risk**: $0-$150 (vs $71K)
- **Fast**: 4 weeks (vs 12 weeks with team)
- **Flexible**: Start free, upgrade if needed
- **Proven**: V1 was built this way successfully

**Go/No-Go Decision Points**:
- After V2 (Month 4): If 250+ users → V3
- After V3 (Month 10): If $500/month revenue → V4
- After V4 (Month 16): If $5K/month revenue → V5

**Expected Outcome with Claude Code**:
- **Break-even**: Month 6-8 (vs Month 22 traditional)
- **Cumulative Profit at Month 24**: $104K (vs -$450K traditional)
- **ROI**: 2,100%+ by Month 24
- **Total Investment**: $1.5K-$3.5K (you can fund this from personal savings)
- **Your Time**: 28 weeks over 18 months (manageable as side project or full-time focus)

**The Math**:
- Traditional: Invest $482K, lose money until Month 22, barely break-even by Month 24
- Claude Code: Invest $1.5K-$3.5K, break-even Month 6-8, profit $104K by Month 24
- **You keep an extra $585K+ using Claude Code**

---

## DOCUMENTS CREATED

All roadmap documents are now available:

1. **ROADMAP_IMPLEMENTATION_PLAN.md** - Strategic overview (V1-V5)
2. **V2_IMPLEMENTATION_TASKS.md** - Detailed V2 task breakdown (12 weeks)
3. **V3_V4_V5_ROADMAP_SUMMARY.md** - High-level V3-V5 overview
4. **MASTER_IMPLEMENTATION_TRACKER.md** - Central tracking document
5. **ROADMAP_EXECUTIVE_SUMMARY.md** - This document

**Next**: Review with stakeholders, approve budget, begin V2 execution.

---

**Prepared By**: Product & Engineering Team
**Date**: January 28, 2026
**Approved By**: [Pending Stakeholder Review]
**Status**: Ready for Execution
