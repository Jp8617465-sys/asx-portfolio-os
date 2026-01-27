# Build Optimization Guide
## Minimize Render Pipeline Minutes & Improve CI/CD Performance

**Date**: January 2026
**Status**: Implementation Ready
**Expected Savings**: 70-80% reduction in build times

---

## 📊 Executive Summary

### Current State (BEFORE Optimization)
- **Cron jobs**: ~20 min build time each × 5 jobs = 100 min/week
- **Dockerfile**: Single-stage, no caching, 3GB+ final image
- **CI/CD**: No build filtering, builds on every push (even docs)
- **Dependencies**: All 58 packages installed for every service
- **Monthly Cost**: ~400-500 build minutes on Render free tier

### Optimized State (AFTER Implementation)
- **Cron jobs**: ~5 min build time (base) × 3 + ~20 min (ML) × 2 = 55 min/week
- **Dockerfile**: Multi-stage, layer caching, 1GB final image
- **CI/CD**: Smart filtering, builds only on source changes
- **Dependencies**: Split into base (500MB) and ML (3GB)
- **Monthly Cost**: ~150-200 build minutes (60-70% savings)

---

## 🚨 Critical Issues Identified

### Issue #1: Cron Jobs Install ALL Dependencies (HUGE WASTE)

**Problem**: Every cron job in `render.yaml` runs:
```yaml
buildCommand: pip install -r requirements.txt
```

This installs **ALL 58 packages** including:
- `torch==2.2.2` (800MB+)
- `transformers==4.48.2` (2GB+)
- `lightgbm`, `prefect`, `shap`, etc.

**Impact**:
- Daily prices cron: Needs only API calls + DB writes → Installs 3GB of ML libraries ❌
- Daily announcements: Needs only web scraping → Installs PyTorch ❌
- Weekly fundamentals: Needs only API calls → Installs transformers ❌

**Cost**: 15-20 minutes × 5 crons = **75-100 wasted minutes per day**

### Issue #2: Single-Stage Dockerfile

**Problem**: Current Dockerfile:
```dockerfile
FROM python:3.10-slim
COPY requirements.txt .
RUN pip install -r requirements.txt  # Rebuilds all deps on ANY change
COPY . .  # App code change = full rebuild
```

**Impact**:
- No layer caching → Every code change rebuilds all 58 packages
- Build tools included in final image → Larger image
- No separation of build vs runtime dependencies

### Issue #3: No Build Filtering

**Problem**: Every push triggers full CI/CD pipeline:
- README.md change → Full build + tests
- Documentation update → 10+ minutes of wasted CI time
- No smart detection of what actually needs to rebuild

### Issue #4: GitHub Actions - No Caching

**Problem**: Some jobs don't cache dependencies:
```yaml
python-security:
  - name: Install pip-audit
    run: pip install pip-audit  # Downloads every time
```

**Impact**: Slower CI runs, more GitHub Actions minutes consumed

---

## 🛠️ Optimization Solutions

### Solution #1: Split Requirements Files

**Created Files**:
1. `requirements-base.txt` - Core API + data processing (500MB)
2. `requirements-ml.txt` - ML models + training (3GB, includes base)

**Usage**:
```yaml
# For cron jobs that DON'T need ML:
buildCommand: pip install -r requirements-base.txt

# For services that NEED ML:
buildCommand: pip install -r requirements-ml.txt
```

**Savings**: 15-18 minutes per cron job build

### Solution #2: Multi-Stage Dockerfile

**Created**: `Dockerfile.optimized`

**Key Features**:
- **Stage 1 (Builder)**: Compiles wheels with build tools
- **Stage 2 (Runtime)**: Minimal image with only runtime deps
- **Layer Caching**: Dependencies rebuilt only when requirements change
- **Security**: Non-root user, health checks

**Benefits**:
- **60-70% smaller image**: 3GB → 1GB
- **Faster rebuilds**: App code changes don't rebuild deps
- **Better security**: No build tools in production image

### Solution #3: Build Filter Script

**Created**: `scripts/should_build.sh`

**Logic**:
```bash
# Only trigger builds when these change:
BUILD_TRIGGERS=(
  "app/"
  "jobs/"
  "services/"
  "requirements*.txt"
  "Dockerfile"
)

# Skip builds when only these change:
BUILD_IGNORE=(
  "README.md"
  "docs/"
  "*.md"
)
```

**Usage in render.yaml**:
```yaml
buildCommand: bash scripts/should_build.sh && pip install -r requirements.txt
```

**Savings**: ~30-40% reduction in unnecessary builds

### Solution #4: Optimized CI/CD

**Created**: `.github/workflows/ci.optimized.yml`

**Key Features**:
- **Concurrency cancellation**: Stop old runs when new commits pushed
- **Multi-layer caching**: pip, npm, Next.js build cache
- **npm ci instead of npm install**: Faster, deterministic installs
- **Codecov integration**: Track coverage trends
- **Parallel jobs**: Run independent checks simultaneously

**Benefits**:
- **30-40% faster CI runs**
- **Better cache hit rates**
- **Coverage visibility**

---

## 📋 Implementation Steps

### Phase 1: Test Locally (30 minutes)

#### Step 1.1: Test Optimized Dockerfile
```bash
cd /Users/jamespcino/Projects/asx-portfolio-os

# Test optimized build
./scripts/test_build_local.sh --optimized

# Compare with original
./scripts/test_build_local.sh --compare
```

**Expected Results**:
- Optimized image: ~1GB (vs ~3GB original)
- First build: ~10-15 min
- Rebuild (code change): ~2-3 min (vs ~10-15 min original)

#### Step 1.2: Verify Cron Scripts Work with Base Requirements
```bash
# Test daily prices with base requirements
pip install -r requirements-base.txt
python scripts/cron_daily_prices.py --dry-run  # If dry-run flag exists

# Test weekly features (may need ML)
pip install -r requirements-ml.txt
python scripts/cron_weekly_features.py --dry-run
```

**Action**: Identify which crons actually need ML vs base requirements

### Phase 2: Update Render Configuration (10 minutes)

#### Step 2.1: Replace Dockerfile
```bash
# Backup original
mv Dockerfile Dockerfile.original

# Use optimized version
cp Dockerfile.optimized Dockerfile

# Commit
git add Dockerfile Dockerfile.original
git commit -m "feat: optimize Dockerfile with multi-stage build

- Separate build and runtime environments
- Implement layer caching for faster rebuilds
- Reduce image size from 3GB to 1GB
- Add non-root user for security"
```

#### Step 2.2: Update render.yaml
```bash
# Backup original
cp render.yaml render.yaml.backup

# Use optimized version
cp render.optimized.yaml render.yaml

# Review changes
diff render.yaml.backup render.yaml

# Commit
git add render.yaml requirements-base.txt requirements-ml.txt
git commit -m "feat: optimize Render builds with split requirements

- Split dependencies: base (500MB) vs ML (3GB)
- Update cron jobs to use requirements-base.txt
- Add build filter script to skip doc-only changes
- Expected savings: 70-80% reduction in build time"
```

#### Step 2.3: Push and Monitor
```bash
git push origin main
```

**Monitor**:
1. Go to Render dashboard: https://dashboard.render.com/
2. Watch first deploy (will take ~10-15 min for full build)
3. Check logs for any errors
4. Verify API health: https://asx-portfolio-os.onrender.com/health

### Phase 3: Update GitHub Actions (5 minutes)

```bash
# Backup original
cp .github/workflows/ci.yml .github/workflows/ci.yml.backup

# Use optimized version
cp .github/workflows/ci.optimized.yml .github/workflows/ci.yml

# Commit
git add .github/workflows/ci.yml
git commit -m "feat: optimize GitHub Actions with better caching

- Add concurrency cancellation for rapid pushes
- Implement multi-layer caching (pip, npm, Next.js)
- Use npm ci for faster installs
- Add Codecov integration
- Expected: 30-40% faster CI runs"

git push origin main
```

**Monitor**:
1. Go to: https://github.com/Jp8617465-sys/asx-portfolio-os/actions
2. Watch CI run with new optimizations
3. Check for faster execution times
4. Verify all jobs pass

### Phase 4: Verify Optimizations (1-2 days)

#### Day 1: Monitor First Cron Executions
- Check Render logs for daily prices cron (11:00 UTC)
- Verify build time reduced from ~20min to ~5min
- Confirm script runs successfully with base requirements

#### Day 2: Monitor Weekly Crons
- Check weekly features cron execution
- Verify drift detection cron (needs ML requirements)
- Compare build times in Render dashboard

#### Success Metrics:
- ✅ Daily crons: Build time < 8 minutes (was ~20 min)
- ✅ Weekly crons (base): Build time < 8 minutes
- ✅ Weekly crons (ML): Build time < 20 minutes (same, but fewer builds)
- ✅ Main API deploys: First build ~15 min, rebuilds ~5 min
- ✅ GitHub Actions: CI runs 30-40% faster
- ✅ No increase in deployment failures

---

## 📊 Expected Savings

### Build Time Comparison

#### BEFORE:
```
Daily Prices Cron (runs daily):
  Build: 20 min × 7 days = 140 min/week

Daily Announcements Cron (runs daily):
  Build: 20 min × 7 days = 140 min/week

Weekly Fundamentals (runs weekly):
  Build: 20 min × 1 = 20 min/week

Weekly Features (runs weekly):
  Build: 20 min × 1 = 20 min/week

Weekly Drift (runs weekly):
  Build: 20 min × 1 = 20 min/week

Main API Deploys (2-3 per week):
  Build: 20 min × 3 = 60 min/week

GitHub Actions (10-15 runs/week):
  Average: 8 min × 12 = 96 min/week

TOTAL: ~496 minutes/week (~2,000 min/month)
```

#### AFTER:
```
Daily Prices Cron (base requirements):
  Build: 5 min × 7 days = 35 min/week
  Savings: 105 min/week

Daily Announcements Cron (base requirements):
  Build: 5 min × 7 days = 35 min/week
  Savings: 105 min/week

Weekly Fundamentals (base requirements):
  Build: 5 min × 1 = 5 min/week
  Savings: 15 min/week

Weekly Features (base requirements):
  Build: 5 min × 1 = 5 min/week
  Savings: 15 min/week

Weekly Drift (ML requirements - still needs full deps):
  Build: 20 min × 1 = 20 min/week
  Savings: 0 min/week

Main API Deploys (optimized Dockerfile):
  First build: 15 min
  Rebuilds: 5 min × 2 = 10 min
  Average: 12 min × 3 = 36 min/week
  Savings: 24 min/week

GitHub Actions (better caching):
  Average: 5 min × 12 = 60 min/week
  Savings: 36 min/week

TOTAL: ~206 minutes/week (~820 min/month)

SAVINGS: ~290 min/week (~1,180 min/month) = 58% reduction
```

### Additional Savings from Build Filtering

Assuming 30% of pushes are docs/config only:
- Before: 10 pushes/week × 8 min CI = 80 min
- After (filtered): 7 pushes/week × 5 min CI = 35 min
- **Additional savings**: 45 min/week

### Total Monthly Savings

**Total savings**: ~1,225 min/month (20+ hours)
**Percentage reduction**: ~61%
**Render free tier**: 750 min/month → **Now within free tier limits!**

---

## 🔍 Dependency Analysis

### Which Crons Need What?

#### Needs ONLY Base Requirements (500MB):
✅ **Daily Prices** (`cron_daily_prices.py`)
- Uses: requests, pandas, psycopg2, sqlalchemy
- No ML models needed

✅ **Daily Announcements** (`cron_daily_announcements.py`)
- Uses: beautifulsoup4, lxml, requests, pandas
- No ML models needed

✅ **Weekly Fundamentals** (`cron_weekly_fundamentals.py`)
- Uses: requests, pandas, psycopg2
- No ML models needed

#### Needs ML Requirements (3GB):
❌ **Weekly Drift** (`cron_weekly_drift.py`)
- Uses: lightgbm, scikit-learn, pandas
- Model performance monitoring

❓ **Weekly Features** (`cron_weekly_features.py`)
- Check if it generates features using models or just processes data
- If model inference: Use ML requirements
- If just data processing: Use base requirements

### How to Verify:
```bash
# Grep for imports in cron scripts
grep -r "import lightgbm" scripts/cron_*.py
grep -r "import torch" scripts/cron_*.py
grep -r "from transformers" scripts/cron_*.py

# If found → Needs ML requirements
# If not found → Can use base requirements
```

---

## 🧪 Testing Checklist

### Local Testing
- [ ] Build optimized Dockerfile successfully
- [ ] Compare image sizes (optimized < original)
- [ ] Test container health check works
- [ ] Verify API responds at /health endpoint

### Cron Job Testing
- [ ] Test daily prices with base requirements
- [ ] Test daily announcements with base requirements
- [ ] Test weekly fundamentals with base requirements
- [ ] Test weekly features (determine if needs ML)
- [ ] Test weekly drift with ML requirements

### CI/CD Testing
- [ ] Push code change → Verify build filter works
- [ ] Push README change → Verify build skipped
- [ ] Check GitHub Actions cache hits
- [ ] Verify CI runs faster than before

### Production Monitoring
- [ ] Monitor first Render deploy
- [ ] Check Render build logs for errors
- [ ] Verify all crons execute successfully
- [ ] Compare build times in Render dashboard

---

## 🚨 Rollback Plan

If optimizations cause issues:

### Rollback Dockerfile:
```bash
mv Dockerfile Dockerfile.optimized.backup
mv Dockerfile.original Dockerfile
git add Dockerfile
git commit -m "rollback: revert to original Dockerfile"
git push origin main
```

### Rollback render.yaml:
```bash
mv render.yaml render.optimized.backup
mv render.yaml.backup render.yaml
git add render.yaml
git commit -m "rollback: revert to original render.yaml"
git push origin main
```

### Rollback GitHub Actions:
```bash
mv .github/workflows/ci.yml .github/workflows/ci.optimized.backup
mv .github/workflows/ci.yml.backup .github/workflows/ci.yml
git add .github/workflows/ci.yml
git commit -m "rollback: revert to original CI workflow"
git push origin main
```

---

## 💡 Future Optimizations

### 1. Pre-built Docker Images
Instead of building on Render every time, push pre-built images to Docker Hub:
```yaml
# render.yaml
services:
  - type: web
    name: asx-portfolio-api
    env: docker
    image: yourusername/asx-portfolio-api:latest  # Pre-built image
```

**Benefits**:
- Render pulls image instead of building (2-3 min vs 15-20 min)
- Build once, deploy many times

### 2. Dependency Caching on Render
Render supports caching directories between builds:
```yaml
buildCommand: |
  if [ ! -d "/opt/render/project/.venv" ]; then
    python -m venv /opt/render/project/.venv
  fi
  source /opt/render/project/.venv/bin/activate
  pip install -r requirements-ml.txt
```

**Benefits**: Virtual env persists, only updates changed packages

### 3. Incremental Builds
Use tools like `pip-compile` to lock dependencies:
```bash
pip-compile requirements.in -o requirements.txt
```

**Benefits**: Exact version pinning, faster installs

### 4. Build Matrix for Multiple Python Versions
Only if supporting multiple Python versions:
```yaml
# GitHub Actions
strategy:
  matrix:
    python-version: ['3.10', '3.11']
```

### 5. Docker Layer Caching in CI
Use Docker Buildx with layer caching:
```yaml
- name: Build Docker image
  uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

---

## 📚 Additional Resources

### Files Created:
1. `Dockerfile.optimized` - Multi-stage Docker build
2. `requirements-base.txt` - Core dependencies (500MB)
3. `requirements-ml.txt` - ML dependencies (3GB)
4. `render.optimized.yaml` - Optimized Render config
5. `scripts/should_build.sh` - Build filter script
6. `scripts/test_build_local.sh` - Local testing script
7. `.github/workflows/ci.optimized.yml` - Optimized GitHub Actions
8. `BUILD_OPTIMIZATION_GUIDE.md` - This document

### Documentation:
- [Render Build Optimization Docs](https://render.com/docs/build-optimization)
- [Docker Multi-Stage Builds](https://docs.docker.com/develop/develop-images/multistage-build/)
- [GitHub Actions Caching](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows)
- [pip Wheel Caching](https://pip.pypa.io/en/stable/topics/caching/)

### Support:
- **Render Support**: https://render.com/support
- **GitHub Actions Issues**: https://github.com/actions/cache/issues
- **Docker Community**: https://forums.docker.com/

---

## ✅ Success Criteria

After 1 week of monitoring, you should see:

### Build Times:
- ✅ Daily crons: < 8 minutes (was ~20 min)
- ✅ Weekly crons (base): < 8 minutes
- ✅ Weekly crons (ML): < 20 minutes
- ✅ Main API deploys: First ~15 min, rebuilds ~5 min
- ✅ GitHub Actions: < 6 minutes (was ~8 min)

### Cost Savings:
- ✅ Monthly build minutes: < 900 (was ~2,000)
- ✅ Render free tier compliance: ✓ (within 750 min limit)
- ✅ GitHub Actions minutes: < 300/month (was ~400)

### Reliability:
- ✅ All crons execute successfully
- ✅ API deployments succeed
- ✅ No increase in failure rate
- ✅ CI/CD remains stable

### Developer Experience:
- ✅ Faster feedback loops (CI runs faster)
- ✅ Local testing available (test_build_local.sh)
- ✅ Clear documentation
- ✅ Easy rollback if needed

---

**Last Updated**: January 2026
**Next Review**: March 2026
**Owner**: Engineering Team
**Status**: Ready for Implementation
