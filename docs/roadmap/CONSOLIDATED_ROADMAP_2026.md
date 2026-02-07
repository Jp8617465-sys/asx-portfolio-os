# ASX Portfolio OS: Consolidated Product Roadmap 2026

**Document Version:** 2.0
**Last Updated:** February 6, 2026
**Status:** Strategic consolidation of existing plans + new AI-first vision

---

## Executive Summary

This document consolidates the existing V1-V5 product roadmap with the new "AI-First ASX Trading Platform" vision. After thorough codebase analysis, we found that **many features proposed in the new roadmap are already implemented**, requiring a significant re-prioritization.

### Key Finding: Current State vs. Proposed Roadmap

| Feature | New Roadmap Assumed | Actual Current State |
|---------|---------------------|---------------------|
| ML Features | 7 features, expand to 15 | **12 features already** |
| Model Accuracy | Target 64%+ ROC-AUC | **68% ROC-AUC achieved** |
| Walk-forward Validation | Month 1-2 (to implement) | **Already implemented** |
| Signal Dashboard | Month 3-4 (to build) | **Production ready** |
| Watchlist Management | Should-have, Month 3-4 | **Already built** |
| SHAP Explainability | Month 3-4 (to integrate) | **Integrated and working** |
| Model B (Fundamentals) | Q3 (Month 7-9) | **Production ready (V2)** |
| Ensemble Signals | Month 3-4 | **Production ready with conflict detection** |
| Portfolio Management | Q3 feature | **CSV upload, holdings, risk metrics working** |
| Dark Mode | Month 4 | **Implemented** |
| Mobile Responsive | Month 3-6 | **Partially complete** |

### What's Actually Missing (High-Value Gaps)

1. **ETF Holdings Drill-down** - Schema exists, UI not built
2. **Price Alerts System** - Scaffolded, not implemented
3. **Stock Screener with AI Filters** - Not started
4. **Historical Accuracy Dashboard** - Not implemented
5. **Model C (Sentiment)** - Planned for V3
6. **Data Provider Fallback** - EODHD only, no resilience
7. **Holdings Table Virtualization** - Not needed yet (< 500 items typical)

---

## Part 1: Strategic Tradeoff Analysis

### Tradeoff 1: Feature Expansion vs. Model Quality

**Context:** Current Model A has 12 features with 68% ROC-AUC. The new roadmap proposed expanding from 7 to 15 features to hit 64%+.

**Current Features (Model A v1.1):**
- Momentum: 12-1 month, 6M, 3M, 9M returns
- Volatility: 30-day, 90-day rolling std dev, ratios
- Trend: 200-day SMA, slope detection, trend strength
- Volume: ADV 20-day median, volume ratios
- Technical: RSI-14, MACD signal

**Proposed Additions (Evaluated):**
| Feature | Value | Risk | Recommendation |
|---------|-------|------|----------------|
| PE Ratio vs Sector | Medium | Low | Already in Model B |
| Earnings Surprise % | High | Medium | Add - genuine alpha |
| PEG Ratio | Medium | Low | Already in Model B |
| Volume Z-score 200d | Medium | Low | Similar to current volume features |
| Price vs 50-day EMA | Low | Low | Derivative of SMA already present |
| ATR | Medium | Low | Consider for volatility regime |

**Decision:** Add only 2-3 high-impact features (Earnings Surprise, ATR). Avoid feature bloat that risks overfitting. Current 68% accuracy exceeds 65% target.

---

### Tradeoff 2: ETF Drill-down vs. Stock Screener

**Context:** Both are high-value features. Limited development capacity.

| Factor | ETF Drill-down | Stock Screener |
|--------|---------------|----------------|
| Differentiation | High (unique workflow) | Medium (competitors have) |
| Implementation Effort | 3-4 weeks | 2-3 weeks |
| Data Dependency | ETF holdings data needed | Uses existing signals |
| User Value | Discovery via ETFs | Filtering existing signals |
| Revenue Potential | Premium feature | Premium feature |

**Decision:** ETF Drill-down first (unique differentiator), then Stock Screener. The ETF → Holdings → Stock navigation creates a discovery workflow competitors don't offer.

---

### Tradeoff 3: Model C Sentiment Priority

**Context:** Existing roadmap plans Model C for V3 (Q4 2026). New roadmap suggests Q3.

**Considerations:**
- **Pro:** Sentiment adds market awareness, may improve signals during news events
- **Con:** FinBERT fine-tuning is complex, may add only 2-3% ROC-AUC
- **Con:** Requires ASX announcement ingestion infrastructure (partially built)
- **Pro:** ASX announcements already being scraped (~500/day)

**Decision:** Maintain V3 timeline (Q4 2026). Complete user-facing features first (ETF drill-down, screener, alerts) before adding model complexity. Sentiment adds marginal accuracy but significant maintenance burden.

---

### Tradeoff 4: Mobile Strategy

**Context:** New roadmap proposes React Native app in Q4. Current frontend is Next.js.

| Option | Pros | Cons |
|--------|------|------|
| React Native | Native performance, push notifications | 3-4 month effort, separate codebase |
| PWA (Progressive Web App) | 2-3 week effort, single codebase | Limited iOS push, less "native" feel |
| Mobile-responsive only | Minimal effort | No push notifications |

**Decision:** PWA-first approach with enhanced mobile responsiveness. Defer React Native until:
1. 1000+ MAU validated
2. Push notifications become critical (post-alerts implementation)
3. Revenue justifies dual codebase maintenance

---

### Tradeoff 5: Data Provider Resilience

**Context:** Currently EODHD is the sole data provider. yfinance is used informally.

**Risk Assessment:**
- EODHD outage: 8-hour typical recovery, no fallback
- yfinance: Unofficial API, can break without notice
- Cost of fallback: Multi-provider abstraction adds complexity

**Decision:** Implement lightweight fallback for prices only (yfinance as backup). Don't over-engineer for fundamentals fallback - EODHD is reliable and contract-backed.

```python
# Recommended architecture (not full multi-provider)
class PriceProvider:
    async def get_prices(self, symbol: str) -> pd.DataFrame:
        try:
            return await self.eodhd.get_prices(symbol)
        except EODHDError:
            logger.warning(f"EODHD failed for {symbol}, falling back to yfinance")
            return await self.yfinance.get_prices(symbol)
```

---

## Part 2: Consolidated 6-Month Roadmap

### Overview: Month-by-Month Plan

```
Month 1-2: Complete Phase 3 + ETF Foundation
Month 3-4: ETF Drill-down UI + Price Alerts
Month 5-6: Stock Screener + Historical Accuracy
```

**Effort Allocation:**

| Month | ML/Backend | Frontend | Data/Infra |
|-------|-----------|----------|------------|
| 1 | 60% | 20% | 20% |
| 2 | 40% | 40% | 20% |
| 3 | 20% | 60% | 20% |
| 4 | 20% | 60% | 20% |
| 5 | 30% | 50% | 20% |
| 6 | 30% | 50% | 20% |

---

### Month 1-2: Phase 3 Completion + ETF Foundation

#### Week 1-2: Complete Model Plugin System

**Status:** Tasks 1-3 done (ModelAPlugin, Registry, EnsembleService)

**Remaining Work:**
- [ ] **Task 4: ModelBPlugin** - Extract fundamentals logic into plugin interface
- [ ] **Task 5: Ensemble API Endpoints**
  - `GET /api/signals/ensemble?as_of=YYYY-MM-DD`
  - `GET /api/signals/ensemble/{symbol}`
  - `POST /api/signals/ensemble/generate` (admin)
- [ ] **Task 6: Unit Tests** - Plugin, Registry, EnsembleService tests

```typescript
// New API endpoints
GET  /api/signals/ensemble/latest      // All current ensemble signals
GET  /api/signals/ensemble/{ticker}    // Single ticker ensemble
POST /api/signals/ensemble/generate    // Trigger signal regeneration (admin)
GET  /api/signals/compare              // Compare Model A vs B vs Ensemble
```

**Deliverables:**
1. ModelBPlugin production-ready
2. API endpoints for ensemble signals
3. 90%+ test coverage on plugin system

#### Week 3-4: ETF Holdings Data Pipeline

**Current State:** Basic `etf_data` table exists (symbol, nav, returns, flows)

**Required Schema Extension:**

```sql
-- New table: ETF holdings with temporal tracking
CREATE TABLE etf_holdings (
    id SERIAL PRIMARY KEY,
    etf_symbol VARCHAR(20) NOT NULL,
    holding_symbol VARCHAR(20) NOT NULL,
    holding_name VARCHAR(255),
    weight DECIMAL(8,6),              -- 0.0 to 1.0
    shares_held BIGINT,
    market_value DECIMAL(18,2),
    sector VARCHAR(100),
    as_of_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Referential integrity
    FOREIGN KEY (etf_symbol) REFERENCES stock_universe(ticker),
    FOREIGN KEY (holding_symbol) REFERENCES stock_universe(ticker),
    UNIQUE(etf_symbol, holding_symbol, as_of_date)
);

CREATE INDEX idx_holdings_etf_date ON etf_holdings(etf_symbol, as_of_date DESC);
CREATE INDEX idx_holdings_sector ON etf_holdings(sector);

-- View: Current holdings for any ETF
CREATE VIEW etf_current_holdings AS
SELECT DISTINCT ON (etf_symbol, holding_symbol)
    etf_symbol,
    holding_symbol,
    holding_name,
    weight,
    sector,
    as_of_date
FROM etf_holdings
ORDER BY etf_symbol, holding_symbol, as_of_date DESC;
```

**Data Source Strategy:**
1. **Primary:** EODHD ETF holdings endpoint
2. **Secondary:** BetaShares monthly CSV downloads
3. **Fallback:** iShares/Vanguard public factsheets (PDF parsing)

**New Job:**
```python
# jobs/sync_etf_holdings.py
@celery.task
@schedule(cron="0 6 * * 1")  # Weekly Monday 6 AM
def sync_etf_holdings():
    """Sync ETF holdings from EODHD and fallback sources."""
    tracked_etfs = ["IOZ.AX", "VAS.AX", "IVV.AX", "VGS.AX", "A200.AX"]

    for etf in tracked_etfs:
        try:
            holdings = eodhd.get_etf_holdings(etf)
            upsert_holdings(etf, holdings, date.today())
        except Exception as e:
            logger.error(f"Failed to sync {etf}: {e}")
            # Fallback to cached data (acceptable for weekly-updating holdings)
```

**Deliverables:**
1. `etf_holdings` table with indexes
2. `sync_etf_holdings` job running weekly
3. API endpoint: `GET /api/etfs/{symbol}/holdings`
4. 10+ ETFs with holdings data populated

---

### Month 3-4: ETF Drill-down UI + Price Alerts

#### Week 5-8: ETF Drill-down UI

**Navigation Architecture:**

```
Home → ETFs → IOZ.AX → Holdings → BHP.AX → Stock Detail
```

**New Frontend Components:**

```typescript
// frontend/features/etf/components/

// 1. ETF List View
ETFListPage.tsx                    // Grid of ETF cards
ETFCard.tsx                        // Single ETF summary card
ETFSectorAllocation.tsx            // Pie chart of sector weights

// 2. ETF Detail View
ETFDetailPage.tsx                  // Single ETF with holdings
HoldingsTable.tsx                  // Virtualized holdings table (TanStack Table)
HoldingRow.tsx                     // Single holding row with signal

// 3. Navigation
ETFBreadcrumb.tsx                  // Home > ETFs > IOZ.AX > BHP.AX
```

**Zustand Store for Navigation:**

```typescript
// frontend/features/etf/stores/etf-store.ts
interface ETFStore {
  // State
  selectedETF: string | null;
  drillDownPath: Array<{ type: 'etf' | 'stock'; symbol: string }>;
  holdings: Record<string, Holding[]>;  // Cache

  // Actions
  selectETF: (symbol: string) => void;
  drillToStock: (symbol: string) => void;
  navigateBack: () => void;
  resetNavigation: () => void;

  // Data
  fetchHoldings: (etfSymbol: string) => Promise<void>;
}
```

**API Integration:**

```typescript
// frontend/features/etf/api/etf-api.ts
export async function fetchETFList(): Promise<ETF[]>;
export async function fetchETFDetails(symbol: string): Promise<ETFDetail>;
export async function fetchETFHoldings(symbol: string): Promise<Holding[]>;
export async function fetchHoldingsWithSignals(symbol: string): Promise<HoldingWithSignal[]>;
```

**Performance Optimization:**
- React Query with 6-hour stale time (holdings update weekly)
- Prefetch on card hover
- Virtualization for 200+ holdings (TanStack Virtual)

**Deliverables:**
1. ETF list page with 10+ ETFs
2. ETF detail page with holdings table
3. Click-through to stock detail from holdings
4. Breadcrumb navigation component
5. Mobile-optimized bottom sheet for stock details
6. Test coverage: 80%+ on new components

#### Week 9-10: Price Alerts System

**Current State:** `alert_preferences` table exists, scaffolded frontend structure

**Backend Implementation:**

```python
# app/features/alerts/services/alert_service.py

class AlertService:
    async def create_alert(
        self,
        user_id: int,
        symbol: str,
        alert_type: AlertType,  # PRICE_ABOVE, PRICE_BELOW, SIGNAL_CHANGE
        threshold: float,
        notification_channel: str = "email"
    ) -> Alert:
        """Create a new price/signal alert."""

    async def check_alerts(self) -> List[TriggeredAlert]:
        """Check all active alerts against current prices/signals."""

    async def trigger_alert(self, alert: Alert, current_value: float) -> None:
        """Send notification for triggered alert."""
```

**Email Service:**

```python
# app/features/alerts/services/email_service.py

class EmailService:
    def __init__(self, smtp_config: SMTPConfig):
        self.smtp = smtp_config

    async def send_alert_email(
        self,
        to_email: str,
        alert: TriggeredAlert
    ) -> bool:
        """Send alert notification email."""
        template = self.templates.get(alert.alert_type)
        html = template.render(alert=alert)
        return await self.smtp.send(to_email, f"Alert: {alert.symbol}", html)
```

**Scheduled Job:**

```python
# jobs/check_alerts_job.py
@celery.task
@schedule(cron="*/15 * * * *")  # Every 15 minutes during market hours
def check_price_alerts():
    """Check and trigger price alerts."""
    service = AlertService()
    triggered = service.check_alerts()

    for alert in triggered:
        email_service.send_alert_email(alert.user.email, alert)
        alert.mark_triggered()
```

**Frontend:**

```typescript
// frontend/features/alerts/components/
AlertsPage.tsx           // Manage all alerts
CreateAlertModal.tsx     // Create new alert form
AlertCard.tsx            // Single alert display
AlertHistoryTable.tsx    // Past triggered alerts
```

**Deliverables:**
1. Alert CRUD API endpoints
2. Email notification service (SMTP integration)
3. 15-minute alert checking job
4. Alert management UI
5. "Set Alert" button on stock detail page
6. Alert history view

---

### Month 5-6: Stock Screener + Historical Accuracy

#### Week 11-14: Stock Screener with AI Filters

**Screener Architecture:**

```
User defines criteria → API applies filters → Returns ranked stocks with signals
```

**Filter Types:**

| Category | Filters |
|----------|---------|
| AI Signals | Signal type (STRONG_BUY only), Confidence >= X% |
| Fundamentals | P/E < X, Div Yield > Y%, ROE > Z% |
| Technical | RSI range, Above/Below SMA |
| Sector | Include/exclude sectors |
| Liquidity | ADV >= $X million |

**API Design:**

```python
# app/features/screener/routes.py

@router.post("/api/screener/search")
async def search_stocks(
    filters: ScreenerFilters,
    sort_by: str = "confidence",
    sort_order: str = "desc",
    limit: int = 50,
    offset: int = 0
) -> ScreenerResults:
    """
    Search stocks matching filter criteria.

    Filters:
    - signal_types: List[str] = ["STRONG_BUY", "BUY"]
    - min_confidence: float = 0.6
    - max_pe: float = 20.0
    - min_dividend_yield: float = 0.03
    - sectors: List[str] = ["Financials", "Materials"]
    - min_adv: float = 5_000_000
    """
```

**Saved Screens:**

```sql
CREATE TABLE saved_screens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES user_accounts(id),
    name VARCHAR(100) NOT NULL,
    filters JSONB NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Frontend:**

```typescript
// frontend/features/screener/components/
ScreenerPage.tsx          // Main screener view
FilterPanel.tsx           // Filter controls
FilterGroup.tsx           // Collapsible filter category
RangeSlider.tsx          // Numeric range filter
MultiSelect.tsx          // Sector/signal type selection
ScreenerResults.tsx      // Results table with signals
SavedScreensList.tsx     // User's saved screens
```

**Deliverables:**
1. Screener API with complex filtering
2. Saved screens CRUD
3. Responsive filter panel
4. Results with inline signal badges
5. Export to CSV/watchlist
6. 3-5 pre-built example screens

#### Week 15-16: Historical Accuracy Dashboard

**Purpose:** Build trust through transparent track record

**Data Model:**

```sql
-- Already exists: model_a_ml_signals, model_b_ml_signals, ensemble_signals
-- Need: Historical outcomes to compare against

CREATE TABLE signal_outcomes (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    signal_date DATE NOT NULL,
    signal_type VARCHAR(20) NOT NULL,
    confidence DECIMAL(5,4),
    model_id VARCHAR(50) NOT NULL,

    -- Outcomes (populated after 21-day horizon)
    actual_return_21d DECIMAL(8,4),
    prediction_correct BOOLEAN,
    evaluated_at TIMESTAMPTZ,

    UNIQUE(symbol, signal_date, model_id)
);

-- Materialized view for aggregated accuracy
CREATE MATERIALIZED VIEW model_accuracy_summary AS
SELECT
    model_id,
    signal_type,
    DATE_TRUNC('month', signal_date) as month,
    COUNT(*) as total_signals,
    SUM(CASE WHEN prediction_correct THEN 1 ELSE 0 END) as correct,
    AVG(CASE WHEN prediction_correct THEN 1.0 ELSE 0.0 END) as accuracy,
    AVG(actual_return_21d) as avg_return
FROM signal_outcomes
WHERE evaluated_at IS NOT NULL
GROUP BY model_id, signal_type, DATE_TRUNC('month', signal_date);
```

**Accuracy Calculation Job:**

```python
# jobs/calculate_signal_outcomes.py
@celery.task
@schedule(cron="0 12 * * *")  # Daily at noon
def evaluate_historical_signals():
    """
    Evaluate signals from 21+ days ago against actual returns.
    """
    cutoff_date = date.today() - timedelta(days=21)

    # Get signals needing evaluation
    pending = get_unevaluated_signals(before=cutoff_date)

    for signal in pending:
        actual_return = get_actual_return(
            signal.symbol,
            signal.signal_date,
            horizon=21
        )

        # STRONG_BUY/BUY correct if return > 0
        # STRONG_SELL/SELL correct if return < 0
        # HOLD correct if abs(return) < 5%
        is_correct = evaluate_prediction(signal, actual_return)

        update_outcome(signal.id, actual_return, is_correct)

    # Refresh materialized view
    refresh_accuracy_summary()
```

**Frontend:**

```typescript
// frontend/features/accuracy/components/
AccuracyDashboard.tsx     // Main accuracy view
AccuracyChart.tsx         // Line chart of accuracy over time
AccuracyBySignal.tsx      // Bar chart by signal type
ModelComparison.tsx       // Compare Model A vs B vs Ensemble
FilterControls.tsx        // Date range, model, sector filters
```

**Deliverables:**
1. `signal_outcomes` table with evaluation logic
2. Daily outcome calculation job
3. Accuracy dashboard with charts
4. Filter by time period, model, signal type, sector
5. Comparison vs. ASX 200 benchmark
6. Monthly performance report export

---

## Part 3: Post-MVP Roadmap (Months 7-12)

### Month 7-9: Model C Sentiment + Mobile Polish

#### Model C: Sentiment Integration

**Existing Infrastructure:**
- ASX announcement scraping (500/day)
- `news_sentiment` table
- Sentiment ingestion job

**New Work:**
1. Fine-tune FinBERT on ASX announcements
2. Implement ModelCPlugin following plugin interface
3. Integrate into ensemble (40% A + 30% B + 30% C)
4. Add sentiment override for negative announcements

**Expected Improvement:** 2-3% ROC-AUC (conservative estimate)

#### Mobile Polish

1. PWA configuration (manifest.json, service worker)
2. Touch-optimized tap targets (48px minimum)
3. Bottom sheet for stock details on mobile
4. Swipe gestures for navigation
5. Offline-first with cached signals

### Month 10-12: Premium Features + Launch

#### Stock Screener V2
- Natural language query: "High dividend blue chips"
- AI-powered screen suggestions based on user watchlist

#### Portfolio Analytics V2
- Performance attribution by sector
- Risk-adjusted returns visualization
- Tax-loss harvesting suggestions (preview)

#### Premium Tier Launch

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | 1 watchlist, 5 signals/day, basic ETF data |
| Pro | $19/mo | Unlimited signals, 5 watchlists, alerts, screener |
| Premium | $49/mo | Portfolio analytics, API access, priority signals |

---

## Part 4: Technical Architecture Decisions

### 1. State Management Strategy

**Current:** Mixed (React hooks + Zustand for portfolio)

**Recommended:**
- **Server state:** React Query (signals, ETF data, alerts)
- **Client state:** Zustand (navigation, UI state)
- **Form state:** React Hook Form

**Caching Strategy:**
```typescript
// React Query configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5 minutes default
      gcTime: 30 * 60 * 1000,    // 30 minutes
    },
  },
});

// Feature-specific overrides
useQuery({
  queryKey: ['etf-holdings', symbol],
  staleTime: 6 * 60 * 60 * 1000,  // 6 hours for holdings
});

useQuery({
  queryKey: ['live-signals'],
  staleTime: 60 * 1000,  // 1 minute for signals
  refetchInterval: 60 * 1000,  // Poll every minute
});
```

### 2. Database Optimization

**Existing Indexes:** 15+ composite and partial indexes (good)

**Additional Recommendations:**

```sql
-- For screener queries
CREATE INDEX idx_ensemble_confidence
ON ensemble_signals(confidence DESC)
WHERE signal IN ('STRONG_BUY', 'BUY');

-- For accuracy calculations
CREATE INDEX idx_outcomes_pending
ON signal_outcomes(signal_date)
WHERE evaluated_at IS NULL;

-- For ETF holdings lookups
CREATE INDEX idx_holdings_weight
ON etf_holdings(etf_symbol, weight DESC);
```

### 3. Error Handling Pattern

```typescript
// Consistent error handling across features
import { toast } from '@/components/Toast';

export async function fetchWithErrorHandling<T>(
  fetcher: () => Promise<T>,
  errorMessage: string
): Promise<T | null> {
  try {
    return await fetcher();
  } catch (error) {
    console.error(errorMessage, error);
    toast.error(errorMessage);
    return null;
  }
}
```

### 4. Testing Strategy

**Unit Tests:** Jest + React Testing Library (current)

**Integration Tests (to add):**
- API contract tests (backend ↔ frontend)
- Database integration tests
- Signal generation pipeline tests

**E2E Tests (post-MVP):**
- Playwright for critical user flows
- ETF drill-down navigation
- Alert creation and triggering
- Screener search and save

---

## Part 5: Risk Mitigation

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| EODHD API outage | Low | High | yfinance fallback for prices |
| Model accuracy degradation | Medium | High | Drift monitoring + retraining alerts |
| ETF holdings data gaps | Medium | Medium | Multiple source fallback |
| Performance at scale | Low | Medium | Database indexes, caching, pagination |

### Product Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Low user adoption | Medium | High | Focus on unique differentiators |
| Feature creep | High | Medium | Strict MoSCoW discipline |
| Competitor copying | Low | Low | Execution speed, trust building |

### Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Solo developer burnout | Medium | High | Strict scope, automation |
| ASX data licensing | Low | High | Use only API-permitted sources |
| Regulatory (AFSL) | Medium | Medium | Advisory-only, no execution |

---

## Part 6: Success Metrics

### Month 6 MVP Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Weekly Active Users | 500+ | Analytics |
| Activation Rate | 40%+ | Signups → watchlist creation |
| AI Signal Accuracy | 68%+ | Historical evaluation |
| Time to First Insight | < 30 seconds | UX measurement |
| ETF Drill-down Usage | 20%+ of users | Feature analytics |

### Month 12 Growth Targets

| Metric | Target |
|--------|--------|
| Monthly Active Users | 5,000+ |
| NPS Score | 30+ |
| Paid Conversion | 5%+ |
| Platform Uptime | 99.9% |

---

## Part 7: Implementation Checklist

### Month 1-2 Deliverables

- [ ] Complete Phase 3 Model Plugin System
  - [ ] ModelBPlugin implementation
  - [ ] Ensemble API endpoints
  - [ ] Unit tests (90%+ coverage)
- [ ] ETF Holdings Infrastructure
  - [ ] `etf_holdings` table + indexes
  - [ ] `sync_etf_holdings` job
  - [ ] API endpoint for holdings
  - [ ] 10+ ETFs with data

### Month 3-4 Deliverables

- [ ] ETF Drill-down UI
  - [ ] ETF list page
  - [ ] ETF detail with holdings
  - [ ] Stock drill-through navigation
  - [ ] Breadcrumb component
  - [ ] Mobile bottom sheet
  - [ ] Tests (80%+ coverage)
- [ ] Price Alerts System
  - [ ] Alert CRUD endpoints
  - [ ] Email service integration
  - [ ] Alert checking job (15-min)
  - [ ] Alert management UI
  - [ ] Stock detail "Set Alert" button

### Month 5-6 Deliverables

- [ ] Stock Screener
  - [ ] Screener API with filters
  - [ ] Saved screens CRUD
  - [ ] Filter panel UI
  - [ ] Results with signals
  - [ ] Export functionality
- [ ] Historical Accuracy Dashboard
  - [ ] `signal_outcomes` table
  - [ ] Outcome evaluation job
  - [ ] Accuracy charts
  - [ ] Model comparison view
  - [ ] Benchmark comparison

---

## Conclusion

This consolidated roadmap recognizes that **ASX Portfolio OS is significantly more advanced than the new roadmap assumed**. The platform already has:

1. **Two production-ready ML models** with 68% and 62% accuracy
2. **Complete ensemble signal system** with conflict detection
3. **Full dashboard infrastructure** with signals, watchlists, and portfolios
4. **Modular architecture** with comprehensive test coverage

The optimized 6-month plan focuses on:

1. **ETF drill-down** - The unique differentiator missing from current feature set
2. **Price alerts** - Quick win with scaffolding already in place
3. **Stock screener** - High user value, leverages existing signals
4. **Accuracy dashboard** - Trust building through transparency

By avoiding duplication and focusing on genuine gaps, this plan maximizes value delivery while respecting development capacity constraints.

---

**Document Owner:** Product Team
**Review Cycle:** Monthly
**Next Review:** March 1, 2026
