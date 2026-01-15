# Phase 8 Deployment Checklist

## ✅ Development Complete (January 15, 2026)

### Backend Infrastructure
- [x] Portfolio Fusion endpoints (`/portfolio/overview`, `/risk`, `/allocation`)
- [x] Job History tracking (`/jobs/history`, `/summary`, `/health`)
- [x] Drift Monitoring API (`/drift/summary`, `/features`, `/history`)
- [x] RL Environment scaffold (custom Gym environment)
- [x] SHAP Explainability module

### Database Schemas
- [x] `portfolio_fusion.sql` - Unified portfolio metrics
- [x] `job_history.sql` - Pipeline execution tracking
- [x] `rl_experiments.sql` - RL training runs
- [x] `rl_episodes.sql` - Episode performance

### Jobs & Pipelines
- [x] `portfolio_fusion_job.py` - Compute unified metrics
- [x] `train_rl_agent.py` - RL training scaffold
- [x] Job tracker integration in existing jobs

### Frontend Components
- [x] `PortfolioFusionClient.tsx` - Portfolio overview UI
- [x] `DriftMonitorClient.tsx` - Drift visualization
- [x] `JobHistoryClient.tsx` - Job monitoring dashboard

### Documentation
- [x] Updated README.md with new features
- [x] Created PHASE_8_SUMMARY.md
- [x] Updated requirements.txt with RL dependencies (commented)

---

## 🚀 Deployment Steps

### 1. Apply Database Schemas
```bash
# From project root
python3 apply_schemas.py

# Or manually apply:
# - schemas/portfolio_fusion.sql
# - schemas/job_history.sql
# - schemas/rl_experiments.sql
```

**Verify:**
```sql
SELECT COUNT(*) FROM portfolio_fusion;
SELECT COUNT(*) FROM job_history;
SELECT COUNT(*) FROM rl_experiments;
```

### 2. Update Render Configuration

**Environment Variables to Add:**
```ini
# Already set (verify):
DATABASE_URL=postgresql://...
EODHD_API_KEY=...
NEWS_API_KEY=...
OS_API_KEY=...
OPENAI_API_KEY=... (optional - assistant feature paused)

# Optional for Phase 8:
ENABLE_RL_TRAINING=false
RL_CHECKPOINT_DIR=/opt/render/project/src/models/rl/
```

**Deploy Backend:**
1. Push code to GitHub main branch
2. Render auto-deploys (or trigger manual deploy)
3. Wait for build to complete
4. Check deployment logs

**Verify Endpoints:**
```bash
# Test locally first
curl http://localhost:8788/health
curl http://localhost:8788/portfolio/overview -H "x-api-key: YOUR_KEY"
curl http://localhost:8788/jobs/summary -H "x-api-key: YOUR_KEY"
curl http://localhost:8788/drift/summary -H "x-api-key: YOUR_KEY"

# Then test production
curl https://your-render-app.onrender.com/health
```

### 3. Update Vercel Frontend

**Environment Variables:**
```ini
NEXT_PUBLIC_API_URL=https://your-render-app.onrender.com
NEXT_PUBLIC_OS_API_KEY=your_api_key
```

**Deploy:**
1. Push frontend changes to GitHub
2. Vercel auto-deploys
3. Clear cache if needed
4. Verify new components load

**Test Frontend:**
- Navigate to `/portfolio` (if route added)
- Navigate to `/drift` (if route added)
- Navigate to `/jobs` (if route added)

### 4. Run Initial Jobs

**Portfolio Fusion:**
```bash
# SSH into Render or run locally
python3 jobs/portfolio_fusion_job.py
```

**Verify:**
```bash
curl https://your-api.com/portfolio/overview -H "x-api-key: KEY"
```

**Job History (automatic):**
- Job tracking happens automatically via context manager
- Check: `GET /jobs/history`

**Drift Monitoring:**
```bash
# Run existing drift audit
python3 jobs/audit_drift_job.py

# Verify
curl https://your-api.com/drift/summary -H "x-api-key: KEY"
```

### 5. Schedule Jobs (Optional)

**Using Render Cron Jobs:**
Add to `render.yaml`:
```yaml
services:
  - type: web
    name: asx-portfolio-os
    # ... existing config ...
    
  - type: cron
    name: portfolio-fusion-daily
    plan: starter
    schedule: "0 2 * * *"  # Daily at 2 AM UTC
    buildCommand: pip install -r requirements.txt
    startCommand: python3 jobs/portfolio_fusion_job.py
```

**Or use Prefect (if installed):**
```python
from prefect import flow

@flow
def portfolio_fusion_flow():
    from jobs.portfolio_fusion_job import compute_portfolio_fusion
    compute_portfolio_fusion()

if __name__ == "__main__":
    portfolio_fusion_flow()
```

---

## 🧪 Testing Checklist

### API Endpoints
- [ ] `GET /health` returns 200
- [ ] `GET /portfolio/overview` returns data
- [ ] `GET /portfolio/risk` returns risk metrics
- [ ] `GET /jobs/history` returns job list
- [ ] `GET /jobs/summary` returns statistics
- [ ] `GET /drift/summary` returns drift data
- [ ] All endpoints require API key (except /health)

### Job Execution
- [ ] `portfolio_fusion_job.py` runs without errors
- [ ] Job creates record in `job_history` table
- [ ] Job creates record in `portfolio_fusion` table
- [ ] Error handling works (test with invalid data)

### Frontend
- [ ] Portfolio overview loads and displays data
- [ ] Drift monitor shows alerts correctly
- [ ] Job history table populates
- [ ] Charts and visualizations render
- [ ] Responsive design works on mobile

---

## 🔧 Troubleshooting

### Database Connection Issues
```python
# Test connection
import os
import psycopg2

conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cursor = conn.cursor()
cursor.execute("SELECT version();")
print(cursor.fetchone())
```

### Missing Tables
```bash
# Re-apply schemas
python3 apply_schemas.py

# Or check if tables exist:
# SELECT table_name FROM information_schema.tables WHERE table_schema='public';
```

### Job Tracker Not Working
```python
# Verify table exists
SELECT COUNT(*) FROM job_history;

# Check recent jobs
SELECT * FROM job_history ORDER BY started_at DESC LIMIT 10;
```

### RL Training Fails
```bash
# Install dependencies
pip install gymnasium stable-baselines3

# Test environment
python3 -c "from analytics.rl_environment import ASXPortfolioEnv; print('OK')"
```

---

## 📊 Monitoring & Alerts

### Key Metrics to Track

**Portfolio Health:**
- Net worth trending up/down
- Risk score < 60 (healthy)
- Debt service ratio < 30%

**Job Health:**
- Success rate > 95%
- No stuck jobs (running > 2 hours)
- Average duration stable

**Model Health:**
- Drift alerts < 5% of features
- PSI scores < 0.2 for critical features
- Prediction confidence > 70%

### Set Up Alerts (Manual)
1. Check `/jobs/health` daily
2. Check `/drift/summary` after each audit
3. Monitor `/portfolio/risk` for risk score spikes

### Future: Automated Alerts
- Implement webhook notifications
- Send Slack/email alerts for failures
- Dashboard for real-time monitoring

---

## 🎯 Next Priorities (Post-Deployment)

### Immediate (Week 1):
1. Verify all schemas applied correctly
2. Run portfolio fusion job successfully
3. Confirm frontend components display data
4. Schedule daily portfolio refresh

### Short-term (Month 1):
1. Add meta-model ensemble (combine A/B/C)
2. Implement regime classification
3. Build Monte Carlo simulator
4. Create continuous training pipeline

### Medium-term (Quarter 1):
1. Deploy RL agent to production
2. Add multi-asset support (ETFs, options)
3. Implement real-time streaming
4. Build automated rebalancing

### Long-term (2026):
1. Expand to international markets
2. Add options and derivatives
3. Implement crypto integration
4. Build social trading features

---

## 📝 Notes

- **Assistant Feature:** Currently paused (OPENAI_API_KEY not required)
- **RL Training:** Requires additional packages (see requirements.txt)
- **SHAP Plots:** Need manual generation (see PHASE_8_SUMMARY.md)
- **Property Module:** Deferred until data feed available

---

## ✅ Sign-Off

- [ ] All schemas applied
- [ ] Backend deployed to Render
- [ ] Frontend deployed to Vercel
- [ ] Initial jobs executed successfully
- [ ] API endpoints tested and working
- [ ] Frontend components rendering correctly
- [ ] Documentation updated
- [ ] Team notified of new features

**Date:** _______________
**Deployed by:** _______________
**Version:** 0.4.0
