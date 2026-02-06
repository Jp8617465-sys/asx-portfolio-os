# Remaining 6 Test Failures - Fix Plan

**Date**: February 6, 2026
**Status**: 📋 Planning Phase
**Priority**: MEDIUM (not blocking production)
**Estimated Effort**: 1-2 hours

---

## Overview

After fixing 45 critical test failures via parallel agent execution, **6 pre-existing test failures remain**. These failures are unrelated to our recent work and represent separate issues that should be addressed in a follow-up PR.

---

## Test Failures Summary

### Frontend: useEnsembleSignals Hook (5 failures)

**File**: `frontend/features/signals/hooks/__tests__/useEnsembleSignals.test.ts`

**Test Suite**: useEnsembleSignals hook tests

**Failure Categories**:
1. Parameter handling (1 failure)
2. Empty response handling (1 failure)
3. SWR caching behavior (2 failures)
4. Error handling/loading states (1 failure)

---

### Frontend: Portfolio Page Export (1 failure)

**File**: `frontend/app/app/__tests__/portfolio-page.test.tsx`

**Test**: Export PDF button functionality

**Issue**: Mock data mismatch in company name field

---

## Detailed Analysis

### Failure 1: Parameter Changes Not Reflected

**Test**: `useEnsembleSignals › with combined parameters › should handle parameter changes`

**Error**:
```
Expected: 20
Received: 10
```

**Root Cause**: Hook not properly reacting to parameter changes (limit: 10 → 20)

**Fix Strategy**:
- Check if SWR key includes all parameters
- Verify dependency array in useEffect
- Ensure mock properly handles parameter updates

**Estimated Time**: 15 minutes

---

### Failure 2: Empty Response Handling

**Test**: `useEnsembleSignals › error handling › should handle empty response`

**Error**:
```
Expected: 0
Received: 3
```

**Root Cause**: Mock returns cached data instead of empty response

**Fix Strategy**:
- Clear SWR cache before test
- Add `dedupingInterval: 0` to SWR config
- Verify mock is called with fresh data

**Estimated Time**: 10 minutes

---

### Failure 3: Cache Differentiation by Flag

**Test**: `useEnsembleSignals › SWR caching behavior › should differentiate cache by agreementOnly flag`

**Error**:
```
Expected: toHaveBeenCalledWith(undefined, undefined, true)
Number of calls: 0
```

**Root Cause**: SWR cache key doesn't include `agreementOnly` parameter

**Fix Strategy**:
- Update SWR key to include: `['ensemble-signals', limit, agreementOnly]`
- Verify cache isolation between different flag values
- Test cache key generation logic

**Estimated Time**: 15 minutes

---

### Failure 4: Revalidation on Mount

**Test**: `useEnsembleSignals › SWR caching behavior › should revalidate on mount`

**Error**:
```diff
- "status": "success"
+ "status": "agreement"
```

**Root Cause**: Mock data has incorrect status field value

**Fix Strategy**:
- Update mock data: `status: "success"` → `status: "agreement"`
- Verify mock data matches API contract
- Check if backend changed response format

**Estimated Time**: 5 minutes

---

### Failure 5: Loading State After Error

**Test**: `useEnsembleSignals › loading states › should set isLoading to false after error`

**Error**:
```
expect(received).toBeDefined()
Received: undefined
```

**Root Cause**: Error not properly propagated to hook state

**Fix Strategy**:
- Check error handling in useEnsembleSignals hook
- Verify SWR error configuration
- Add proper error boundary handling

**Estimated Time**: 15 minutes

---

### Failure 6: Portfolio Export PDF

**Test**: `PortfolioPage › Export Functionality › Export PDF button calls exportPortfolioToPDF`

**Error**:
```diff
- "companyName": "Commonwealth Bank"
+ "companyName": "CBA"
```

**Root Cause**: Mock data has abbreviated company name instead of full name

**Fix Strategy**:
- Update mock holdings to include full company name
- Or update component to handle abbreviated names
- Verify with actual API response format

**Estimated Time**: 10 minutes

---

## Fix Plan

### Phase 1: Hook Fixes (60 minutes)

**Order of execution**:

1. **Fix Failure 4** (5 min) - Simple mock data update
   ```typescript
   const mockEnsembleSignals = {
     status: "success", // Changed from "agreement"
     // ... rest of mock
   };
   ```

2. **Fix Failure 2** (10 min) - SWR cache clearing
   ```typescript
   beforeEach(() => {
     cache.clear(); // Add SWR cache clear
     jest.clearAllMocks();
   });
   ```

3. **Fix Failure 3** (15 min) - Update cache key
   ```typescript
   // In useEnsembleSignals hook
   return useSWR(
     ['ensemble-signals', limit, agreementOnly], // Include all params
     () => getEnsembleSignalsLatest(limit, undefined, agreementOnly)
   );
   ```

4. **Fix Failure 1** (15 min) - Parameter reactivity
   ```typescript
   // Verify dependency array and cache key updates
   useEffect(() => {
     mutate(); // Force revalidation on param change
   }, [limit, agreementOnly]);
   ```

5. **Fix Failure 5** (15 min) - Error state handling
   ```typescript
   // In useEnsembleSignals hook
   const { data, error, isLoading } = useSWR(
     key,
     fetcher,
     {
       onError: (err) => {
         // Ensure error is captured
         console.error('Ensemble signals error:', err);
       }
     }
   );
   ```

---

### Phase 2: Portfolio Export Fix (10 minutes)

**Fix**: Update mock data in portfolio-page.test.tsx

```typescript
const mockPortfolioWithProfit = {
  holdings: [
    {
      ticker: 'CBA.AX',
      companyName: 'Commonwealth Bank', // Add full name
      shares: 100,
      avgCost: 90,
      currentPrice: 100,
      currentValue: 10000,
      signal: 'BUY',
      confidence: 75,
      currentSignal: 'BUY',
      signalConfidence: 75,
    },
    // ... other holdings
  ],
};
```

---

### Phase 3: Verification (20 minutes)

**Steps**:
1. Run `npm test -- useEnsembleSignals.test.ts`
2. Run `npm test -- portfolio-page.test.tsx`
3. Verify no new regressions
4. Check TypeScript compilation
5. Run production build

---

## Execution Strategy

### Option 1: Single PR (Recommended)

**Pros**:
- All hook fixes in one commit
- Easier to review related changes
- Faster merge

**Cons**:
- Slightly larger PR

**Estimated Time**: 1.5 hours

---

### Option 2: Two Separate PRs

**PR 1: Hook Fixes** (5 tests)
- Focus: useEnsembleSignals hook
- Time: 60 minutes
- Priority: HIGH

**PR 2: Portfolio Export Fix** (1 test)
- Focus: PDF export functionality
- Time: 10 minutes
- Priority: LOW

**Total Time**: 1.5 hours (including PR overhead)

---

## Success Criteria

### After Fixes

✅ useEnsembleSignals tests: 5/5 passing
✅ Portfolio page tests: All passing
✅ No new regressions
✅ TypeScript: 0 errors
✅ Production build: Success

---

## Risk Assessment

### Low Risk

- **Impact**: These tests are for edge cases and error handling
- **Scope**: Isolated to specific hooks and components
- **Revert**: Easy to revert if issues arise

### Mitigation

- Fix tests incrementally
- Run full test suite after each fix
- Commit each fix separately for easy rollback

---

## Next Steps

1. **Schedule Work**: Allocate 1-2 hours for fixes
2. **Create Branch**: `git checkout -b fix/remaining-6-test-failures`
3. **Execute Fixes**: Follow Phase 1 → Phase 2 → Phase 3
4. **Create PR**: Include this plan as reference
5. **Merge**: After approval and CI passes

---

## Notes

- These failures existed before our parallel agent execution
- Not blocking production deployment
- Can be fixed independently of main work
- Good opportunity for junior dev or pair programming

---

## References

- **Related PR**: Parallel Agent Execution (commit `b9b960bf`)
- **Test Files**:
  - `frontend/features/signals/hooks/__tests__/useEnsembleSignals.test.ts`
  - `frontend/app/app/__tests__/portfolio-page.test.tsx`
- **Documentation**: `PARALLEL_AGENT_EXECUTION_SUMMARY.md`

---

**Status**: 📋 Ready for execution
**Assigned**: TBD
**Estimated Completion**: Within 1-2 hours
