# Testing & Quality Assurance Guide
## ASX Portfolio OS - Enterprise Best Practices

> **As a CIO/Solution Architect**: This document outlines our testing strategy, CI/CD pipeline, and quality gates to ensure a robust and functional codebase.

---

## Table of Contents
1. [Why Testing Matters](#why-testing-matters)
2. [Testing Stack](#testing-stack)
3. [Running Tests Locally](#running-tests-locally)
4. [CI/CD Pipeline](#cicd-pipeline)
5. [Pre-Deployment Checklist](#pre-deployment-checklist)
6. [Best Practices](#best-practices)
7. [Writing Tests](#writing-tests)

---

## Why Testing Matters

### Problems We're Solving:
- ✅ **No more TypeScript errors in production**
- ✅ **Catch bugs before they reach users**
- ✅ **Faster development with confidence**
- ✅ **Automated quality gates**
- ✅ **Better code review process**

### Cost of NOT Testing:
- 🔴 Failed Vercel deployments (wastes time)
- 🔴 Production bugs discovered by users
- 🔴 Hotfixes and rollbacks (stressful)
- 🔴 Lost developer productivity
- 🔴 Damaged reputation

---

## Testing Stack

```
┌─────────────────────────────────────────────┐
│ Development Phase                           │
├─────────────────────────────────────────────┤
│ • TypeScript (strict mode)                  │
│ • ESLint (code quality)                     │
│ • Prettier (code formatting)                │
│ • Jest (unit/integration tests)             │
│ • React Testing Library (component tests)   │
└─────────────────────────────────────────────┘
         ↓ git commit
┌─────────────────────────────────────────────┐
│ Pre-Commit Hooks (Husky)                    │
├─────────────────────────────────────────────┤
│ 1. Type checking (tsc --noEmit)             │
│ 2. Linting (eslint)                         │
│ 3. Unit tests (jest)                        │
└─────────────────────────────────────────────┘
         ↓ git push
┌─────────────────────────────────────────────┐
│ CI/CD Pipeline (GitHub Actions)             │
├─────────────────────────────────────────────┤
│ 1. Install dependencies                     │
│ 2. Type checking                            │
│ 3. Linting                                  │
│ 4. Unit tests + coverage                    │
│ 5. Production build                         │
│ 6. Bundle size check                        │
└─────────────────────────────────────────────┘
         ↓ all checks pass
┌─────────────────────────────────────────────┐
│ Deployment (Vercel)                         │
└─────────────────────────────────────────────┘
```

---

## Running Tests Locally

### Before Every Commit:
```bash
cd frontend

# 1. Type check (catches TypeScript errors)
npm run type-check

# 2. Run linter (catches code quality issues)
npm run lint

# 3. Run tests (catches logic errors)
npm run test

# 4. Build production bundle (catches build errors)
npm run build
```

### Quick Commands:
```bash
# Run all pre-commit checks
npm run pre-commit

# Run tests in watch mode (during development)
npm run test

# Run tests with coverage report
npm run test:coverage

# Run tests in CI mode (no watch, with coverage)
npm run test:ci

# Check code formatting
npm run format:check

# Auto-fix formatting
npm run format
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

Our CI/CD pipeline runs on **every push** and **pull request**:

#### Job 1: Quality Checks
- ✅ TypeScript type checking
- ✅ ESLint code quality
- ✅ Prettier formatting check

#### Job 2: Tests
- ✅ Unit tests
- ✅ Integration tests
- ✅ Coverage reporting (minimum 50%)

#### Job 3: Build
- ✅ Production build
- ✅ Bundle size analysis

**Location**: `.github/workflows/ci.yml`

### How It Works:
1. Developer pushes code to GitHub
2. GitHub Actions automatically runs all checks
3. If ANY check fails → deployment is blocked
4. If all checks pass → code is ready for Vercel
5. Vercel automatically deploys (only if CI passes)

---

## Pre-Deployment Checklist

### Developer Responsibility:
Before pushing to `main`, ensure:

- [ ] `npm run type-check` passes (no TypeScript errors)
- [ ] `npm run lint` passes (no linting errors)
- [ ] `npm run test:ci` passes (all tests green)
- [ ] `npm run build` succeeds (production build works)
- [ ] Manual testing in browser (smoke test)

### Team Lead Responsibility:
Before merging PR:

- [ ] CI/CD pipeline is green
- [ ] Code review completed
- [ ] Tests added for new features
- [ ] No console errors in demo
- [ ] Performance impact assessed

---

## Best Practices

### 1. Type Safety First
```typescript
// ❌ Bad - implicit any
const items = data.map(item => item.value);

// ✅ Good - explicit types
const items = data.map((item: DataItem) => item.value);
```

### 2. Test Before Push
```bash
# Always run before pushing
npm run pre-commit
```

### 3. Write Tests for:
- ✅ New features
- ✅ Bug fixes
- ✅ Critical user flows
- ✅ Complex business logic
- ✅ Edge cases

### 4. Never Skip CI
- ❌ Never use `git push --no-verify`
- ❌ Never merge failing PRs
- ❌ Never disable type checking

### 5. Keep Main Branch Clean
- Use feature branches
- Squash commits before merging
- Main should always be deployable

---

## Writing Tests

### Example: Component Test
```typescript
// components/__tests__/SignalBadge.test.tsx
import { render, screen } from '@testing-library/react';
import SignalBadge from '../signal-badge';

describe('SignalBadge', () => {
  it('renders STRONG_BUY signal correctly', () => {
    render(<SignalBadge signal="STRONG_BUY" size="md" />);
    expect(screen.getByText('STRONG BUY')).toBeInTheDocument();
  });

  it('applies correct color for STRONG_SELL', () => {
    const { container } = render(<SignalBadge signal="STRONG_SELL" size="md" />);
    const badge = container.firstChild;
    expect(badge).toHaveClass('bg-red-100');
  });
});
```

### Example: Utility Test
```typescript
// lib/__tests__/utils/export.test.ts
import { exportToCSV } from '../utils/export';

describe('exportToCSV', () => {
  it('generates valid CSV from array of objects', () => {
    const data = [
      { ticker: 'CBA', price: 95.50 },
      { ticker: 'BHP', price: 42.30 },
    ];

    const spy = jest.spyOn(document, 'createElement');
    exportToCSV(data, 'test');

    expect(spy).toHaveBeenCalledWith('a');
    spy.mockRestore();
  });
});
```

---

## Troubleshooting

### "Tests are failing locally"
```bash
# Clear Jest cache
npm run test -- --clearCache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### "TypeScript errors in CI but not locally"
```bash
# Ensure you're on the same Node version
nvm use 20

# Run exact CI command
npm run type-check
```

### "Build works locally but fails in Vercel"
- Check environment variables in Vercel dashboard
- Ensure `.env.local` is not committed
- Verify `NEXT_PUBLIC_*` variables are set

---

## Metrics & Monitoring

### Coverage Goals:
- **Minimum**: 50% coverage (enforced)
- **Target**: 70% coverage
- **Aspirational**: 90% coverage

### CI Pipeline SLA:
- **Quality Checks**: < 2 minutes
- **Tests**: < 5 minutes
- **Build**: < 3 minutes
- **Total**: < 10 minutes

---

## Next Steps

### Immediate Actions:
1. ✅ Run `npm install` to install testing dependencies
2. ✅ Run `npm run type-check` before every push
3. ✅ Write tests for new features
4. ✅ Review CI/CD pipeline in GitHub Actions

### Future Enhancements:
- [ ] E2E tests with Playwright
- [ ] Visual regression testing
- [ ] Performance budgets
- [ ] Lighthouse CI integration
- [ ] Automated dependency updates (Dependabot)

---

## Support

**Questions?** Contact the development team or review:
- Jest docs: https://jestjs.io/
- Testing Library: https://testing-library.com/
- GitHub Actions: https://docs.github.com/actions

---

**Last Updated**: January 2026
**Maintained By**: Development Team
**Review Frequency**: Quarterly
