# Modular Architecture Structure

## Overview

The ASX Portfolio OS frontend follows a feature-based modular architecture pattern. This document provides a visual representation of the structure and explains the organizational principles.

## Directory Structure

```
frontend/
├── app/                              # Next.js App Router pages
│   ├── api/                         # API route handlers
│   │   ├── signals/                # Signal endpoints
│   │   ├── portfolio/              # Portfolio endpoints
│   │   ├── model/                  # Model endpoints
│   │   └── dashboard/              # Dashboard endpoints
│   ├── app/                        # Application pages
│   │   ├── dashboard/             # Dashboard page
│   │   ├── portfolio/             # Portfolio page
│   │   ├── models/                # Models page
│   │   ├── watchlist/             # Watchlist page
│   │   ├── alerts/                # Alerts page
│   │   └── settings/              # Settings page
│   └── stock/[ticker]/            # Dynamic stock detail page
│
├── features/                        # Feature modules (NEW!)
│   ├── signals/                    # Signal feature
│   │   ├── components/            # Signal-specific components
│   │   │   ├── AccuracyDisplay.tsx
│   │   │   ├── ConfidenceGauge.tsx
│   │   │   ├── ReasoningPanel.tsx
│   │   │   ├── SignalBadge.tsx
│   │   │   ├── __tests__/        # Co-located tests
│   │   │   └── index.ts          # Component exports
│   │   ├── hooks/                 # Signal-specific hooks
│   │   │   ├── useSignal.ts
│   │   │   ├── useSignalReasoning.ts
│   │   │   ├── useEnsembleSignals.ts
│   │   │   ├── __tests__/        # Hook tests
│   │   │   └── index.ts
│   │   ├── api/                   # Signal API functions
│   │   │   ├── signals-api.ts    # 9+ API functions
│   │   │   └── index.ts
│   │   └── index.ts               # Feature exports
│   │
│   ├── portfolio/                  # Portfolio feature
│   │   ├── components/
│   │   │   ├── HoldingsTable.tsx
│   │   │   ├── PortfolioUpload.tsx
│   │   │   ├── RebalancingSuggestions.tsx
│   │   │   ├── RiskMetricsDashboard.tsx
│   │   │   ├── __tests__/
│   │   │   └── index.ts
│   │   ├── stores/                # Portfolio state management
│   │   │   ├── portfolio-store.ts # Zustand store
│   │   │   ├── __tests__/
│   │   │   └── index.ts
│   │   ├── hooks/                 # Portfolio hooks (ready)
│   │   ├── api/                   # Portfolio API (ready)
│   │   └── index.ts
│   │
│   ├── models/                     # Models feature
│   │   ├── components/
│   │   │   ├── ModelsClient.tsx
│   │   │   ├── EnsembleSignalsTable.tsx
│   │   │   ├── ModelComparisonPanel.tsx
│   │   │   ├── DriftChart.tsx
│   │   │   ├── FeatureImpactChart.tsx
│   │   │   ├── __tests__/
│   │   │   └── index.ts
│   │   ├── hooks/                 # Model hooks (ready)
│   │   ├── api/                   # Model API (ready)
│   │   └── index.ts
│   │
│   └── alerts/                     # Alerts feature (structure ready)
│       ├── components/
│       ├── hooks/
│       ├── stores/
│       └── index.ts
│
├── components/                      # Shared/UI components
│   ├── ui/                        # Shadcn UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── table.tsx
│   │   └── ...
│   ├── header.tsx                 # Global header
│   ├── footer.tsx                 # Global footer
│   ├── Sidebar.tsx                # Navigation sidebar
│   ├── Topbar.tsx                 # Top navigation bar
│   └── __tests__/                # Shared component tests
│
├── lib/                            # Shared libraries and utilities
│   ├── api-client.ts              # API client configuration
│   ├── api.ts                     # Legacy API functions
│   ├── utils.ts                   # Utility functions
│   ├── design-tokens.ts           # Design system tokens
│   ├── hooks/                     # Shared hooks
│   │   └── useAutoRefresh.ts
│   ├── stores/                    # Global stores
│   │   └── notification-store.ts
│   └── utils/                     # Utility modules
│       └── export.ts
│
├── types/                          # TypeScript type definitions
│   └── ...
│
└── public/                         # Static assets
    └── ...
```

## Feature Module Pattern

Each feature module follows a consistent structure:

```
features/{feature-name}/
├── components/                     # Feature-specific UI components
│   ├── ComponentA.tsx
│   ├── ComponentB.tsx
│   ├── __tests__/                # Co-located component tests
│   │   ├── ComponentA.test.tsx
│   │   └── ComponentB.test.tsx
│   └── index.ts                  # Barrel export for components
│
├── hooks/                         # Feature-specific React hooks
│   ├── useFeatureData.ts
│   ├── useFeatureAction.ts
│   ├── __tests__/                # Co-located hook tests
│   │   ├── useFeatureData.test.ts
│   │   └── useFeatureAction.test.ts
│   └── index.ts                  # Barrel export for hooks
│
├── api/                           # Feature-specific API functions
│   ├── feature-api.ts            # API client functions
│   └── index.ts                  # Barrel export for API
│
├── stores/                        # Feature-specific state stores
│   ├── feature-store.ts          # Zustand/Redux store
│   ├── __tests__/                # Store tests
│   │   └── feature-store.test.ts
│   └── index.ts                  # Barrel export for stores
│
├── types/                         # Feature-specific types (optional)
│   └── index.ts
│
└── index.ts                       # Main feature export
```

## Import Patterns

### Feature Imports (Recommended)
```typescript
// Import from feature module
import { SignalBadge, ConfidenceGauge } from '@/features/signals';
import { useSignal, useSignalReasoning } from '@/features/signals';
import { fetchSignal, fetchLiveSignals } from '@/features/signals';
```

### Shared Component Imports
```typescript
// Import shared UI components
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Header from '@/components/header';
```

### Utility Imports
```typescript
// Import utilities
import { cn } from '@/lib/utils';
import { api } from '@/lib/api-client';
```

## Organizational Principles

### 1. Feature-First Organization
- Group by **feature/domain** rather than technical type
- Each feature is self-contained and independent
- Features can be easily extracted or moved

### 2. Co-location of Related Code
- Tests live next to the code they test
- Components, hooks, and APIs for a feature live together
- Reduces cognitive load and improves discoverability

### 3. Barrel Exports
- Each directory has an `index.ts` that exports its public API
- Consumers import from the feature, not deep paths
- Makes refactoring easier (internal paths can change)

### 4. Separation of Concerns
- **Features:** Domain-specific logic and UI
- **Components:** Reusable UI components
- **Lib:** Shared utilities and infrastructure
- **App:** Pages and routing

## Migration Status

### Migrated Features (Phase 2 Complete)
- ✅ **Signals** - 4 components, 3 hooks, 9 API functions
- ✅ **Portfolio** - 4 components, 1 store
- ✅ **Models** - 5 components

### Pending Migration (Future Phases)
- 🔄 **Alerts** - Structure ready
- 🔄 **Watchlist** - Planned
- 🔄 **Dashboard** - Planned

### Shared Components (Will Not Migrate)
- Global navigation (Header, Sidebar, Topbar)
- UI components (Shadcn components)
- Layout components

## Benefits

### Developer Experience
- **Easier Navigation:** Find related code quickly
- **Better IDE Support:** Autocomplete from feature exports
- **Clearer Intent:** Feature boundaries are explicit
- **Faster Onboarding:** New developers understand structure

### Maintainability
- **Isolated Changes:** Changes to one feature don't affect others
- **Easier Testing:** Tests are co-located and focused
- **Better Organization:** No more monolithic directories
- **Simpler Refactoring:** Move or extract features easily

### Scalability
- **Add Features Easily:** Follow the pattern for new features
- **Extract to Packages:** Features can become npm packages
- **Team Ownership:** Teams can own specific features
- **Independent Deployment:** Potential for micro-frontends

## Usage Examples

### Using Signal Components
```typescript
// app/some-page/page.tsx
import {
  SignalBadge,
  ConfidenceGauge,
  AccuracyDisplay
} from '@/features/signals';

export default function SomePage() {
  return (
    <div>
      <SignalBadge signal="BUY" />
      <ConfidenceGauge confidence={0.85} />
      <AccuracyDisplay ticker="CBA.AX" />
    </div>
  );
}
```

### Using Signal Hooks
```typescript
// app/some-page/page.tsx
'use client';

import { useSignal, useSignalReasoning } from '@/features/signals';

export default function SignalDetails({ ticker }: { ticker: string }) {
  const { data: signal, isLoading } = useSignal(ticker);
  const { data: reasoning } = useSignalReasoning(ticker);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>{signal?.signal_type}</h1>
      <p>{reasoning?.explanation}</p>
    </div>
  );
}
```

### Using Signal API
```typescript
// Some service or component
import { fetchSignal, fetchLiveSignals } from '@/features/signals';

async function getSignalData(ticker: string) {
  const signal = await fetchSignal(ticker);
  const liveSignals = await fetchLiveSignals();

  return { signal, liveSignals };
}
```

## Best Practices

### Creating New Features
1. Create feature directory: `features/{feature-name}/`
2. Set up standard directories (components, hooks, api, stores)
3. Add components with tests
4. Create barrel exports at each level
5. Export from main feature index.ts
6. Update this documentation

### Adding Components
1. Create component in `features/{feature}/components/`
2. Create test in `features/{feature}/components/__tests__/`
3. Export from `features/{feature}/components/index.ts`
4. Component is automatically available from feature import

### Adding Hooks
1. Create hook in `features/{feature}/hooks/`
2. Create test in `features/{feature}/hooks/__tests__/`
3. Export from `features/{feature}/hooks/index.ts`
4. Hook is automatically available from feature import

### Choosing Between Feature and Shared
- **Feature:** Component is specific to one domain
- **Shared:** Component is used across multiple features
- **When in doubt:** Start in feature, move to shared if reused

## Future Enhancements

### Planned Improvements
- [ ] Add API type definitions to features
- [ ] Create feature-specific utilities
- [ ] Add feature-level documentation
- [ ] Consider micro-frontend architecture
- [ ] Add feature flags for gradual rollout

### Backend Migration (Phases 3-5)
- [ ] Phase 3: Modularize API routes
- [ ] Phase 4: Extract database repositories
- [ ] Phase 5: Shared utilities and infrastructure

---

**Last Updated:** February 5, 2026
**Migration Phase:** Phase 2 Complete
**Status:** ✅ Active Pattern
