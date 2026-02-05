# Feature Module Quick Start Guide

**Quick reference for working with the new modular architecture**

---

## TL;DR

- Features live in `frontend/features/{feature-name}/`
- Import from features: `import { Component } from '@/features/signals'`
- Each feature has: components, hooks, api, stores
- Tests are co-located with code
- All features export through barrel exports

---

## Import Cheat Sheet

```typescript
// ✅ DO: Import from feature module
import { SignalBadge, useSignal, fetchSignal } from '@/features/signals';

// ❌ DON'T: Import from deep paths
import SignalBadge from '@/features/signals/components/SignalBadge';
```

---

## Available Features

### 🎯 Signals Feature
```typescript
import {
  // Components
  SignalBadge,
  ConfidenceGauge,
  AccuracyDisplay,
  ReasoningPanel,

  // Hooks
  useSignal,
  useSignalReasoning,
  useEnsembleSignals,

  // API Functions
  fetchSignal,
  fetchLiveSignals,
  fetchTopSignals,
  fetchSignalReasoning,
  fetchAccuracy,
} from '@/features/signals';
```

**When to use:**
- Displaying signal badges
- Showing model predictions
- Rendering confidence scores
- Displaying AI reasoning

---

### 📊 Portfolio Feature
```typescript
import {
  // Components
  HoldingsTable,
  PortfolioUpload,
  RebalancingSuggestions,
  RiskMetricsDashboard,

  // Store
  usePortfolioStore,
} from '@/features/portfolio';
```

**When to use:**
- Displaying portfolio holdings
- Uploading CSV portfolios
- Showing rebalancing suggestions
- Rendering risk metrics

---

### 🤖 Models Feature
```typescript
import {
  // Components
  ModelsClient,
  EnsembleSignalsTable,
  ModelComparisonPanel,
  DriftChart,
  FeatureImpactChart,
} from '@/features/models';
```

**When to use:**
- Comparing model performance
- Displaying ensemble signals
- Showing model drift
- Visualizing feature importance

---

## Creating a New Component

### 1. Determine Feature
Ask: "Which feature does this belong to?"
- Signals: Anything related to predictions/signals
- Portfolio: Anything related to holdings/positions
- Models: Anything related to ML models/performance
- Shared: Used across multiple features → goes in `/components`

### 2. Create Component File
```bash
# Create component
touch frontend/features/{feature}/components/MyComponent.tsx

# Create test
touch frontend/features/{feature}/components/__tests__/MyComponent.test.tsx
```

### 3. Write Component
```typescript
// frontend/features/signals/components/MyComponent.tsx
import React from 'react';

interface MyComponentProps {
  // Props here
}

export function MyComponent({ }: MyComponentProps) {
  return <div>My Component</div>;
}
```

### 4. Export Component
```typescript
// frontend/features/signals/components/index.ts
export * from './SignalBadge';
export * from './MyComponent'; // Add this line
```

### 5. Write Test
```typescript
// frontend/features/signals/components/__tests__/MyComponent.test.tsx
import { render, screen } from '@testing-library/react';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('My Component')).toBeInTheDocument();
  });
});
```

### 6. Use Component
```typescript
// Anywhere in the app
import { MyComponent } from '@/features/signals';

export default function Page() {
  return <MyComponent />;
}
```

---

## Creating a New Hook

### 1. Create Hook File
```bash
touch frontend/features/{feature}/hooks/useMyHook.ts
touch frontend/features/{feature}/hooks/__tests__/useMyHook.test.ts
```

### 2. Write Hook
```typescript
// frontend/features/signals/hooks/useMyHook.ts
import { useState, useEffect } from 'react';

export function useMyHook(param: string) {
  const [data, setData] = useState(null);

  useEffect(() => {
    // Fetch data
  }, [param]);

  return { data };
}
```

### 3. Export Hook
```typescript
// frontend/features/signals/hooks/index.ts
export * from './useSignal';
export * from './useMyHook'; // Add this line
```

### 4. Use Hook
```typescript
import { useMyHook } from '@/features/signals';

export default function Component() {
  const { data } = useMyHook('param');
  return <div>{data}</div>;
}
```

---

## Creating API Functions

### 1. Add Function to API Module
```typescript
// frontend/features/signals/api/signals-api.ts
export async function fetchMyData(param: string) {
  const response = await fetch(`/api/my-endpoint/${param}`);
  return response.json();
}
```

### 2. Export Function
```typescript
// frontend/features/signals/api/index.ts
export {
  fetchSignal,
  fetchMyData, // Add this line
} from './signals-api';
```

### 3. Use Function
```typescript
import { fetchMyData } from '@/features/signals';

async function loadData() {
  const data = await fetchMyData('param');
  return data;
}
```

---

## Creating a Store

### 1. Create Store File
```bash
touch frontend/features/{feature}/stores/my-store.ts
touch frontend/features/{feature}/stores/__tests__/my-store.test.ts
```

### 2. Write Zustand Store
```typescript
// frontend/features/portfolio/stores/my-store.ts
import { create } from 'zustand';

interface MyState {
  data: string[];
  setData: (data: string[]) => void;
}

export const useMyStore = create<MyState>((set) => ({
  data: [],
  setData: (data) => set({ data }),
}));
```

### 3. Export Store
```typescript
// frontend/features/portfolio/stores/index.ts
export * from './portfolio-store';
export * from './my-store'; // Add this line
```

### 4. Use Store
```typescript
import { useMyStore } from '@/features/portfolio';

export default function Component() {
  const { data, setData } = useMyStore();
  return <div>{data.length} items</div>;
}
```

---

## Running Tests

### Test Specific Feature
```bash
# Test signals feature
npm test -- features/signals

# Test portfolio feature
npm test -- features/portfolio

# Test models feature
npm test -- features/models
```

### Test Specific Component
```bash
npm test -- SignalBadge
```

### Test with Coverage
```bash
npm test -- --coverage features/signals
```

---

## Common Patterns

### Loading State
```typescript
import { useSignal } from '@/features/signals';

export default function Component({ ticker }: { ticker: string }) {
  const { data: signal, isLoading, error } = useSignal(ticker);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{signal.signal_type}</div>;
}
```

### Combining Multiple Hooks
```typescript
import { useSignal, useSignalReasoning } from '@/features/signals';

export default function Component({ ticker }: { ticker: string }) {
  const { data: signal } = useSignal(ticker);
  const { data: reasoning } = useSignalReasoning(ticker);

  return (
    <div>
      <h1>{signal?.signal_type}</h1>
      <p>{reasoning?.explanation}</p>
    </div>
  );
}
```

### Using Store with API
```typescript
import { usePortfolioStore } from '@/features/portfolio';
import { fetchSignal } from '@/features/signals';

export default function Component() {
  const { holdings } = usePortfolioStore();

  useEffect(() => {
    holdings.forEach(async (holding) => {
      const signal = await fetchSignal(holding.ticker);
      // Do something with signal
    });
  }, [holdings]);

  return <div>Portfolio</div>;
}
```

---

## Troubleshooting

### Import not found
**Problem:** `Cannot find module '@/features/signals'`

**Solution:**
1. Check if component is exported in `components/index.ts`
2. Check if feature exports it in main `index.ts`
3. Restart TypeScript server (VS Code: Cmd+Shift+P → "Restart TS Server")

### Type errors
**Problem:** TypeScript can't find types

**Solution:**
1. Run `npm run type-check` to see all errors
2. Ensure props interface is defined
3. Check if types are exported from feature

### Test failures
**Problem:** Test can't find component

**Solution:**
1. Ensure test is in `__tests__/` directory
2. Check import path in test
3. Run `npm test -- --clearCache` if needed

---

## Best Practices

### ✅ DO
- Co-locate tests with components
- Export through barrel exports
- Use TypeScript for everything
- Write tests for new code
- Follow feature module pattern
- Import from feature root

### ❌ DON'T
- Import from deep paths
- Create components in wrong feature
- Skip writing tests
- Use `any` types
- Duplicate code across features
- Mix feature concerns

---

## File Naming Conventions

```
Components:     PascalCase.tsx    (SignalBadge.tsx)
Hooks:          camelCase.ts      (useSignal.ts)
Stores:         kebab-case.ts     (portfolio-store.ts)
API:            kebab-case.ts     (signals-api.ts)
Tests:          *.test.tsx/ts     (SignalBadge.test.tsx)
```

---

## Getting Help

### Documentation
- See `/docs/architecture/MODULAR_STRUCTURE.md` for detailed structure
- See `/PHASE2_MIGRATION_COMPLETE.md` for migration details
- See `/VERIFICATION_REPORT.md` for test results

### Examples
- Look at existing features for patterns
- Check test files for usage examples
- Review API modules for API patterns

---

**Quick Links:**
- [Full Architecture Docs](/docs/architecture/MODULAR_STRUCTURE.md)
- [Migration Report](/PHASE2_MIGRATION_COMPLETE.md)
- [Verification Report](/VERIFICATION_REPORT.md)

**Last Updated:** February 5, 2026
