# Testing Enforcement Guide
## Mandatory 80% Code Coverage Policy

> **POLICY**: All code must have 80% test coverage. No exceptions.

---

## 🎯 Enforcement Levels

### Level 1: Local Pre-Commit Hooks (MANDATORY)
**When**: Every `git commit`
**What happens**: Husky runs automatically and BLOCKS commit if:
- ❌ TypeScript errors exist
- ❌ ESLint violations exist
- ❌ Code formatting is incorrect
- ❌ Tests fail
- ❌ **Coverage < 80%**

**Cannot bypass without**:
```bash
git commit --no-verify  # ⚠️ STRONGLY DISCOURAGED
```

### Level 2: Pre-Push Validation (MANDATORY)
**When**: Every `git push`
**What happens**: Husky runs and BLOCKS push if:
- ❌ Full test suite fails
- ❌ Production build fails
- ❌ **Coverage < 80%**

**Cannot bypass without**:
```bash
git push --no-verify  # ⚠️ STRONGLY DISCOURAGED
```

### Level 3: CI/CD Pipeline (ENFORCED)
**When**: Every push to `main` or `develop`
**What happens**: GitHub Actions runs and FAILS if:
- ❌ Type checking fails
- ❌ Linting fails
- ❌ Tests fail
- ❌ **Coverage < 80%**
- ❌ Build fails

**Cannot bypass**: This is server-side enforcement

### Level 4: Branch Protection Rules (REQUIRED SETUP)
**When**: Pull requests to `main`
**What happens**: GitHub blocks merge if:
- ❌ CI/CD pipeline not green
- ❌ Code review not approved
- ❌ Conflicts exist

**Cannot bypass without**: Admin override (audit logged)

---

## 📊 Coverage Requirements

### Global Thresholds (ENFORCED):
```javascript
{
  branches: 80,    // 80% of code branches tested
  functions: 80,   // 80% of functions tested
  lines: 80,       // 80% of code lines executed
  statements: 80   // 80% of statements executed
}
```

### What Gets Measured:
✅ **Included**:
- All components (`components/**/*.tsx`)
- All pages (`app/**/*.tsx`)
- All utilities (`lib/**/*.ts`)
- All business logic

❌ **Excluded**:
- Type definitions (`*.d.ts`)
- Node modules
- Build artifacts (`.next/`)
- Config files
- Test files themselves

---

## 🚫 How to See if You'll Pass BEFORE Committing

### Quick Check:
```bash
cd frontend

# Run all checks (same as pre-commit hook)
npm run pre-commit

# View detailed coverage report
npm run test:coverage

# Open HTML coverage report in browser
open coverage/index.html
```

### Understanding Coverage Reports:

#### Terminal Output:
```bash
------------------|---------|----------|---------|---------|
File              | % Stmts | % Branch | % Funcs | % Lines |
------------------|---------|----------|---------|---------|
All files         |   82.5  |   78.2   |   85.1  |   82.8  |
 components/      |   90.2  |   87.5   |   92.0  |   90.5  |
  signal-badge    |   95.0  |   90.0   |  100.0  |   95.0  |
  holdings-table  |   85.5  |   85.0   |   84.0  |   86.0  |
 lib/             |   75.0  |   70.0   |   78.0  |   75.2  | ⚠️ BELOW 80%
  api-client      |   65.0  |   60.0   |   70.0  |   65.5  | ❌ FAILS
------------------|---------|----------|---------|---------|
```

**Interpretation**:
- ✅ Green = Passes 80% threshold
- ⚠️ Yellow = Close to threshold (75-79%)
- ❌ Red = Below threshold (< 75%)

#### HTML Report:
- Shows exact lines NOT covered
- Click files to see highlighted code
- Red = Not covered, Green = Covered

---

## ✅ How to Increase Coverage

### 1. Identify Uncovered Code:
```bash
npm run test:coverage
open coverage/index.html
```

### 2. Write Tests for Uncovered Lines:
```typescript
// Example: If export.ts has low coverage

// lib/__tests__/utils/export.test.ts
import { exportToCSV } from '../utils/export';

describe('exportToCSV', () => {
  it('handles empty data array', () => {
    const consoleSpy = jest.spyOn(console, 'warn');
    exportToCSV([], 'test');
    expect(consoleSpy).toHaveBeenCalledWith('No data to export');
  });

  it('escapes commas in CSV values', () => {
    const data = [{ name: 'Smith, John', age: 30 }];
    const spy = jest.spyOn(document, 'createElement');
    exportToCSV(data, 'test');
    expect(spy).toHaveBeenCalled();
  });
});
```

### 3. Focus on Critical Paths First:
**Priority Order**:
1. Business logic (calculations, validations)
2. User-facing components
3. API interactions
4. Error handling
5. Edge cases

---

## 🔧 Troubleshooting

### "Coverage is at 79.8%, just barely failing"

**Solution**:
```bash
# See exactly what's missing
npm run test:coverage
open coverage/index.html

# Add a single test to cover the gap
```

### "I can't commit because tests are failing"

**Options**:
1. Fix the failing tests (RECOMMENDED)
2. Skip broken tests temporarily:
   ```typescript
   it.skip('broken test', () => { /* ... */ });
   ```
3. Bypass (NOT RECOMMENDED):
   ```bash
   git commit --no-verify -m "WIP: fixing tests"
   ```

### "Pre-commit hook is taking too long"

**Current setup**:
- Type check: ~10 seconds
- Lint: ~5 seconds
- Format check: ~2 seconds
- Tests: ~30 seconds (with coverage)
- **Total**: ~45-60 seconds

**Optimization**:
- Tests run only for changed files
- Use `--maxWorkers=2` to limit CPU usage
- Consider adding `--onlyChanged` flag

---

## 📋 Branch Protection Setup (GitHub)

### Required for Full Enforcement:

1. **Go to**: GitHub > Settings > Branches
2. **Add rule** for `main` branch:

**Settings to Enable**:
```yaml
✅ Require a pull request before merging
   ✅ Require approvals: 1
   ✅ Dismiss stale reviews

✅ Require status checks to pass before merging
   ✅ Require branches to be up to date
   ✅ Status checks required:
      - quality-checks
      - test (Unit & Integration Tests)
      - build (Production Build)

✅ Require conversation resolution before merging

✅ Do not allow bypassing the above settings
   (Only repository admins can bypass)

✅ Restrict who can push to matching branches
   (Limit to: Administrators only)
```

3. **Save changes**

**Result**: Cannot merge to `main` unless CI is green ✅

---

## 🎓 Training: How to Work with Enforcement

### Daily Workflow:

#### Before Starting Work:
```bash
git checkout -b feature/my-feature
```

#### While Coding:
```bash
# Watch tests as you code
npm run test

# Check coverage periodically
npm run test:coverage
```

#### Before Committing:
```bash
# This will run automatically via Husky
git commit -m "feat: add new feature"

# If it fails, fix issues and try again
```

#### Before Pushing:
```bash
# This will run automatically via Husky
git push origin feature/my-feature

# If it fails, fix build issues
```

#### Creating Pull Request:
```bash
# Wait for CI/CD to pass (green checkmark)
# Request code review
# Merge when approved
```

---

## 📈 Monitoring & Metrics

### Weekly Review:
- [ ] Check Codecov dashboard
- [ ] Review coverage trends
- [ ] Identify files with low coverage
- [ ] Assign coverage improvement tasks

### Monthly Goals:
- Month 1: Achieve 80% coverage
- Month 2: Maintain 80%+ coverage
- Month 3: Improve to 85%
- Month 6: Target 90%

---

## 🚨 What If We Can't Reach 80%?

### Short-term Solutions:
1. **Exclude files temporarily**:
   ```javascript
   // jest.config.js
   collectCoverageFrom: [
     '!lib/legacy/**',  // Exclude legacy code
   ]
   ```

2. **Lower threshold temporarily**:
   ```javascript
   // jest.config.js (TEMPORARY)
   coverageThreshold: {
     global: { statements: 70 },  // Lower to 70%
     './lib/new-feature/': { statements: 80 },  // But 80% for new code
   }
   ```

3. **Create coverage improvement sprint**:
   - Dedicate 1 week to writing tests
   - Each developer adds 5% coverage
   - Review and merge all at once

### Long-term Solutions:
1. **Test-first development** (TDD)
2. **Pair programming** on complex features
3. **Code review checklist** includes tests
4. **Refactor for testability**

---

## ❓ FAQ

### Q: Why 80%?
**A**: Industry standard for production code. Balances quality with productivity.

### Q: Can we bypass for hotfixes?
**A**: Yes, with admin approval. But must add tests afterward.

### Q: What if a file is hard to test?
**A**: Refactor it to be more testable. Extract logic into pure functions.

### Q: Do tests slow down development?
**A**: Short-term: slightly. Long-term: MUCH faster (fewer bugs to fix).

### Q: What about external dependencies?
**A**: Mock them in tests. Don't test third-party code.

---

## 📞 Support

**Issues?** Contact:
- Development Lead
- DevOps Team
- File issue in GitHub

**Resources**:
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Strategy overview
- [SETUP_TESTING.md](./frontend/SETUP_TESTING.md) - Quick start
- Jest docs: https://jestjs.io/
- Coverage reports: `open frontend/coverage/index.html`

---

**Last Updated**: January 2026
**Policy Owner**: CIO / Engineering Lead
**Review Frequency**: Quarterly
**Enforcement**: MANDATORY
