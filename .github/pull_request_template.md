## Description

<!-- Provide a clear and concise description of the changes -->

**What changed:**


**Why this change was needed:**


**Related Issue/Ticket:**
<!-- e.g., Closes #123, Ref: PROJ-456 -->

---

## Type of Change

<!-- Check the type that applies to this PR -->

- [ ] `feature/` - New functionality or enhancement
- [ ] `bugfix/` - Bug fix for existing features
- [ ] `hotfix/` - Urgent production fix
- [ ] `refactor/` - Code restructuring without behavior changes
- [ ] `model/` - ML model architecture or training changes
- [ ] `data/` - Data pipeline or feature engineering changes
- [ ] `experiment/` - Research experiment
- [ ] `performance/` - Performance optimization
- [ ] `signal/` - Trading signal generation logic
- [ ] `docs/` - Documentation only
- [ ] `test/` - Test additions or updates

---

## Testing Checklist

### General Testing (Required for All PRs)

- [ ] All unit tests pass locally: `pytest tests/ -v`
- [ ] New tests added for new functionality
- [ ] Code follows style guidelines (PEP 8 for Python, ESLint for TypeScript)
- [ ] No linting errors
- [ ] Documentation updated (if applicable)

### Model Changes (Required for `model/` prefix)

- [ ] Walk-forward validation performed
- [ ] ROC-AUC score >= baseline (current: 60.3%)
- [ ] Model artifacts saved to `outputs/models/`
- [ ] Feature importance analysis completed and reviewed
- [ ] No data leakage verified via `python3 jobs/validate_no_leakage.py`
- [ ] Model performance documented in PR description

**Model Performance Metrics:**
```
ROC-AUC: ___%
Sharpe Ratio: ___
Max Drawdown: ___%
Training Period: YYYY-MM-DD to YYYY-MM-DD
Validation Period: YYYY-MM-DD to YYYY-MM-DD
```

### Data Changes (Required for `data/` prefix)

- [ ] Time series integrity validated via `python3 scripts/validate_time_series.py`
- [ ] No look-ahead bias introduced
- [ ] Feature distributions checked for drift
- [ ] Historical data not modified (append-only principle)
- [ ] Data quality checks pass
- [ ] Feature engineering is reproducible and deterministic

**Data Validation:**
```
Date Range: YYYY-MM-DD to YYYY-MM-DD
Number of Symbols: ___
Number of Features: ___
Missing Data %: ___%
```

### Signal Changes (Required for `signal/` prefix)

- [ ] Backtest performed on historical data
- [ ] Sharpe ratio >= baseline (specify baseline: ___)
- [ ] Maximum drawdown within tolerance (<30%)
- [ ] Signal distribution analyzed (no extreme skew)
- [ ] Correlation with existing signals checked
- [ ] Signal logic is deterministic and documented

**Signal Performance:**
```
Backtest Period: YYYY-MM-DD to YYYY-MM-DD
Sharpe Ratio: ___
Max Drawdown: ___%
Win Rate: ___%
Average Signal Distribution: [STRONG_BUY: __%, BUY: __%, HOLD: __%, SELL: __%, STRONG_SELL: ___%]
```

### API Changes (Required for `feature/` or `bugfix/` with API changes)

- [ ] API documentation updated (OpenAPI/Swagger)
- [ ] Authentication/authorization verified
- [ ] Rate limiting tested
- [ ] Error handling comprehensive (4xx, 5xx responses)
- [ ] Integration tests added
- [ ] Backward compatibility maintained (or breaking changes documented)

### Database Changes (if applicable)

- [ ] Migration script created (in `schemas/migrations/`)
- [ ] Migration tested on development database
- [ ] Rollback script created
- [ ] No data loss risk
- [ ] Indexes added for new queries
- [ ] Foreign key constraints validated

### Frontend Changes (if applicable)

- [ ] Component tests added
- [ ] Responsive design verified (mobile, tablet, desktop)
- [ ] Accessibility checked (WCAG 2.1 AA)
- [ ] No console errors or warnings
- [ ] Loading states handled
- [ ] Error states handled

---

## Data Integrity & Security Checklist

<!-- Critical for quantitative trading platform -->

### Data Integrity

- [ ] No data leakage from future to past
- [ ] All timestamps are timezone-aware (UTC)
- [ ] Time series ordering preserved
- [ ] Financial calculations are deterministic
- [ ] No off-by-one errors in date ranges
- [ ] Historical data immutability maintained

### Security

- [ ] No hardcoded API keys or secrets
- [ ] All user inputs validated
- [ ] SQL queries use parameterized statements
- [ ] File uploads sanitized (if applicable)
- [ ] Rate limiting implemented (for new endpoints)
- [ ] Authentication required (for protected endpoints)
- [ ] No sensitive data in logs

---

## Screenshots (if applicable)

<!-- For UI changes, add before/after screenshots -->

**Before:**


**After:**


---

## Performance Impact

<!-- Describe any performance implications -->

- [ ] No significant performance degradation
- [ ] Database query performance tested (if applicable)
- [ ] API response time within acceptable range (<500ms for most endpoints)
- [ ] Memory usage acceptable
- [ ] No N+1 query problems

**Performance Metrics (if applicable):**
```
API Response Time: ___ ms (before: ___ ms)
Database Query Time: ___ ms (before: ___ ms)
Memory Usage: ___ MB (before: ___ MB)
```

---

## Deployment Notes

<!-- Any special deployment considerations -->

**Database migrations required?**
- [ ] Yes - migration script: `schemas/migrations/YYYY_MM_DD_description.sql`
- [ ] No

**Environment variables added/changed?**
- [ ] Yes - document in `.env.example`
- [ ] No

**Backward compatibility:**
- [ ] Fully backward compatible
- [ ] Breaking change (requires coordinated deployment)

**Post-deployment verification:**
<!-- List any manual checks needed after deployment -->
- [ ] Check health endpoint: `GET /health`
- [ ] Verify signal generation: `GET /signals/live`
- [ ] Monitor error logs for 24 hours
- [ ] Other: ___

---

## Rollback Plan

<!-- Describe how to rollback if this PR causes issues -->

**If this deployment causes issues:**
1. 
2. 
3. 

---

## Reviewer Checklist

<!-- For reviewers to complete during code review -->

### Code Quality
- [ ] Code is readable and well-documented
- [ ] No unnecessary complexity
- [ ] Error handling is comprehensive
- [ ] Logging is appropriate and informative
- [ ] No commented-out code or debug statements

### Testing
- [ ] Tests cover new functionality
- [ ] Tests are deterministic (no flaky tests)
- [ ] Edge cases handled
- [ ] Test names are descriptive

### Data Integrity (for model/data/signal changes)
- [ ] No data leakage verified
- [ ] Time series integrity maintained
- [ ] Feature engineering is reproducible
- [ ] Financial calculations documented

### Documentation
- [ ] README updated (if needed)
- [ ] API documentation updated (if endpoints changed)
- [ ] Inline comments for complex logic
- [ ] Commit messages follow Conventional Commits format

---

## Additional Context

<!-- Any additional information that reviewers should know -->


---

## Pre-Merge Checklist

<!-- Complete before merging -->

- [ ] All CI checks pass ✅
- [ ] At least 1 approval received
- [ ] All review comments addressed
- [ ] Conflicts resolved
- [ ] Branch is up to date with `main`
- [ ] Commit messages follow Conventional Commits format
- [ ] No `WIP` or `TODO` comments in production code

---

**By submitting this PR, I confirm:**
- [ ] I have read and followed the [CONTRIBUTING.md](../CONTRIBUTING.md) guidelines
- [ ] My changes maintain data integrity and prevent data leakage
- [ ] All financial calculations are deterministic and documented
- [ ] The main branch will remain stable and deployable after this merge
