# Contributing to ASX Portfolio OS

**Welcome to the ASX Quantitative Trading Platform!** This guide outlines our workflow standards, branch naming conventions, and commit message formats.

---

## 🎯 Critical Requirements

As a quantitative trading system handling real financial data and AI-powered predictions, we maintain strict standards to ensure:

1. **Main branch must always be stable and deployable**
2. **Data integrity and prevention of leakage is paramount**
3. **Model performance must be validated before deployment**
4. **Time series validation required for all data/model changes**
5. **Financial calculations must be deterministic and documented**

**Tech Stack**: Python, LightGBM, Pandas, ASX market data (2000+ symbols)  
**Current Performance**: Model A v1.2: 60.3% ROC-AUC, 21-day horizon, 7 technical features

---

## 📋 Workflow Standards

### Branch Naming Convention

All branches must follow this format:

```
prefix/ticket-id_short-description
```

**Examples**:
- `feature/PROJ-123_login-ui`
- `model/PROJ-456_add-rsi-feature`
- `bugfix/PROJ-789_fix-leakage-daily-returns`
- `data/PROJ-234_enhance-momentum-features`

### Branch Prefixes

| Prefix | Purpose | Examples |
|--------|---------|----------|
| `feature/` | New functionality or enhancements | `feature/PROJ-101_portfolio-upload` |
| `bugfix/` | Bug fixes for existing features | `bugfix/PROJ-202_fix-price-sync` |
| `hotfix/` | Urgent production fixes requiring immediate deployment | `hotfix/PROJ-303_critical-auth-bug` |
| `refactor/` | Code restructuring without behavior changes | `refactor/PROJ-404_clean-api-routes` |
| `model/` | ML model architecture, training, or hyperparameter changes | `model/PROJ-505_lgbm-tuning` |
| `data/` | Data pipeline, feature engineering, or preprocessing changes | `data/PROJ-606_add-volume-indicators` |
| `experiment/` | Research experiments (may not merge to main) | `experiment/PROJ-707_test-xgboost` |
| `performance/` | Performance optimization and efficiency improvements | `performance/PROJ-808_optimize-queries` |
| `signal/` | Trading signal generation logic changes | `signal/PROJ-909_momentum-threshold` |

---

## 📝 Commit Message Format

We use **Conventional Commits** format for clear, structured commit history:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Commit Types

| Type | Purpose | Example |
|------|---------|---------|
| `feat` | New feature | `feat(portfolio): add CSV upload endpoint` |
| `fix` | Bug fix | `fix(signals): correct momentum calculation` |
| `model` | Model architecture or training changes | `model(lgbm): add cross-validation` |
| `data` | Data pipeline or feature engineering | `data(features): add RSI indicator` |
| `perf` | Performance improvements | `perf(api): optimize database queries` |
| `refactor` | Code restructuring | `refactor(auth): simplify JWT validation` |
| `test` | Adding or updating tests | `test(signals): add unit tests for momentum` |
| `docs` | Documentation changes | `docs(readme): update deployment guide` |
| `chore` | Maintenance tasks | `chore(deps): update LightGBM to 4.1.0` |
| `security` | Security fixes | `security(api): fix SQL injection vulnerability` |

### Commit Scope

The scope should indicate the area of the codebase affected:

- `portfolio` - Portfolio management features
- `signals` - Signal generation and ranking
- `model` - ML model training and inference
- `auth` - Authentication and authorization
- `api` - API endpoints and routes
- `data` - Data pipelines and ETL
- `features` - Feature engineering
- `db` - Database schema or migrations
- `frontend` - Frontend UI changes
- `jobs` - Background jobs and cron tasks

### Commit Examples

**Good commits**:
```
feat(portfolio): add rebalancing suggestions endpoint

Implements AI-powered portfolio rebalancing based on Model A signals.
Includes risk-adjusted position sizing and tax-loss harvesting.

Closes #234
```

```
fix(signals): prevent data leakage in daily returns calculation

The previous implementation used future data in the moving average.
Changed to strictly use only historical data up to t-1.

Fixes #456
```

```
model(lgbm): tune hyperparameters for Model A v1.3

- Increased num_leaves: 31 → 127
- Reduced learning_rate: 0.05 → 0.02
- Added early_stopping_rounds: 50

Performance: ROC-AUC 60.3% → 62.1%

Ref: PROJ-789
```

**Bad commits**:
```
Update stuff                           ❌ Too vague
fix bug                                ❌ Missing scope and description
WIP                                    ❌ Not descriptive
Merged branch feature/test             ❌ Auto-generated merge message
```

---

## 🔀 Pull Request Process

### 1. Create a Branch

```bash
# Format: prefix/ticket-id_short-description
git checkout -b feature/PROJ-123_add-momentum-signals
```

### 2. Make Changes

- Write clean, documented code
- Add unit tests for new functionality
- Update documentation if needed

### 3. Commit Your Changes

```bash
# Use conventional commit format
git add .
git commit -m "feat(signals): add momentum-based signal generation

Implements 12-month momentum calculation for Model A.
Uses price data from the last 252 trading days.

Ref: PROJ-123"
```

### 4. Test Locally

```bash
# Run all tests
pytest tests/ -v

# Check for data leakage (for model/data changes)
python3 jobs/validate_no_leakage.py

# Verify time series integrity (for data changes)
python3 scripts/validate_time_series.py
```

### 5. Push and Create PR

```bash
git push origin feature/PROJ-123_add-momentum-signals
```

Then create a Pull Request on GitHub with:
- **Title**: Clear, descriptive summary
- **Description**: What changed and why
- **Testing**: How you validated the changes
- **Checklist**: Complete the PR template checklist

### 6. Address Review Feedback

- Respond to all comments
- Make requested changes
- Push updates to the same branch
- Re-run tests

### 7. Merge

Once approved and CI passes:
- Squash and merge (preferred for feature branches)
- Use merge commit (for release branches)
- Delete branch after merging

---

## 🧪 Testing Requirements

### All Changes

- [ ] Unit tests added or updated
- [ ] All tests pass locally: `pytest tests/ -v`
- [ ] Code follows style guidelines (PEP 8 for Python)
- [ ] Documentation updated if needed

### Model Changes (`model/` prefix)

- [ ] Walk-forward validation performed
- [ ] ROC-AUC score >= baseline (60.3%)
- [ ] Model artifacts saved to `outputs/models/`
- [ ] Feature importance analysis included
- [ ] No data leakage verified

### Data Changes (`data/` prefix)

- [ ] Time series integrity validated
- [ ] No look-ahead bias introduced
- [ ] Feature distributions checked for drift
- [ ] Historical data not modified (append-only)
- [ ] Data quality checks pass

### Signal Changes (`signal/` prefix)

- [ ] Backtest performed on historical data
- [ ] Sharpe ratio >= baseline
- [ ] Maximum drawdown within tolerance (<30%)
- [ ] Signal distribution analyzed
- [ ] Correlation with existing signals checked

### API Changes (`feature/` or `bugfix/`)

- [ ] API documentation updated
- [ ] Authentication/authorization verified
- [ ] Rate limiting tested
- [ ] Error handling comprehensive
- [ ] Integration tests added

---

## 🔒 Security Guidelines

### Never Commit

- API keys or secrets (use environment variables)
- Database credentials
- Production data or PII
- Model artifacts > 100MB (use Git LFS)

### Always

- Validate all user inputs
- Use parameterized SQL queries
- Sanitize file uploads
- Implement rate limiting
- Log security events

### For Financial Data

- Verify data integrity checksums
- Prevent SQL injection in queries
- Validate date ranges for time series
- Check for data leakage in features
- Document all financial calculations

---

## 📊 Code Review Checklist

When reviewing PRs, check for:

### General Code Quality
- [ ] Code is readable and well-documented
- [ ] No unnecessary complexity
- [ ] Error handling is comprehensive
- [ ] Logging is appropriate
- [ ] No commented-out code

### Testing
- [ ] Tests cover new functionality
- [ ] Tests are deterministic (no random failures)
- [ ] Edge cases are handled
- [ ] Test names are descriptive

### Data Integrity (for model/data changes)
- [ ] No data leakage from future to past
- [ ] Time series ordering preserved
- [ ] Feature engineering is reproducible
- [ ] Data transformations are documented

### Model Performance (for model changes)
- [ ] Validation metrics meet baselines
- [ ] Cross-validation performed correctly
- [ ] Overfitting checks completed
- [ ] Feature importance makes sense

### Documentation
- [ ] README updated if needed
- [ ] API docs updated if endpoints changed
- [ ] Inline comments for complex logic
- [ ] Commit messages are clear

---

## 🚀 Deployment Process

### Development → Production

1. **Feature Development**
   - Create `feature/PROJ-XXX_description` branch
   - Develop and test locally
   - Create PR to `main`

2. **Code Review**
   - Get approval from at least 1 reviewer
   - All CI checks must pass
   - Address all review comments

3. **Merge to Main**
   - Main branch auto-deploys to production
   - Monitor deployment logs
   - Verify health checks pass

4. **Hotfix Process** (for urgent production bugs)
   - Create `hotfix/PROJ-XXX_description` from `main`
   - Make minimal fix
   - Fast-track review and merge
   - Document in post-mortem

---

## 🛠️ Development Setup

See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed setup instructions.

**Quick Start**:
```bash
# Clone repository
git clone <repository-url>
cd asx-portfolio-os

# Setup environment
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
nano .env

# Initialize database
bash setup_database.sh

# Start development server
uvicorn app.main:app --reload --port 8788
```

---

## 📚 Resources

### Internal Documentation
- [README.md](./README.md) - Project overview
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development guide
- [TESTING.md](./TESTING.md) - Testing strategy
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide

### External References
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Flow](https://docs.github.com/en/get-started/quickstart/github-flow)
- [Python PEP 8](https://peps.python.org/pep-0008/)
- [FastAPI Best Practices](https://fastapi.tiangolo.com/tutorial/)

---

## ❓ Questions or Issues?

- Check existing issues: https://github.com/Jp8617465-sys/asx-portfolio-os/issues
- Create new issue with `question` label
- Contact: Project maintainers

---

## 📄 License

See [LICENSE](./LICENSE) file for details.

---

**Thank you for contributing to ASX Portfolio OS! 🚀**
