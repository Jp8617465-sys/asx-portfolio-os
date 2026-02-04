# Roadmap Quick Reference Guide

**Purpose**: One-page reference for V1-V5 roadmap (Claude Code bootstrap approach)
**Last Updated**: January 28, 2026
**Development Approach**: Claude Code as dev team
**Total Investment**: $1,160-$4,870 (infrastructure only, 99% cost reduction)
**Your Time**: 28 weeks over 18 months

---

## VERSIONS AT A GLANCE

```
V1: MOMENTUM FOUNDATION (✅ Complete)
    Problem: "Where should I invest?"
    Solution: Model A momentum signals
    Status: Production ready, needs deployment
    Cost: $0 (sunk)

V2: FUNDAMENTAL INTELLIGENCE (🟡 Next, 4 weeks, $0-$150)
    Problem: "Are stocks fundamentally sound?"
    Solution: Model B + Ensemble (Momentum + Fundamentals)
    Target: May 2026
    Your Time: 4 weeks with Claude Code
    Bootstrap: yfinance (free) OR EODHD API ($150)

V3: SENTIMENT & NEWS (⚪ Future, 8 weeks, $140-$1,120)
    Problem: "What's the market saying?"
    Solution: Model C + Real-time alerts
    Target: Oct 2026
    Your Time: 8 weeks with Claude Code
    Bootstrap: Web scraping ($0) + Colab Pro ($20) + Twilio ($120) = $140

V4: PORTFOLIO OPTIMIZATION (⚪ Future, 8 weeks, $20-$400)
    Problem: "How should I allocate?"
    Solution: Mean-variance + RL
    Target: May 2027
    Your Time: 8 weeks with Claude Code
    Bootstrap: Colab Pro ($20) OR AWS GPU ($400)

V5: MULTI-ASSET & TAX (⚪ Future, 8 weeks, $1K-$3.2K)
    Problem: "How do I manage finances?"
    Solution: Property/crypto/loans + Tax optimizer
    Target: Nov 2027
    Your Time: 8 weeks with Claude Code
    Bootstrap: Manual inputs + Tax consultant ($1K-$2K)
```

---

## TIMELINE

```
2026                                    2027
────────────────────────────────────────────────────────
Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov  Dec  Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov
 │    │    │    │    │    │    │    │    │    │    │    │    │    │    │    │    │    │    │    │    │    │    │
V1 ──┘    │                                              │                                                        │
     V2 ──┴────────────────┘                             │                                                        │
                       V3 ─┴─────────────────────────────┘                                                        │
                                                    V4 ──┴─────────────────────────────────────┘                  │
                                                                                          V5 ───┴──────────────────┘
```

---

## SUCCESS METRICS (Unchanged)

| Version | Users | Accuracy | Revenue | Key Metric |
|---------|-------|----------|---------|------------|
| V1 | 100 | 68% ROC-AUC | $0 | Signals generating daily |
| V2 | 250 | 73% (ensemble) | $0 | 20+ use dual signals |
| V3 | 500 | 76% (+ sentiment) | $500/mo | 50+ subscribe to alerts |
| V4 | 1000 | 80% (+ RL) | $1.8K/mo | 100+ try portfolio wizard |
| V5 | 2000 | 80% | $8.7K/mo | 300+ premium subscribers |

---

## INVESTMENT: CLAUDE CODE APPROACH

**Traditional Approach** (REMOVED):
| Version | Personnel | Infrastructure | Total |
|---------|-----------|----------------|-------|
| V2-V5 | $470K | $11,150 | $481,650 |

**Claude Code Bootstrap Approach**:
| Version | Your Time | Bootstrap (Min) | Recommended | Maximum |
|---------|-----------|-----------------|-------------|---------|
| V2 | 4 weeks | $0 | $150 | $150 |
| V3 | 8 weeks | $140 | $140 | $1,120 |
| V4 | 8 weeks | $20 | $20 | $400 |
| V5 | 8 weeks | $1,000 | $1,200 | $3,200 |
| **Total** | **28 weeks** | **$1,160** | **$1,510** | **$4,870** |

**Savings**: $476,780-$480,490 (99% cost reduction)
**Break-Even**: Month 6-8 (vs Month 22 traditional)
**Month 24 Profit**: $104K cumulative (vs -$450K traditional)

---

## TIME REQUIREMENTS: CLAUDE CODE APPROACH

**Team Requirements** (REMOVED - not needed with Claude Code)

**Your Time with Claude Code**:
| Version | Duration | Hours | What You Do |
|---------|----------|-------|-------------|
| V2 | 4 weeks | 160 | Prompt Claude Code for data pipeline, Model B, APIs, frontend |
| V3 | 8 weeks | 320 | Prompt for scraping, FinBERT, alerts, ensemble V3 |
| V4 | 8 weeks | 320 | Prompt for portfolio optimizer, RL (PPO), simulation |
| V5 | 8 weeks | 320 | Prompt for multi-asset, tax calculator, retirement planner |
| **Total** | **28 weeks** | **1,120** | **Prompting, reviewing, testing, deploying** |

---

## BOOTSTRAP STRATEGIES

**V2: Data Source**
- Free: yfinance library ($0)
- Paid: EODHD API ($150)
- **Recommendation**: Start free, upgrade if needed

**V3: ASX Announcements**
- Free: Web scraping with Beautiful Soup ($0)
- Paid: ASX API ($600)
- **Recommendation**: Scraping (save $600)

**V3: GPU for FinBERT**
- Free: Google Colab Pro ($20)
- Paid: AWS p3.2xlarge ($400)
- **Recommendation**: Colab Pro (save $380)

**V4: RL Training**
- Free: Google Colab Pro ($20)
- Paid: AWS GPU ($400)
- **Recommendation**: Colab Pro (save $380)

**V5: Multi-Asset APIs**
- Free: Manual input for property/bonds ($0)
- Paid: APIs for all assets ($1,200)
- **Recommendation**: Manual input (save $1,200)
- **Required**: Tax consultant ($1K-$2K)

---

## DECISION POINTS

**After V2 (Month 4)**:
- ✅ Go to V3 if: 250+ users, 80% satisfaction, $150 spent justified
- ❌ Stop if: <100 users, negative feedback
- 💡 Total spent: $0-$150 (low risk)

**After V3 (Month 10)**:
- ✅ Go to V4 if: 500+ users, $500+/mo revenue (ads cover costs)
- ❌ Stop if: <250 users, <$500/mo
- 💡 Total spent: $140-$1,270 (still very low risk)

**After V4 (Month 16)**:
- ✅ Go to V5 if: 1000+ users, $1.8K+/mo (freemium profitable)
- ❌ Stop if: <500 users, <$1K/mo
- 💡 Total spent: $160-$1,670 (easily recovered from revenue)

---

## RISKS

### High Priority
1. **User Churn** → A/B testing, fast iteration
2. **RL Instability (V4)** → Safety bounds, kill switch
3. **Tax Compliance (V5)** → Consultant + disclaimers

### Medium Priority
4. **Competitor Launch** → Differentiate on ASX focus
5. **Data Quality** → Validation pipelines
6. **Budget Overrun** → Cut scope if needed

---

## KEY DOCUMENTS

📄 **ROADMAP_EXECUTIVE_SUMMARY.md** - Read this first (stakeholder view)
📄 **ROADMAP_IMPLEMENTATION_PLAN.md** - Strategic overview (V1-V5 details)
📄 **V2_IMPLEMENTATION_TASKS.md** - Detailed V2 tasks (start here for V2)
📄 **V3_V4_V5_ROADMAP_SUMMARY.md** - V3-V5 high-level plan
📄 **MASTER_IMPLEMENTATION_TRACKER.md** - Central tracking (update weekly)
📄 **ROADMAP_QUICK_REFERENCE.md** - This document (one-pager)

---

## CURRENT STATUS (Jan 28, 2026)

### V1 Tasks (Before V2)
- [ ] Deploy frontend to Vercel (15 min)
- [ ] Apply database indexes (10 min)
- [ ] Set up monitoring (5 min)
- [ ] Smoke test production (10 min)

### V2 Next Steps
1. Approve $71K budget
2. Hire/allocate team (ML, Backend, Frontend)
3. Set up EODHD API ($50/month)
4. Week 1-2: Data infrastructure
5. Week 3-5: Train Model B
6. Week 6: Ensemble strategy
7. Week 7-8: Backend APIs
8. Week 9-10: Frontend
9. Week 11-12: Deploy

---

## KEY MESSAGES FOR STAKEHOLDERS

**Using Claude Code reduces development costs from $482K to $1.5K-$3.5K**
- 99% cost reduction
- Same features, much lower risk
- Your time: 28 weeks over 18 months

**Break-even moves from Month 22 to Month 6-8**
- Monthly infrastructure: $85/month (avg)
- V3 ads revenue: $500/month
- Profit from Month 6 onwards

**Bootstrap approach: Start free, upgrade as revenue grows**
- V2: Start with yfinance (free), upgrade to EODHD if users request ($150)
- V3: Scrape ASX (free), skip expensive API (save $600)
- V4: Use Colab Pro (save $380 vs AWS GPU)
- V5: Manual input first, add APIs based on user demand

**ROI: 2,100%+ by Month 24**
- Investment: $1.5K-$3.5K
- Cumulative profit: $104K by Month 24
- vs Traditional: -$450K loss by Month 24

---

## CONTACT

**For Questions**:
- Technical: See MASTER_IMPLEMENTATION_TRACKER.md
- Business: See ROADMAP_EXECUTIVE_SUMMARY.md
- V2 Tasks: See V2_IMPLEMENTATION_TASKS.md
- Bootstrap Strategies: See ROADMAP_IMPLEMENTATION_PLAN.md

**Updates**:
- Weekly: MASTER_IMPLEMENTATION_TRACKER.md
- Monthly: Go/No-Go decisions
- Quarterly: Roadmap re-evaluation

---

**Prepared By**: Claude Code Bootstrap Plan
**Date**: January 28, 2026
**Approach**: Claude Code as dev team (99% cost reduction)
**Investment**: $1,160-$4,870 (infrastructure only)
**Next Review**: February 4, 2026
