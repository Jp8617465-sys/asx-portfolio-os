# Testing Infrastructure Setup

## Quick Start

### 1. Install Dependencies
```bash
cd frontend
npm install
```

This will install:
- Jest (test runner)
- React Testing Library (component testing)
- @testing-library/jest-dom (DOM assertions)
- Prettier (code formatting)

### 2. Run Tests Locally
```bash
# Before every commit
npm run type-check  # TypeScript checking
npm run lint        # ESLint
npm run test:ci     # Tests with coverage
npm run build       # Production build

# Or run all at once
npm run pre-commit
```

### 3. Available Commands

| Command | Purpose | When to use |
|---------|---------|-------------|
| `npm run type-check` | TypeScript type checking | Before commit |
| `npm run lint` | ESLint code quality | Before commit |
| `npm run test` | Run tests in watch mode | During development |
| `npm run test:ci` | Run tests once with coverage | Before commit/push |
| `npm run test:coverage` | Generate coverage report | Weekly review |
| `npm run format` | Auto-fix code formatting | Before commit |
| `npm run format:check` | Check formatting only | In CI |
| `npm run build` | Production build | Before push |
| `npm run pre-commit` | Run all checks | Before every commit |

---

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs automatically on:
- Every push to `main` or `develop`
- Every pull request

### Pipeline Stages:
1. **Quality Checks** (2 min)
   - TypeScript type checking
   - ESLint linting
   - Prettier formatting check

2. **Tests** (5 min)
   - Unit tests
   - Integration tests
   - Coverage report (50% minimum)

3. **Build** (3 min)
   - Production build
   - Bundle size analysis

**Total Time**: ~10 minutes

---

## Writing Tests

### Example Test Structure
```typescript
// components/__tests__/MyComponent.test.tsx
import { render, screen } from '@testing-library/react';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### What to Test
✅ **Do test:**
- Component renders without crashing
- Props affect output correctly
- User interactions work
- Edge cases and error states
- Critical business logic

❌ **Don't test:**
- Third-party library internals
- CSS styling details
- Implementation details
- Next.js framework features

---

## Coverage Requirements

### Current Thresholds:
- **Branches**: 50%
- **Functions**: 50%
- **Lines**: 50%
- **Statements**: 50%

### Goal:
- Increase to 70% within 3 months
- Focus on critical paths first

---

## Troubleshooting

### "npm install" fails
```bash
rm -rf node_modules package-lock.json
npm install
```

### Tests fail with "Cannot find module"
Check `jest.config.js` moduleNameMapper and ensure path aliases match `tsconfig.json`

### TypeScript errors in tests
Ensure `@types/jest` is installed and `jest.config.js` is using TypeScript

---

## Next Steps

1. ✅ Read main [TESTING_GUIDE.md](../../TESTING_GUIDE.md)
2. ✅ Run `npm install`
3. ✅ Run `npm run test` to verify setup
4. ✅ Write tests for new features
5. ✅ Monitor CI/CD pipeline

---

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/react)
- [GitHub Actions](https://docs.github.com/actions)
