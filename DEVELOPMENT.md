# ASX Portfolio OS - Development Guide

**Last Updated**: January 29, 2026

---

## QUICK START

### 1. Clone and Setup

```bash
# Clone repository
git clone <repository-url>
cd asx-portfolio-os

# Copy environment template
cp .env.example .env

# Edit .env with your API keys
nano .env
```

### 2. Start Development Environment

**Using Docker (Recommended)**:
```bash
docker-compose up -d
```

**Manual Setup**:
```bash
# Backend
pip install -r requirements.txt
uvicorn app.main:app --port 8788 --reload

# Frontend (in separate terminal)
cd frontend
npm install
npm run dev
```

### 3. Initialize Database

```bash
python3 scripts/apply_user_schema.py
python3 scripts/apply_notification_schema.py
python3 scripts/apply_portfolio_schema.py
```

### 4. Access Application

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8788
- **API Docs**: http://localhost:8788/docs
- **Demo Login**: `demo_user` / `testpass123`

---

## PROJECT STRUCTURE

```
asx-portfolio-os/
├── app/                          # Backend API
│   ├── main.py                   # FastAPI app entry point
│   ├── core.py                   # Shared utilities, DB, config
│   ├── auth.py                   # JWT authentication
│   └── routes/                   # API route modules
│       ├── auth_routes.py        # Login, register, token mgmt
│       ├── user_routes.py        # User profile, settings
│       ├── notification_routes.py # Notifications, alerts
│       ├── portfolio_management.py # Portfolio CRUD, analysis
│       ├── fundamentals.py       # V2: Model B fundamentals
│       ├── ensemble.py           # V2: Ensemble signals
│       ├── model.py              # V1: Model A endpoints
│       ├── signals.py            # V1: Signal endpoints
│       └── ...
├── frontend/                     # Next.js frontend
│   ├── app/                      # Next.js app router pages
│   │   ├── dashboard/            # Dashboard page
│   │   ├── models/               # Models page
│   │   ├── portfolio/            # Portfolio page
│   │   ├── stock/[ticker]/       # Stock detail page
│   │   └── ...
│   ├── components/               # React components
│   │   ├── FundamentalsTab.tsx   # V2: Model B fundamentals
│   │   ├── EnsembleSignalsTable.tsx # V2: Ensemble signals
│   │   └── ...
│   └── lib/                      # Utilities
│       ├── api.ts                # API client functions
│       ├── api-client.ts         # Axios client with auth
│       └── types.ts              # TypeScript types
├── jobs/                         # Background jobs
│   ├── generate_signals_model_b.py    # V2: Model B signals
│   ├── generate_ensemble_signals.py   # V2: Ensemble
│   ├── sync_live_prices_job.py        # Price refresh
│   └── ...
├── schemas/                      # Database schemas
│   ├── user_accounts.sql         # Users, auth
│   ├── notifications.sql         # Notifications, alerts
│   ├── portfolio_management.sql  # Portfolios, holdings
│   ├── model_b_ml_signals.sql    # V2: Model B signals
│   ├── ensemble_signals.sql      # V2: Ensemble
│   └── ...
├── tests/                        # Test suite
│   ├── test_auth_system.py       # Auth tests
│   ├── test_ensemble_api.py      # V2: Ensemble tests
│   ├── test_fundamentals_api.py  # V2: Fundamentals tests
│   └── ...
├── scripts/                      # Utility scripts
│   ├── apply_user_schema.py      # Apply user schema
│   ├── apply_notification_schema.py # Apply notifications
│   ├── apply_portfolio_schema.py  # Apply portfolio schema
│   └── test_auth_flow.py         # Manual auth test
└── outputs/                      # Model outputs, artifacts

```

---

## DEVELOPMENT WORKFLOW

### Making Changes

**1. Create Feature Branch**:
```bash
git checkout -b feature/your-feature-name
```

**2. Make Changes**:
- Edit code in `app/` for backend
- Edit code in `frontend/` for frontend
- Add tests in `tests/`

**3. Test Changes**:
```bash
# Run tests
pytest tests/ -v

# Manual testing
python3 scripts/test_auth_flow.py
```

**4. Commit Changes**:
```bash
git add .
git commit -m "feat: Add your feature description"
```

**5. Push and Create PR**:
```bash
git push origin feature/your-feature-name
```

### Adding New API Endpoint

**1. Create Route Function**:
```python
# app/routes/your_module.py
from fastapi import APIRouter, Depends
from app.auth import get_current_user_id

router = APIRouter(prefix="/your-prefix", tags=["YourTag"])

@router.get("/your-endpoint")
def your_endpoint(user_id: int = Depends(get_current_user_id)):
    """Your endpoint description."""
    return {"message": "Hello"}
```

**2. Register in main.py**:
```python
from app.routes import your_module

app.include_router(your_module.router)
```

**3. Add to OpenAPI allowed_paths**:
```python
allowed_paths = {
    ...
    "/your-prefix/your-endpoint",
}
```

**4. Create Test**:
```python
# tests/test_your_module.py
def test_your_endpoint():
    # Your test here
    pass
```

### Adding New Database Table

**1. Create Schema File**:
```sql
-- schemas/your_feature.sql
CREATE TABLE IF NOT EXISTS your_table (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES user_accounts(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**2. Create Application Script**:
```python
# scripts/apply_your_feature_schema.py
from app.core import db_context

with open('schemas/your_feature.sql') as f:
    sql = f.read()

with db_context() as conn:
    cur = conn.cursor()
    cur.execute(sql)
    conn.commit()
```

**3. Apply Schema**:
```bash
python3 scripts/apply_your_feature_schema.py
```

### Adding New Background Job

**1. Create Job File**:
```python
# jobs/your_job.py
from app.core import db_context, logger

def main():
    """Your job logic."""
    logger.info("Starting your job")

    with db_context() as conn:
        cur = conn.cursor()
        # Your database operations
        conn.commit()

    logger.info("Job complete")

if __name__ == "__main__":
    main()
```

**2. Schedule Job** (crontab):
```bash
0 6 * * * cd /app && python3 jobs/your_job.py >> logs/your_job.log 2>&1
```

---

## TESTING

### Running Tests

**All Tests**:
```bash
pytest tests/ -v
```

**Specific Test File**:
```bash
pytest tests/test_auth_system.py -v
```

**With Coverage**:
```bash
pytest tests/ --cov=app --cov-report=html
```

**Frontend Tests**:
```bash
cd frontend
npm test
```

### Writing Tests

**Backend Test Example**:
```python
import pytest
from app.core import db_context

def test_your_feature():
    """Test your feature."""
    with db_context() as conn:
        cur = conn.cursor()
        cur.execute("SELECT 1")
        result = cur.fetchone()[0]
        assert result == 1
```

**API Test Example**:
```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_endpoint():
    response = client.post(
        "/auth/login",
        json={"username": "demo_user", "password": "testpass123"}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()
```

### Manual Testing

**1. Test Authentication**:
```bash
python3 scripts/test_auth_flow.py
```

**2. Test Portfolio Upload**:
```bash
# Create test CSV
cat > test_portfolio.csv << EOF
ticker,shares,avg_cost,date_acquired
BHP.AX,100,42.50,2023-06-15
CBA.AX,50,98.00,2023-08-20
EOF

# Upload
curl -X POST http://localhost:8788/portfolio/upload \
  -H "x-api-key: $OS_API_KEY" \
  -F "file=@test_portfolio.csv"
```

**3. Test Signals**:
```bash
curl http://localhost:8788/signals/ensemble/latest \
  -H "x-api-key: $OS_API_KEY"
```

---

## DEBUGGING

### Python Debugging

**Using pdb**:
```python
import pdb; pdb.set_trace()
```

**Using print debugging**:
```python
from app.core import logger
logger.info(f"Debug info: {variable}")
```

**Check logs**:
```bash
tail -f logs/model_a.log
```

### Frontend Debugging

**Browser Console**:
```javascript
console.log('Debug:', variable);
```

**React DevTools**:
- Install React DevTools browser extension
- Inspect component state and props

**Network Tab**:
- Monitor API requests
- Check request/response payloads

### Database Debugging

**Inspect Tables**:
```bash
psql $DATABASE_URL
```

```sql
-- Count records
SELECT COUNT(*) FROM user_holdings;

-- View recent data
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10;

-- Check function exists
\df sync_holding_prices
```

**Check Logs**:
```sql
-- Enable query logging
ALTER DATABASE asx_portfolio_os SET log_statement = 'all';
```

---

## CODE STYLE

### Python

- **PEP 8** compliant
- **Docstrings** for all functions
- **Type hints** where appropriate
- **Import order**: stdlib, third-party, local

### TypeScript/React

- **ESLint** rules enforced
- **Prettier** for formatting
- **Component structure**: Props -> State -> Effects -> Handlers -> Render
- **Naming**: PascalCase for components, camelCase for functions

### SQL

- **Lowercase** for keywords
- **snake_case** for table/column names
- **Comments** for complex queries
- **Parameterized queries** always (never string concatenation)

---

## GIT WORKFLOW

### Branch Naming

- `feature/<name>` - New features
- `fix/<name>` - Bug fixes
- `docs/<name>` - Documentation updates
- `test/<name>` - Test additions
- `refactor/<name>` - Code refactoring

### Commit Messages

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `test`: Tests
- `refactor`: Refactoring
- `chore`: Maintenance

**Example**:
```
feat(auth): Add JWT token refresh endpoint

Allows users to refresh their JWT tokens before expiration
without re-entering credentials.

Closes #123
```

### Pull Request Process

1. Create feature branch
2. Make changes and commit
3. Push to remote
4. Create PR with description
5. Wait for CI to pass
6. Request review
7. Address feedback
8. Merge when approved

---

## CONTINUOUS INTEGRATION

### GitHub Actions Workflows

**Backend CI** (`.github/workflows/backend-ci.yml`):
- Runs on push to main and PRs
- Tests with pytest
- Coverage reporting
- Linting with flake8

**Frontend CI** (`.github/workflows/frontend-ci.yml`):
- Runs on push to main and PRs
- Builds Next.js app
- Runs tests
- Type checking

### Local CI Simulation

**Run Backend Checks**:
```bash
# Tests
pytest tests/ --cov=app --cov-report=term

# Linting
flake8 app/ jobs/ --max-line-length=120
```

**Run Frontend Checks**:
```bash
cd frontend

# Tests
npm test

# Build
npm run build

# Type check
npm run type-check
```

---

## USEFUL RESOURCES

### Internal Documentation

- `README.md` - Project overview
- `QUICKSTART.md` - Getting started guide
- `TESTING.md` - Test documentation
- `IMPLEMENTATION_SUMMARY.md` - V2 implementation details
- `IMPLEMENTATION_PROGRESS.md` - Recent progress updates
- `DEPLOYMENT.md` - Deployment guide (this file)

### External Links

- **FastAPI**: https://fastapi.tiangolo.com
- **Next.js**: https://nextjs.org/docs
- **PostgreSQL**: https://www.postgresql.org/docs
- **EODHD API**: https://eodhd.com/financial-apis
- **Supabase**: https://supabase.com/docs

---

## TIPS AND TRICKS

### Database

**Quick DB Access**:
```bash
alias dbshell="psql $DATABASE_URL"
```

**View Table Structure**:
```sql
\d+ user_holdings
```

**Export Query Results**:
```sql
\copy (SELECT * FROM user_holdings) TO 'holdings.csv' CSV HEADER
```

### API Development

**Auto-reload on Changes**:
```bash
uvicorn app.main:app --reload --port 8788
```

**Test Endpoint with httpie**:
```bash
http POST localhost:8788/auth/login username=demo_user password=testpass123
```

**Generate JWT Token for Testing**:
```bash
python3 -c "from app.auth import create_access_token; \
  print(create_access_token({'sub': '1'}))"
```

### Frontend Development

**Clear Next.js Cache**:
```bash
cd frontend
rm -rf .next
npm run dev
```

**Build for Production**:
```bash
npm run build
npm start
```

**Analyze Bundle Size**:
```bash
npm run build -- --analyze
```

---

## COMMON TASKS

### Reset Development Database

```bash
# Backup first!
pg_dump $DATABASE_URL > backup.sql

# Drop and recreate
dropdb asx_portfolio_os
createdb asx_portfolio_os

# Reapply schemas
python3 scripts/apply_user_schema.py
python3 scripts/apply_notification_schema.py
python3 scripts/apply_portfolio_schema.py
```

### Generate Test Data

```bash
# Run signal generation jobs
python3 jobs/generate_signals_model_b.py
python3 jobs/generate_ensemble_signals.py

# Sync portfolio prices
python3 -c "from app.core import db_context; \
  with db_context() as conn: \
    cur = conn.cursor(); \
    cur.execute('SELECT sync_all_portfolio_prices()'); \
    conn.commit()"
```

### Update Dependencies

**Backend**:
```bash
pip list --outdated
pip install --upgrade <package>
pip freeze > requirements.txt
```

**Frontend**:
```bash
cd frontend
npm outdated
npm update
```

### Performance Profiling

**Backend**:
```python
import cProfile
import pstats

profiler = cProfile.Profile()
profiler.enable()

# Your code here

profiler.disable()
stats = pstats.Stats(profiler)
stats.sort_stats('cumtime')
stats.print_stats(20)
```

**Frontend**:
```javascript
// Use React Profiler
import { Profiler } from 'react';

<Profiler id="MyComponent" onRender={onRenderCallback}>
  <MyComponent />
</Profiler>
```

---

## ARCHITECTURE DECISIONS

### Why JWT Tokens?

- Stateless authentication
- No server-side session storage
- Easy to scale horizontally
- Standard bearer token format
- 30-day expiration balances security and UX

### Why Dual-Model System (V1 + V2)?

- **Model A (V1)**: Momentum-based signals (technical analysis)
- **Model B (V2)**: Fundamental analysis (quality scores)
- **Ensemble**: Combines both for robust signals
- Reduces false positives from single-model approach

### Why PostgreSQL Functions?

- Atomic price/signal updates
- Reduce round-trips
- Consistent calculation logic
- Better performance for bulk updates

### Why Next.js?

- Server-side rendering for SEO
- API routes for backend-for-frontend pattern
- Fast page transitions
- Excellent TypeScript support

---

## GOTCHAS AND NOTES

### Database

- **Connection pooling**: Max 10 connections, don't leak connections
- **Transactions**: Always use `db_context()` for automatic commit/rollback
- **JSONB columns**: Use `psycopg2.extras.Json()` for insertion
- **Date vs Timestamp**: Be consistent with timezone handling

### API

- **API key**: Required in `x-api-key` header OR JWT in `Authorization: Bearer`
- **CORS**: Configured for localhost:3000 in development
- **Rate limiting**: 100 req/min default, adjust if needed
- **Timeouts**: 30 seconds default for API calls

### Frontend

- **SWR caching**: Data cached client-side, refresh on focus
- **Environment variables**: Must start with `NEXT_PUBLIC_` for client-side
- **TypeScript**: Strict mode enabled, fix type errors before deploying
- **Build size**: Keep bundle under 200KB gzipped

### Jobs

- **Idempotency**: Jobs should be safe to run multiple times
- **Error handling**: Always log errors, don't fail silently
- **Throttling**: Respect API rate limits (EODHD: 1.2s between calls)
- **Logging**: Write to separate log files per job

---

## KEYBOARD SHORTCUTS (Local Dev)

### VS Code (Recommended)

- `Cmd+P` - Quick file open
- `Cmd+Shift+F` - Search across files
- `F5` - Start debugging
- `Cmd+B` - Toggle sidebar
- `Ctrl+` ` - Toggle terminal

### Terminal

- `Ctrl+C` - Stop server
- `Ctrl+R` - Search command history
- `Ctrl+L` - Clear screen

---

## SUPPORT AND CONTRIBUTION

### Getting Help

1. Check this documentation
2. Search existing issues on GitHub
3. Check API docs at http://localhost:8788/docs
4. Review log files in `logs/`
5. Create new issue with reproduction steps

### Contributing

1. Read CONTRIBUTING.md (if available)
2. Follow code style guidelines
3. Add tests for new features
4. Update documentation
5. Create detailed PR descriptions

---

## CHANGELOG

See `CHANGELOG.md` for version history and breaking changes.

---

**Happy Coding! 🚀**
