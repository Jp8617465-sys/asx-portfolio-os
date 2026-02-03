# GitHub Workflows Documentation

This directory contains the CI/CD workflows for the ASX Portfolio OS project.

## Active Workflows

### 1. Backend CI (`backend-ci.yml`)
**Purpose**: Comprehensive backend code quality and testing

**Triggers**: 
- Pull requests affecting: `app/`, `jobs/`, `schemas/`, `services/`, `requirements.txt`, `tests/`
- Pushes to `main` affecting the same paths

**Jobs**:
- **Code Quality**:
  - `black --check`: Python code formatting
  - `isort --check-only`: Import sorting
  - `mypy`: Static type checking with `--ignore-missing-imports`
  - `ruff`: Fast Python linter (configured via `ruff.toml`)
- **Testing**:
  - `pytest` with 75% minimum coverage requirement
  - Coverage reports uploaded to Codecov
  - HTML coverage reports as artifacts
- **Security**:
  - `pip-audit` for dependency vulnerability scanning (high severity only)
  - `pip check` for dependency resolution issues

**Python Version**: 3.10

### 2. Frontend CI (`frontend-ci.yml`)
**Purpose**: Comprehensive frontend code quality, testing, and building

**Triggers**:
- Pull requests affecting: `frontend/**`
- Pushes to `main` affecting the same path

**Jobs**:
- **Code Quality**:
  - `npm run lint`: ESLint checks
  - `npm run type-check`: TypeScript type validation
- **Testing**:
  - `npm run test:ci`: Jest tests with coverage
  - Coverage reports uploaded to Codecov
- **Build**:
  - `npm run build`: Next.js production build verification

**Node Version**: 20

### 3. Security & Integration (`ci.yml`)
**Purpose**: Repository-wide security scans and production smoke tests

**Triggers**:
- All pull requests to `main`
- All pushes to `main`

**Jobs**:
- **python-security** (continue-on-error):
  - `pip-audit` for Python dependency vulnerabilities (high severity)
- **frontend-security** (continue-on-error):
  - `npm audit` for Node.js dependency vulnerabilities (moderate+)
- **smoke-test** (main branch only):
  - Starts API server
  - Runs basic health checks
  - Validates critical endpoints work

**Notes**: Security jobs use `continue-on-error: true` to report issues without blocking PRs

### 4. E2E Authentication Tests (`e2e-auth-tests.yml`)
**Purpose**: End-to-end testing of authentication flows with real database

**Triggers**:
- Pull requests to `main`
- Pushes to `main`
- Manual workflow dispatch

**Jobs**:
- Sets up PostgreSQL 15 service
- Applies database schemas
- Creates test user
- Builds frontend
- Starts both backend (port 8788) and frontend (port 3000) servers
- Runs Playwright E2E tests on Chromium
- Uploads test reports and videos on failure

**Python Version**: 3.10  
**Node Version**: 20

**Artifacts**:
- Playwright test reports (30 days)
- Test videos on failure (7 days)
- Server logs on failure (7 days)

### 5. V2 Execution - Fundamental Intelligence (`v2-execution.yml`)
**Purpose**: Execute V2 ML pipeline for fundamental analysis

**Triggers**: Manual workflow dispatch only

**Inputs**:
- `environment`: staging or production
- `skip_training`: Skip Model B training (use existing model)

**Jobs**:
- Apply V2 database schemas (fundamentals, model_b_ml_signals, ensemble_signals)
- Load fundamental data from EODHD API
- Build extended feature set
- Train Model B (if not skipped)
- Generate Model B signals
- Generate ensemble signals
- Test V2 API endpoints
- Create execution report

**Python Version**: 3.10

**Artifacts**:
- V2 pipeline outputs (30 days)
- Execution report (90 days)

## Workflow Architecture

```
Pull Request Flow:
├── Backend Changes → backend-ci.yml (lint, type-check, test)
├── Frontend Changes → frontend-ci.yml (lint, type-check, test, build)
├── All Changes → ci.yml (security scans)
└── All Changes → e2e-auth-tests.yml (integration tests)

Main Branch Flow:
├── All workflows from PR flow
├── ci.yml → smoke-test job (production health check)
└── Manual → v2-execution.yml (ML pipeline execution)
```

## Configuration

### Python
- **Version**: 3.10 (standardized across all workflows)
- **Linter**: ruff (configured via `ruff.toml`)
- **Formatters**: black, isort
- **Type Checker**: mypy
- **Test Framework**: pytest
- **Coverage Tool**: pytest-cov (75% minimum for backend-ci)

### Node.js
- **Version**: 20 (standardized across all workflows)
- **Package Manager**: npm
- **Linter**: ESLint (via Next.js config)
- **Type Checker**: TypeScript compiler
- **Test Framework**: Jest
- **E2E Testing**: Playwright

### Security
- **Python**: pip-audit (high severity vulnerabilities)
- **Node.js**: npm audit (moderate+ severity vulnerabilities)
- **Strategy**: Security checks don't block builds (continue-on-error) but are visible in CI

## Path Filters

Workflows use path filters to run only when relevant files change:

- **backend-ci.yml**: Backend Python code and configs
- **frontend-ci.yml**: Frontend Next.js code
- **ci.yml**: No path filters (runs for all changes)
- **e2e-auth-tests.yml**: No path filters (tests full stack)

## Recent Fixes (2026-02-03)

1. **pip-audit syntax error**: Fixed command to use `--requirement` instead of `-r`
2. **E2E test paths**: Removed non-existent `backend/` directory references
3. **Python version**: Standardized to 3.10 across all workflows
4. **GitHub Actions**: Updated to latest versions (checkout@v4, setup-python@v5, etc.)
5. **Type checking**: Removed `|| true` from frontend type-check to catch errors
6. **Security jobs**: Added `continue-on-error: true` to not block builds
7. **Linting**: Auto-fixed all ruff errors, added ruff.toml configuration
8. **Node version**: Standardized to 20 in ci.yml to match frontend-ci.yml

## Maintenance

### Adding a New Workflow

1. Create workflow file in `.github/workflows/`
2. Use appropriate triggers and path filters
3. Follow naming convention: `<purpose>-<type>.yml`
4. Update this README with workflow details

### Updating Dependencies

- **Python**: Update `requirements.txt`, then update in workflows if version changes
- **Node.js**: Update `frontend/package.json`, ensure NODE_VERSION matches in workflows
- **GitHub Actions**: Check for updates at https://github.com/actions

### Troubleshooting

**Workflow fails on pip-audit or npm audit**:
- These are security scans with `continue-on-error: true`
- They won't block the build but indicate vulnerabilities to address
- Review the logs and update dependencies as needed

**E2E tests fail**:
- Check that database schemas are compatible
- Verify backend and frontend start successfully
- Review Playwright test artifacts for details

**Coverage below threshold**:
- Backend requires 75% coverage
- Add tests for uncovered code or adjust threshold in `backend-ci.yml`

## Contributing

When modifying workflows:
1. Test changes on a feature branch first
2. Document changes in this README
3. Ensure workflows don't duplicate functionality
4. Use path filters to avoid unnecessary runs
5. Follow the principle: "Fail fast, but don't block on warnings"
