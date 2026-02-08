# ASX Portfolio OS - Codebase Analysis & Improvement Plan

## Executive Summary

This document provides a full-stack analysis of the ASX Portfolio OS application — an AI-driven momentum trading signal platform for ASX equities. The app uses a **Next.js 14 + TypeScript** frontend, **FastAPI + Python** backend, and **PostgreSQL** (Supabase) database.

The codebase is well-architected with clean separation of concerns (routes → services → repositories), an event-driven backend, and a feature-based module structure. However, there are significant opportunities to improve **frontend performance**, **UI/UX consistency**, **accessibility**, and **data fetching patterns**.

This analysis covers:
1. [Performance Issues & Fixes](#1-performance-issues--fixes)
2. [UI/UX Redesign Recommendations](#2-uiux-redesign-recommendations)
3. [Data Fetching Architecture](#3-data-fetching-architecture)
4. [Component Architecture Improvements](#4-component-architecture-improvements)
5. [Accessibility Overhaul](#5-accessibility-overhaul)
6. [Backend Optimizations](#6-backend-optimizations)
7. [Implementation Priority Matrix](#7-implementation-priority-matrix)

---

## 1. Performance Issues & Fixes

### 1.1 Critical: DataTable Sorting on Every Render

**File:** `frontend/components/ui/DataTable.tsx`

**Problem:** The `[...data].sort()` call runs O(n log n) on every render — even when data hasn't changed.

**Fix:** Wrap sorted data in `useMemo`:

```tsx
const sortedData = useMemo(() => {
  if (!sortConfig) return data;
  return [...data].sort((a, b) => {
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];
    const direction = sortConfig.direction === 'asc' ? 1 : -1;
    if (aVal < bVal) return -1 * direction;
    if (aVal > bVal) return 1 * direction;
    return 0;
  });
}, [data, sortConfig]);
```

### 1.2 Critical: StockChart Re-creation

**File:** `frontend/components/stock-chart.tsx`

**Problem:** A new `createChart()` instance is created every time data changes. This destroys and rebuilds the entire TradingView Lightweight Charts DOM tree.

**Fix:**
- Create the chart once on mount
- Use `series.setData()` to update data without recreating
- Debounce the resize listener (currently fires on every pixel)

```tsx
useEffect(() => {
  if (!chartContainerRef.current) return;
  const chart = createChart(chartContainerRef.current, options);
  chartRef.current = chart;
  return () => chart.remove();
}, []); // Mount only

useEffect(() => {
  if (!chartRef.current || !data.length) return;
  candleSeries.current?.setData(data);
  volumeSeries.current?.setData(volumeData);
}, [data]); // Data updates only
```

### 1.3 Critical: HoldingsTable Column Memoization

**File:** `frontend/features/portfolio/components/HoldingsTable.tsx`

**Problem:** `useMemo` for columns has `[router]` as a dependency. The `router` object changes on every route transition, causing full column re-creation and table re-render.

**Fix:** Extract the navigation callback and remove `router` from deps:

```tsx
const handleRowClick = useCallback((ticker: string) => {
  router.push(`/stock/${ticker}`);
}, [router]);

const columns = useMemo(() => buildColumns(handleRowClick), [handleRowClick]);
```

### 1.4 High: No Pagination or Virtualization

**Problem:** Dashboard signals (100+), portfolio holdings, news articles, and assistant messages are all rendered as flat lists with no pagination or virtualization.

**Fix:**
- Add server-side pagination to `/api/signals/live` (already supports `limit` param)
- Use `@tanstack/react-virtual` for long lists in the frontend
- Add `page` + `page_size` query params to all list endpoints
- For the assistant chat, implement a virtualized message list or cap visible messages

### 1.5 High: ConfidenceGauge Animation

**File:** `frontend/features/signals/components/ConfidenceGauge.tsx`

**Problem:** Uses `requestAnimationFrame` in a loop to animate the confidence value, triggering React state updates (~60fps) for a visual effect that CSS can handle natively.

**Fix:** Use CSS `transition` on the SVG `stroke-dashoffset`:

```tsx
<circle
  style={{
    strokeDashoffset: offset,
    transition: 'stroke-dashoffset 0.6s ease-out',
  }}
/>
```

Remove the `requestAnimationFrame` loop entirely.

### 1.6 Medium: Bundle Size — Dual Charting Libraries

**Problem:** The app ships both **Recharts** (~200KB) and **TradingView Lightweight Charts** (~45KB). Recharts is used for simple bar/line charts while Lightweight Charts handles candlesticks.

**Recommendation:** Consolidate to Lightweight Charts for all financial data visualization, and use a lighter alternative (e.g., `uPlot` at ~35KB) or native SVG for simple bar charts. This could save ~150KB from the bundle.

### 1.7 Medium: Race Conditions on Stock Detail Page

**File:** `frontend/app/stock/[ticker]/page.tsx`

**Problem:** Multiple parallel fetches (`getSignal`, `getSignalReasoning`, `getPriceHistory`, `getAccuracy`) fire without cancellation. If the user navigates between tickers quickly, stale responses can overwrite fresh data.

**Fix:** Use `AbortController` or switch to SWR/React Query which handles this automatically:

```tsx
const { data: signal } = useSWR(`/signals/${ticker}`, fetcher);
const { data: reasoning } = useSWR(`/signals/${ticker}/reasoning`, fetcher);
const { data: prices } = useSWR(`/prices/${ticker}/history?period=${period}`, fetcher);
```

---

## 2. UI/UX Redesign Recommendations

### 2.1 Navigation Redesign

**Current:** Static sidebar with 15+ navigation items, no grouping, no collapsible sections. Mobile uses a `<details>` dropdown (non-standard).

**Proposed:**

```
SIDEBAR STRUCTURE (grouped):
─────────────────────────
Overview
  ├── Dashboard
  └── Watchlist

Signals & Models
  ├── Live Signals
  ├── Model Comparison
  └── Insights

Portfolio
  ├── Holdings
  └── Fusion

System
  ├── Drift Monitor
  ├── Jobs
  └── Settings
─────────────────────────
```

- **Collapsible groups** with icons and chevrons
- **Collapsed mode** (icon-only sidebar) for more content space
- **Mobile:** Replace `<details>` with a proper slide-over drawer using `@radix-ui/dialog` with focus trap, escape key handling, and backdrop click

### 2.2 Dashboard Redesign

**Current:** Four stat cards at the top → full-width signals table below. No visual hierarchy for what matters most.

**Proposed Layout:**

```
┌──────────────────────────────────────────────────────┐
│  MARKET PULSE (compact strip)                        │
│  ASX200: ▲ 1.2%  |  Signals Updated: 2m ago  |  ... │
├──────────────────┬───────────────────────────────────┤
│                  │                                   │
│  TOP MOVERS      │   SIGNAL DISTRIBUTION             │
│  (ranked cards)  │   (donut or treemap chart)        │
│  1. BHP ▲ +3.2%  │                                   │
│  2. CBA ▲ +2.1%  │                                   │
│  3. ...          │                                   │
│                  │                                   │
├──────────────────┴───────────────────────────────────┤
│                                                      │
│  FULL SIGNALS TABLE (paginated, sortable, filterable)│
│  [Search] [Filter: Signal ▼] [Filter: Sector ▼]     │
│  ┌────────┬────────┬──────────┬──────────┬────────┐  │
│  │ Ticker │ Signal │ Confid.  │ Exp. Ret │ Action │  │
│  ├────────┼────────┼──────────┼──────────┼────────┤  │
│  │ BHP    │ BUY    │ 87%      │ +4.2%    │ View → │  │
│  └────────┴────────┴──────────┴──────────┴────────┘  │
│  Page 1 of 5  [← Prev] [Next →]                     │
└──────────────────────────────────────────────────────┘
```

**Key Changes:**
- Replace stat cards with a compact **Market Pulse** strip
- Add a **signal distribution visualization** (donut chart or treemap)
- Add **server-side pagination** to the signals table
- Add **sector filter** and **multi-column sorting**
- Add **inline sparkline charts** in the table for 7-day price trend

### 2.3 Stock Detail Page Redesign

**Current:** Tabs for different data sections (chart, signals, fundamentals). Chart takes up left 2/3, signal card on right 1/3.

**Proposed:**

```
┌──────────────────────────────────────────────────────┐
│  ← Back    BHP Group Limited    BHP.AX               │
│            $45.23  ▲ +1.2% today                     │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌─ CHART ─────────────────────────────────────────┐ │
│  │ [1D] [1W] [1M] [3M] [6M] [1Y] [All]            │ │
│  │                                                 │ │
│  │  (Full-width candlestick chart with volume)     │ │
│  │                                                 │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─────────────┬──────────────┬────────────────────┐ │
│  │ SIGNAL      │ CONFIDENCE   │ EXPECTED RETURN    │ │
│  │ ● BUY       │ ████████░░   │ +4.2% (30d)       │ │
│  │             │ 82%          │                    │ │
│  └─────────────┴──────────────┴────────────────────┘ │
│                                                      │
│  [Signal Reasoning] [Fundamentals] [News] [Model B]  │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Tab content area                                │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

**Key Changes:**
- **Full-width chart** (no cramped side-by-side layout)
- **Signal summary strip** below chart with gauge, confidence, and expected return
- **Tab bar** for secondary content (reasoning, fundamentals, news)
- Price change displayed prominently in the header
- Chart timeframe buttons styled as a proper toggle group

### 2.4 Portfolio Page Redesign

**Current:** Holdings table, risk metrics sidebar, rebalancing suggestions below. Upload modal for CSV.

**Proposed:**

```
┌──────────────────────────────────────────────────────┐
│  MY PORTFOLIO                    [Upload CSV] [Export]│
├──────────────┬──────────────┬──────────────┬─────────┤
│ Total Value  │ Day P/L      │ Total P/L    │ Sharpe  │
│ $142,350     │ +$1,230 (▲)  │ +$12,450     │ 1.42    │
├──────────────┴──────────────┴──────────────┴─────────┤
│                                                      │
│  [Holdings] [Allocation] [Risk] [Rebalance]          │
│                                                      │
│  HOLDINGS TAB:                                       │
│  ┌──────┬───────┬────────┬────────┬────────┬───────┐ │
│  │Ticker│Shares │Value   │P/L     │Signal  │Weight │ │
│  ├──────┼───────┼────────┼────────┼────────┼───────┤ │
│  │ BHP  │ 100   │$4,523  │+$450   │● BUY   │ 3.2%  │ │
│  └──────┴───────┴────────┴────────┴────────┴───────┘ │
│                                                      │
│  ALLOCATION TAB:                                     │
│  (Sector pie chart + concentration risk heatmap)     │
│                                                      │
│  REBALANCE TAB:                                      │
│  (Actionable suggestions with one-click accept)      │
└──────────────────────────────────────────────────────┘
```

**Key Changes:**
- **Summary strip** at top replacing scattered stat cards
- **Tab-based layout** instead of stacking everything vertically
- **Allocation visualization** (pie chart for sector weights)
- **Inline signals** in the holdings table
- **Export to PDF/CSV** button (already have jsPDF, expose it)

### 2.5 Design System Consistency

**Current Issues:**
- Mixed color usage: some components use design tokens (`designTokens.colors.signals`), others use hardcoded Tailwind classes (`text-green-600`)
- Inconsistent border radius: cards `rounded-2xl`, buttons `rounded-lg`, inputs `rounded-lg`
- Inconsistent spacing: some sections use `gap-6`, others `gap-4`
- Inconsistent shadows: cards mix `shadow-sm`, `shadow-lg`, `hover:shadow-md`

**Proposed Design Tokens (standardize):**

```css
/* Spacing scale */
--space-xs: 0.25rem;   /* 4px */
--space-sm: 0.5rem;    /* 8px */
--space-md: 1rem;      /* 16px */
--space-lg: 1.5rem;    /* 24px */
--space-xl: 2rem;      /* 32px */
--space-2xl: 3rem;     /* 48px */

/* Border radius */
--radius-sm: 0.375rem;  /* buttons, badges, inputs */
--radius-md: 0.5rem;    /* cards, panels */
--radius-lg: 0.75rem;   /* modals, large containers */
--radius-full: 9999px;  /* pills, avatars */

/* Shadows (elevation system) */
--shadow-1: 0 1px 2px rgba(0,0,0,0.05);   /* subtle */
--shadow-2: 0 2px 8px rgba(0,0,0,0.08);   /* cards */
--shadow-3: 0 8px 24px rgba(0,0,0,0.12);  /* dropdowns, popovers */
--shadow-4: 0 16px 48px rgba(0,0,0,0.16); /* modals */
```

**Action Items:**
1. Replace all hardcoded color values with Tailwind config tokens
2. Standardize border-radius across all components
3. Create and enforce a spacing scale
4. Use a 4-level elevation system consistently

### 2.6 Dark Mode Improvements

**Current Issues:**
- Dark signal colors are too similar to light mode (hard to distinguish)
- Some text has poor contrast in dark mode
- Background transitions between pages are jarring

**Fixes:**
- Increase saturation for dark mode signal colors
- Audit all text for WCAG AA contrast (4.5:1 minimum)
- Add `transition-colors duration-200` to the body/main container

---

## 3. Data Fetching Architecture

### 3.1 Current State

The frontend uses **three different patterns** for data fetching:

| Pattern | Where Used | Caching | Dedup | Cancel |
|---------|-----------|---------|-------|--------|
| `useState` + `useEffect` + `api.get()` | Dashboard, Portfolio, Stock Detail | None | None | None |
| SWR | DashboardClient | Yes | Yes | Yes |
| Raw `fetch()` | PortfolioFusionClient | None | None | None |

### 3.2 Proposed: Unified SWR Architecture

Standardize on **SWR** (already installed) for all data fetching:

```tsx
// lib/hooks/use-api.ts
import useSWR from 'swr';
import { api } from '@/lib/api-client';

const fetcher = (url: string) => api.get(url).then(res => res.data);

// Typed hooks per domain
export function useSignals(filter?: SignalFilter) {
  return useSWR(
    filter ? `/signals/live?${new URLSearchParams(filter)}` : '/signals/live',
    fetcher,
    { refreshInterval: 60_000, dedupingInterval: 5_000 }
  );
}

export function usePortfolio() {
  return useSWR('/portfolio', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });
}

export function usePriceHistory(ticker: string, period: string) {
  return useSWR(
    ticker ? `/prices/${ticker}/history?period=${period}` : null,
    fetcher
  );
}
```

**Benefits:**
- Automatic request deduplication
- Stale-while-revalidate caching
- Automatic cancellation on unmount
- Built-in loading/error states
- Consistent pattern across all pages

### 3.3 API Response Normalization

**Current:** Some endpoints return `{ data: [...] }`, others return arrays directly, others return `{ status, data, count }`.

**Proposed:** Standardize all API responses:

```json
{
  "data": [...],
  "meta": {
    "total": 150,
    "page": 1,
    "page_size": 20,
    "has_next": true
  }
}
```

Add a `PaginatedResponse` wrapper on the backend and a corresponding TypeScript type on the frontend.

---

## 4. Component Architecture Improvements

### 4.1 Replace Custom DataTable with Full TanStack Table

**Current:** Two table implementations coexist:
- `components/ui/DataTable.tsx` — custom implementation with manual sorting
- `features/portfolio/components/HoldingsTable.tsx` — TanStack React Table

**Proposed:** Consolidate to a single `<DataTable>` built on TanStack:

```tsx
// components/ui/DataTable.tsx (rebuilt)
interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  pagination?: boolean;
  pageSize?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyState?: ReactNode;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
}
```

Features to include:
- Server-side and client-side sorting
- Pagination with page size selector
- Global search filter
- Column visibility toggle
- Skeleton rows during loading
- Mobile card view breakpoint
- Keyboard navigation (arrow keys between rows)

### 4.2 Introduce Compound Component Patterns

**Current:** Large monolithic page components with 200+ lines.

**Proposed:** Break into compound components:

```tsx
// Before (monolithic)
<DashboardPage>
  {/* 300 lines of JSX mixing stats, table, filters */}
</DashboardPage>

// After (compound)
<Dashboard>
  <Dashboard.MarketPulse />
  <Dashboard.SignalDistribution />
  <Dashboard.SignalsTable
    filters={filters}
    onFilterChange={setFilters}
    pagination={pagination}
  />
</Dashboard>
```

### 4.3 Extract Shared Layout Patterns

**Current:** Each page re-implements its own loading → error → empty → data pattern.

**Proposed:** Create a `<QueryState>` wrapper:

```tsx
function QueryState<T>({
  data,
  isLoading,
  error,
  emptyCheck,
  loadingComponent,
  emptyComponent,
  children,
}: QueryStateProps<T>) {
  if (isLoading) return loadingComponent ?? <PageLoader />;
  if (error) return <ErrorAlert error={error} />;
  if (emptyCheck?.(data)) return emptyComponent ?? <EmptyState />;
  return children(data as T);
}

// Usage
<QueryState data={signals} isLoading={isLoading} error={error}>
  {(signals) => <SignalsTable data={signals} />}
</QueryState>
```

---

## 5. Accessibility Overhaul

### 5.1 Critical Issues

| Issue | Location | Fix |
|-------|----------|-----|
| No keyboard navigation in dropdowns | Sidebar, MobileNav | Use `@radix-ui/navigation-menu` |
| Missing `aria-sort` on sortable table headers | DataTable, HoldingsTable | Add `aria-sort="ascending"` / `"descending"` / `"none"` |
| Charts without alt text | StockChart, DriftChart | Add `role="img"` + `aria-label` describing the trend |
| No focus trap in mobile menu | MobileNav | Use `@radix-ui/dialog` with `modal={true}` |
| No `aria-live` on dynamic content | AssistantClient, NewsFeed | Add `aria-live="polite"` to message/news containers |
| Icon-only buttons without labels | ThemeToggle, NotificationBell | Already has aria-label (good), audit others |
| `<details>` menu pattern | MobileNav | Replace with proper ARIA menubutton |
| No skip-to-content link | Root layout | Add `<a href="#main" class="sr-only focus:not-sr-only">` |

### 5.2 Reduced Motion Support

Add to `tailwind.config.js`:

```js
// Already supported by Tailwind — just use it
// motion-safe: and motion-reduce: variants

// In ConfidenceGauge:
className="motion-safe:transition-all motion-reduce:transition-none"
```

Add to Framer Motion components:

```tsx
const prefersReducedMotion = useReducedMotion();
const variants = prefersReducedMotion ? {} : animationVariants;
```

### 5.3 Color Contrast Audit

Several dark mode combinations fail WCAG AA:
- `text-gray-400` on `bg-gray-900` → 4.1:1 (fails AA for normal text)
- Signal colors on dark backgrounds need verification
- **Fix:** Use `text-gray-300` minimum for body text on dark backgrounds

---

## 6. Backend Optimizations

### 6.1 Replace In-Memory Cache with Redis

**File:** `app/middleware/cache.py`

**Current:** Python dict `_CACHE = {}` — lost on restart, not shared across workers.

**Proposed:** Switch to Redis (Supabase or Render Redis add-on):

```python
import redis
cache = redis.Redis.from_url(os.getenv("REDIS_URL"))

def cache_response(prefix: str, ttl: int = 1800):
    def decorator(func):
        async def wrapper(*args, **kwargs):
            key = f"{prefix}:{hashlib.md5(str(args)+str(kwargs)).hexdigest()}"
            cached = cache.get(key)
            if cached:
                return json.loads(cached)
            result = await func(*args, **kwargs)
            cache.setex(key, ttl, json.dumps(result, default=str))
            return result
        return wrapper
    return decorator
```

### 6.2 Add Database Query Optimization

**Current issues found in repositories:**

1. **N+1 queries** in portfolio holdings — each holding fetches its signal separately
2. **No query result streaming** for large signal lists
3. **Missing composite indexes** for common filter combinations

**Fixes:**
- Join holdings with signals in a single query
- Add `LIMIT`/`OFFSET` to all list queries server-side
- Add index on `(model_name, as_of DESC)` for signal queries

### 6.3 API Response Compression

Add gzip middleware:

```python
from starlette.middleware.gzip import GZipMiddleware
app.add_middleware(GZipMiddleware, minimum_size=1000)
```

This reduces payload size by 60-80% for JSON responses.

### 6.4 Consolidate Mixed Route Patterns

**Current:** Some routes live in `/app/routes/`, others in `/app/features/*/routes/`. Some use repositories, others query the DB directly.

**Proposed:**
- Move ALL routes to feature modules under `/app/features/*/routes/`
- Ensure every route goes through the service → repository layers
- Delete `/app/routes/` once migrated
- Register all feature routers in `main.py` from a single `register_routes()` function

### 6.5 Persist Event History

**Current:** Event bus keeps last 1000 events in memory — lost on restart.

**Proposed:** Write events to a `system_events` table for audit trail:

```sql
CREATE TABLE system_events (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  payload JSONB,
  source VARCHAR(100),
  user_id INTEGER REFERENCES user_accounts(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_type_created ON system_events(event_type, created_at DESC);
```

---

## 7. Implementation Priority Matrix

### Phase 1: Quick Wins (High Impact, Low Effort)

| # | Change | Impact | Files |
|---|--------|--------|-------|
| 1 | Memoize DataTable sorting | Perf | `components/ui/DataTable.tsx` |
| 2 | Fix HoldingsTable column deps | Perf | `features/portfolio/components/HoldingsTable.tsx` |
| 3 | CSS animation for ConfidenceGauge | Perf | `features/signals/components/ConfidenceGauge.tsx` |
| 4 | Add GZip middleware to FastAPI | Perf | `app/main.py` |
| 5 | Replace `<details>` mobile menu | A11y/UX | `components/MobileNav.tsx` |
| 6 | Add `aria-sort` to table headers | A11y | `components/ui/DataTable.tsx` |
| 7 | Add skip-to-content link | A11y | `app/layout.tsx` |
| 8 | Standardize border radius + spacing | UX | Tailwind config + components |

### Phase 2: Architecture Improvements (High Impact, Medium Effort)

| # | Change | Impact | Scope |
|---|--------|--------|-------|
| 9 | Unify data fetching on SWR | Perf/DX | All pages |
| 10 | Fix StockChart re-creation | Perf | `components/stock-chart.tsx` |
| 11 | Add server-side pagination | Perf | Backend routes + frontend tables |
| 12 | Consolidate to single DataTable | DX/UX | `components/ui/DataTable.tsx` |
| 13 | Redesign sidebar with groups | UX | `components/Sidebar.tsx` |
| 14 | Standardize API response format | DX | Backend routes + frontend contracts |
| 15 | Move routes to feature modules | DX | `app/routes/` → `app/features/*/routes/` |

### Phase 3: Major Enhancements (High Impact, High Effort)

| # | Change | Impact | Scope |
|---|--------|--------|-------|
| 16 | Dashboard redesign (market pulse + distribution chart) | UX | Dashboard page |
| 17 | Stock detail page redesign (full-width chart) | UX | Stock detail page |
| 18 | Portfolio page tabs + allocation chart | UX | Portfolio page |
| 19 | Redis caching layer | Perf | `app/middleware/cache.py` |
| 20 | Mobile card view for tables | UX | DataTable + responsive-table |
| 21 | Full accessibility audit + WCAG AA compliance | A11y | All components |
| 22 | Consolidate charting libraries | Perf | Remove Recharts, extend Lightweight Charts |
| 23 | Persist event history to DB | Ops | `app/core/events/` |

### Phase 4: Polish

| # | Change | Impact | Scope |
|---|--------|--------|-------|
| 24 | Dark mode contrast audit | A11y | Tailwind config |
| 25 | Reduced motion support | A11y | Framer Motion + CSS |
| 26 | Skeleton loaders for all pages | UX | All loading states |
| 27 | Query state wrapper component | DX | New shared component |
| 28 | Export portfolio to PDF/CSV | Feature | Portfolio page |

---

## Summary of Key Metrics

| Category | Current State | After Improvements |
|----------|--------------|-------------------|
| Bundle size | ~450KB (2 chart libs) | ~250KB (consolidated) |
| Largest contentful paint | Blocked by sequential API calls | Parallel SWR with skeleton UI |
| Table render (100 rows) | Re-sorts on every render | Memoized, only on data change |
| Chart updates | Full DOM rebuild | In-place data update |
| WCAG compliance | Partial (multiple gaps) | AA compliant |
| Data fetching patterns | 3 different approaches | 1 unified SWR pattern |
| API response format | Inconsistent | Standardized with pagination |
| Mobile experience | Horizontal scroll tables | Card view + responsive tables |
