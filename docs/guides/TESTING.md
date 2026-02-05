# Testing Guide

Comprehensive testing strategy for ASX Portfolio OS.

---

## Testing Strategy

### Coverage Targets
- **Overall**: 75-85%
- **Core business logic**: 90-100%
- **Test Pyramid**: 60-70% unit, 20-30% integration, 5-10% E2E

### Testing Stack
- **Backend**: pytest, pytest-cov, pytest-mock
- **Frontend**: Jest, React Testing Library
- **E2E**: Playwright (planned)
- **CI/CD**: GitHub Actions

---

## Running Tests

### Backend Tests
```bash
# Install dependencies
pip install pytest pytest-cov pytest-mock

# Run all tests with coverage
pytest tests/ -v --cov=app --cov=jobs --cov-report=term-missing

# Run specific test files
pytest tests/test_security.py -v
pytest tests/test_user_journeys.py -v

# Check coverage threshold
pytest tests/ --cov=app --cov=jobs --cov-fail-under=75
```

### Frontend Tests
```bash
cd frontend

# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run in CI mode
npm run test:ci

# Watch mode during development
npm run test -- --watch
```

### Pre-Commit Checks
```bash
cd frontend
npm run pre-commit

# Or run individually:
npm run type-check  # TypeScript
npm run lint        # ESLint
npm run test        # Jest
npm run build       # Production build
```

---

## Test Files

### Backend Test Suite
```
tests/
├── test_security.py              # JWT, auth, rate limiting
├── test_user_journeys.py         # End-to-end flows
├── test_eodhd_client.py          # EODHD API client
├── test_model_b_signals.py       # Signal classification
├── test_ensemble_logic.py        # Ensemble weighting
├── test_fundamental_features.py  # Feature engineering
├── test_model_b_training.py      # Model training
├── test_fundamentals_api.py      # API endpoints
└── test_ensemble_api.py          # Ensemble endpoints
```

### Frontend Test Suite
```
frontend/
├── components/__tests__/         # Component tests
├── lib/__tests__/                # Utility tests
└── app/__tests__/                # Page tests
```

---

## Writing Tests

### Component Test Example
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
    expect(container.firstChild).toHaveClass('bg-red-100');
  });
});
```

### Python Test Example
```python
# tests/test_fundamentals_api.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_get_fundamental_metrics():
    response = client.get("/fundamentals/metrics?ticker=BHP.AX")
    assert response.status_code == 200
    data = response.json()
    assert "pe_ratio" in data
    assert "sector" in data
```

---

## CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm run type-check
      - run: npm run lint

  tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run test:ci
      - uses: codecov/codecov-action@v3

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm run build
```

### Pipeline Flow
```
git push → GitHub Actions → Checks Pass → Vercel Deploys
                 ↓
    [Type Check] [Lint] [Test] [Build]
                 ↓
         All checks must pass
```

---

## Manual Testing Checklist

### Environment Setup
- [ ] `.env` configured with all required variables
- [ ] Backend running: `curl http://localhost:8788/health`
- [ ] Frontend running: Visit http://localhost:3000
- [ ] Database connection working

### Authentication Tests
- [ ] Can register new user
- [ ] Cannot register with existing username
- [ ] Can login with valid credentials
- [ ] Cannot login with wrong password
- [ ] Protected endpoints require token
- [ ] Invalid tokens rejected

### Portfolio Tests
- [ ] Can upload valid CSV portfolio
- [ ] Invalid CSV shows error
- [ ] Can view portfolio holdings
- [ ] Can analyze portfolio (sync prices)
- [ ] Rebalancing suggestions generated

### Signal Tests
- [ ] Model A signals display
- [ ] Model B signals display
- [ ] Ensemble signals show agreement status
- [ ] Signal reasoning (SHAP) available

### Frontend Tests
- [ ] Dashboard loads without errors
- [ ] Stock search returns results
- [ ] Stock detail page loads
- [ ] Charts render correctly
- [ ] Watchlist add/remove works
- [ ] Portfolio upload works

---

## Performance Tests

### API Response Time Targets
| Endpoint | Target |
|----------|--------|
| `/health` | < 100ms |
| `/auth/login` | < 500ms |
| `/portfolio` | < 1s |
| `/signals/live` | < 2s |

### Frontend Load Time Targets
| Page | Target |
|------|--------|
| Dashboard | < 3s |
| Stock Detail | < 2s |
| Page Transitions | < 500ms |

---

## Security Tests

### Authentication Security
- [ ] Passwords are hashed (bcrypt)
- [ ] JWT tokens expire (1 hour)
- [ ] Rate limiting active (5 attempts / 15 min)
- [ ] SQL injection protected
- [ ] XSS protected

### Data Access Control
- [ ] Users can only see their own portfolios
- [ ] Users can only see their own watchlists
- [ ] Cannot access other user's data

---

## Troubleshooting

### Tests failing locally
```bash
# Clear Jest cache
npm run test -- --clearCache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Coverage too low
```bash
# See what's missing
pytest tests/ --cov=app --cov-report=term-missing | grep "TOTAL"

# Generate HTML report
pytest tests/ --cov=app --cov-report=html
open htmlcov/index.html
```

### TypeScript errors in CI but not locally
```bash
# Ensure same Node version
nvm use 20

# Run exact CI command
npm run type-check
```

---

## Coverage Goals

| Level | Threshold |
|-------|-----------|
| Minimum (enforced) | 50% |
| Target | 70% |
| Aspirational | 90% |

### CI Pipeline SLA
| Stage | Time |
|-------|------|
| Quality Checks | < 2 min |
| Tests | < 5 min |
| Build | < 3 min |
| **Total** | < 10 min |

---

## Best Practices

### Do
- Run tests before every push
- Write tests for new features
- Write tests for bug fixes
- Keep tests fast and focused
- Use descriptive test names

### Don't
- Skip CI checks (`--no-verify`)
- Merge failing PRs
- Disable type checking
- Ignore flaky tests

---

## Sign-Off Template

```
Tested By: _______________
Date: _______________
Environment: [ ] Local  [ ] Staging  [ ] Production
All Critical Tests Passed: [ ] Yes  [ ] No
Ready for Deployment: [ ] Yes  [ ] No
```
