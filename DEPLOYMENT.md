# ASX Portfolio OS - Deployment Guide

**Last Updated**: January 29, 2026
**Version**: 0.5.0

---

## TABLE OF CONTENTS

1. [Local Development Setup](#local-development-setup)
2. [Production Deployment](#production-deployment)
3. [Database Migrations](#database-migrations)
4. [Environment Variables](#environment-variables)
5. [Scheduled Jobs](#scheduled-jobs)
6. [Troubleshooting](#troubleshooting)

---

## LOCAL DEVELOPMENT SETUP

### Prerequisites

- **Python**: 3.10 or higher
- **Node.js**: 18 or higher
- **PostgreSQL**: 15 or higher
- **Docker** (optional): For containerized setup
- **EODHD API Key**: Sign up at https://eodhd.com

### Option 1: Docker Compose (Recommended)

**1. Clone Repository**:
```bash
git clone <repository-url>
cd asx-portfolio-os
```

**2. Create Environment File**:
```bash
cp .env.example .env

# Edit .env and set:
# - EODHD_API_KEY (required)
# - OS_API_KEY (any secure string)
# - JWT_SECRET_KEY (generate with: openssl rand -hex 32)
```

**3. Start All Services**:
```bash
docker-compose up -d
```

**4. Apply Database Schemas**:
```bash
docker-compose exec backend python3 scripts/apply_user_schema.py
docker-compose exec backend python3 scripts/apply_notification_schema.py
docker-compose exec backend python3 scripts/apply_portfolio_schema.py
```

**5. Access Application**:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8788
- API Docs: http://localhost:8788/docs

**6. Login**:
- Username: `demo_user`
- Password: `testpass123`

### Option 2: Manual Setup

**1. Install Python Dependencies**:
```bash
python3 -m pip install -r requirements.txt
```

**2. Set Up PostgreSQL Database**:
```bash
# Create database
createdb asx_portfolio_os

# Set DATABASE_URL in .env
echo "DATABASE_URL=postgresql://localhost:5432/asx_portfolio_os" >> .env
```

**3. Apply Database Schemas**:
```bash
python3 scripts/apply_user_schema.py
python3 scripts/apply_notification_schema.py
python3 scripts/apply_portfolio_schema.py
```

**4. Start Backend**:
```bash
uvicorn app.main:app --port 8788 --reload
```

**5. Install Frontend Dependencies**:
```bash
cd frontend
npm install
```

**6. Start Frontend**:
```bash
npm run dev
```

**7. Access Application**:
- Frontend: http://localhost:3000
- Backend: http://localhost:8788

---

## PRODUCTION DEPLOYMENT

### Render.com Deployment (Current)

**Backend Service**:
```yaml
Service Type: Web Service
Build Command: pip install -r requirements.txt
Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

**Environment Variables**:
```bash
DATABASE_URL=<supabase-postgres-url>
EODHD_API_KEY=<your-key>
OS_API_KEY=<secure-random-string>
JWT_SECRET_KEY=<openssl rand -hex 32>
ENABLE_ASSISTANT=false
```

**Frontend Service**:
```yaml
Service Type: Static Site
Build Command: cd frontend && npm install && npm run build
Publish Directory: frontend/out
```

### Docker Production Deployment

**1. Build Images**:
```bash
# Backend
docker build -t asx-backend:latest .

# Frontend
docker build -t asx-frontend:latest ./frontend
```

**2. Run with Docker Compose**:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

**3. Configure Reverse Proxy** (Nginx/Caddy):
```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    location /api {
        proxy_pass http://backend:8788;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
    }
}
```

### Cloud Deployment Options

#### AWS
- **Compute**: ECS Fargate or EC2
- **Database**: RDS PostgreSQL
- **Storage**: S3 for outputs/logs
- **Load Balancer**: ALB

#### Google Cloud Platform
- **Compute**: Cloud Run
- **Database**: Cloud SQL PostgreSQL
- **Storage**: Cloud Storage

#### Azure
- **Compute**: Container Instances
- **Database**: Azure Database for PostgreSQL
- **Storage**: Blob Storage

---

## DATABASE MIGRATIONS

### Initial Schema Setup

Apply schemas in this order:

```bash
# 1. User authentication
python3 scripts/apply_user_schema.py

# 2. Notifications
python3 scripts/apply_notification_schema.py

# 3. Portfolio management
python3 scripts/apply_portfolio_schema.py
```

### Schema Updates

When updating schemas:

**1. Create Migration Script**:
```python
# scripts/migrate_<feature>_<date>.py
from app.core import db_context

def migrate():
    with db_context() as conn:
        cur = conn.cursor()

        # Add your migration SQL here
        cur.execute("""
            ALTER TABLE user_holdings
            ADD COLUMN IF NOT EXISTS new_column VARCHAR(50);
        """)

        conn.commit()
        print("✅ Migration complete")

if __name__ == "__main__":
    migrate()
```

**2. Test Migration**:
```bash
# Test on local database first
python3 scripts/migrate_<feature>_<date>.py
```

**3. Apply to Production**:
```bash
# Backup database first!
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Run migration
python3 scripts/migrate_<feature>_<date>.py
```

### Backup and Restore

**Backup Database**:
```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

**Restore Database**:
```bash
psql $DATABASE_URL < backup_20260129_120000.sql
```

**Automated Backups** (Recommended):
```bash
# Add to crontab
0 2 * * * pg_dump $DATABASE_URL > /backups/asx_$(date +\%Y\%m\%d).sql
```

---

## ENVIRONMENT VARIABLES

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `EODHD_API_KEY` | EOD Historical Data API key | `demo` or your key |
| `OS_API_KEY` | API key for endpoint protection | `SecureKey123!` |
| `JWT_SECRET_KEY` | Secret for JWT token signing | Generate with `openssl rand -hex 32` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ENABLE_ASSISTANT` | Enable AI assistant features | `false` |
| `OPENAI_API_KEY` | OpenAI API key (if assistant enabled) | - |
| `SENTRY_DSN` | Sentry error tracking DSN | - |
| `MODEL_VERSION` | Model version identifier | `v1_2` |
| `LOOKBACK_MONTHS` | Training data lookback period | `36` |
| `CV_FOLDS` | Cross-validation folds | `12` |
| `BATCH_SIZE` | Batch size for data fetching | `100` |
| `EODHD_THROTTLE_S` | Throttle delay for EODHD API | `1.2` |

### Generating Secrets

**JWT Secret Key**:
```bash
openssl rand -hex 32
```

**API Key**:
```bash
openssl rand -base64 32
```

**Add to .env**:
```bash
echo "JWT_SECRET_KEY=$(openssl rand -hex 32)" >> .env
echo "OS_API_KEY=$(openssl rand -base64 32)" >> .env
```

---

## SCHEDULED JOBS

### Daily Jobs (Run via Cron or Scheduler)

**1. Refresh Prices** (Run at 6 AM daily):
```bash
0 6 * * * cd /app && python3 jobs/sync_live_prices_job.py >> logs/price_sync.log 2>&1
```

**2. Generate Model B Signals** (Run at 7 AM daily):
```bash
0 7 * * * cd /app && python3 jobs/generate_signals_model_b.py >> logs/model_b.log 2>&1
```

**3. Generate Ensemble Signals** (Run at 7:30 AM daily):
```bash
30 7 * * * cd /app && python3 jobs/generate_ensemble_signals.py >> logs/ensemble.log 2>&1
```

**4. Sync Portfolio Prices** (Run at 8 AM daily):
```bash
0 8 * * * cd /app && python3 -c "from app.core import db_context; \
  with db_context() as conn: \
    cur = conn.cursor(); \
    cur.execute('SELECT sync_all_portfolio_prices()'); \
    print('✅ All portfolios synced')" >> logs/portfolio_sync.log 2>&1
```

### Weekly Jobs

**Model Retraining** (Run Sunday at 2 AM):
```bash
0 2 * * 0 cd /app && python3 jobs/run_model_a_job.py >> logs/model_a_training.log 2>&1
```

**Database Vacuum** (Run Saturday at 3 AM):
```bash
0 3 * * 6 psql $DATABASE_URL -c "VACUUM ANALYZE;" >> logs/vacuum.log 2>&1
```

### Using Prefect (Optional)

**Install Prefect**:
```bash
pip install prefect
```

**Create Deployment**:
```python
from prefect import flow
from prefect.deployments import Deployment
from datetime import timedelta

@flow
def daily_price_sync():
    import subprocess
    subprocess.run(["python3", "jobs/sync_live_prices_job.py"])

deployment = Deployment.build_from_flow(
    flow=daily_price_sync,
    name="daily-price-sync",
    interval=timedelta(days=1),
)
deployment.apply()
```

---

## TROUBLESHOOTING

### Common Issues

#### Database Connection Refused

**Problem**: `psycopg2.OperationalError: connection refused`

**Solution**:
```bash
# Check if PostgreSQL is running
pg_isready

# Check DATABASE_URL is correct
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

#### API Key Authentication Fails

**Problem**: `401 Unauthorized`

**Solution**:
```bash
# Check OS_API_KEY matches in .env and request header
echo $OS_API_KEY

# Test with curl
curl -H "x-api-key: $OS_API_KEY" http://localhost:8788/health
```

#### JWT Token Invalid

**Problem**: `401 Invalid authentication credentials`

**Solution**:
```bash
# Generate new JWT_SECRET_KEY
openssl rand -hex 32 > jwt_secret.txt

# Update .env
echo "JWT_SECRET_KEY=$(cat jwt_secret.txt)" >> .env

# Restart API server
```

#### Schema Not Applied

**Problem**: `Table does not exist`

**Solution**:
```bash
# Apply all schemas
python3 scripts/apply_user_schema.py
python3 scripts/apply_notification_schema.py
python3 scripts/apply_portfolio_schema.py

# Verify tables exist
python3 -c "from app.core import db_context; \
  with db_context() as conn: \
    cur = conn.cursor(); \
    cur.execute(\"SELECT tablename FROM pg_tables WHERE schemaname='public'\"); \
    print([row[0] for row in cur.fetchall()])"
```

#### No Price Data

**Problem**: Holdings show N/A for prices

**Solution**:
```bash
# Refresh price data
curl -X POST http://localhost:8788/refresh/prices/last_day \
  -H "x-api-key: $OS_API_KEY"

# Sync portfolio prices
python3 -c "from app.core import db_context; \
  with db_context() as conn: \
    cur = conn.cursor(); \
    cur.execute('SELECT sync_all_portfolio_prices()'); \
    conn.commit(); \
    print('✅ Portfolios synced')"
```

#### Frontend Can't Reach Backend

**Problem**: Network errors in browser console

**Solution**:
```bash
# Check NEXT_PUBLIC_API_URL in frontend/.env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8788" > frontend/.env.local

# Restart frontend
cd frontend && npm run dev
```

### Health Checks

**API Health**:
```bash
curl http://localhost:8788/health
```

**Database Health**:
```bash
python3 -c "from app.core import db_context; \
  with db_context() as conn: \
    cur = conn.cursor(); \
    cur.execute('SELECT 1'); \
    print('✅ Database OK')"
```

**Authentication Health**:
```bash
curl -X POST http://localhost:8788/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"demo_user","password":"testpass123"}'
```

### Logs

**View API Logs**:
```bash
tail -f logs/model_a.log
```

**View Job Logs**:
```bash
tail -f logs/price_sync.log
tail -f logs/model_b.log
tail -f logs/ensemble.log
```

**View Docker Logs**:
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

---

## SECURITY CHECKLIST

### Production Deployment

- [ ] Generate strong `JWT_SECRET_KEY` (32+ hex characters)
- [ ] Generate strong `OS_API_KEY` (32+ characters)
- [ ] Use secure PostgreSQL password
- [ ] Enable HTTPS/TLS for all endpoints
- [ ] Set `ENABLE_ASSISTANT=false` if not using OpenAI
- [ ] Configure rate limiting (100 req/min default)
- [ ] Enable Sentry error tracking
- [ ] Set up database backups (daily minimum)
- [ ] Restrict database access (firewall rules)
- [ ] Use environment-specific .env files
- [ ] Never commit .env to version control

### API Security

- [ ] All endpoints except /health require authentication
- [ ] JWT tokens expire after 30 days
- [ ] Passwords hashed with bcrypt
- [ ] SQL injection protected (parameterized queries)
- [ ] Input validation on all endpoints
- [ ] CORS configured appropriately

---

## MONITORING

### Key Metrics to Monitor

**API Metrics**:
- Request rate (requests/minute)
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Authentication failures

**Database Metrics**:
- Connection pool utilization
- Query performance
- Table sizes
- Index usage

**Job Metrics**:
- Price sync success rate
- Signal generation time
- Model training duration
- Failed job count

### Sentry Integration

**Enable Sentry**:
```bash
pip install sentry-sdk

# Add to .env
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

**Sentry automatically captures**:
- API errors (500, 502, 503)
- Database errors
- Job failures
- Performance metrics

---

## MAINTENANCE

### Daily

- Monitor job execution logs
- Check error rates in Sentry
- Verify price sync successful
- Review signal generation metrics

### Weekly

- Database vacuum and analyze
- Review disk space usage
- Check for failed jobs
- Monitor API performance

### Monthly

- Model retraining
- Database backup verification
- Security updates
- Dependency updates

---

## ROLLBACK PROCEDURES

### API Rollback

**Docker**:
```bash
docker-compose down
docker pull <previous-image-tag>
docker-compose up -d
```

**Render.com**:
- Go to service dashboard
- Select previous deployment
- Click "Rollback to this version"

### Database Rollback

**Restore from Backup**:
```bash
# Stop API services
docker-compose stop backend

# Restore database
psql $DATABASE_URL < backup_20260128_120000.sql

# Restart services
docker-compose start backend
```

### Schema Rollback

**Create Down Migration**:
```sql
-- down_migration_<feature>.sql
ALTER TABLE user_holdings DROP COLUMN IF EXISTS new_column;
```

**Apply**:
```bash
psql $DATABASE_URL -f down_migration_<feature>.sql
```

---

## PERFORMANCE OPTIMIZATION

### Database Optimization

**1. Analyze Query Performance**:
```sql
-- Enable query timing
\timing

-- Analyze slow queries
EXPLAIN ANALYZE SELECT * FROM user_holdings WHERE portfolio_id = 1;
```

**2. Add Indexes** (if needed):
```sql
-- Create index on frequently queried columns
CREATE INDEX idx_user_holdings_current_signal ON user_holdings(current_signal);
```

**3. Vacuum Regularly**:
```bash
# Run weekly
psql $DATABASE_URL -c "VACUUM ANALYZE;"
```

### API Optimization

**1. Enable Caching** (future):
```python
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
```

**2. Connection Pooling** (already configured):
- Min connections: 2
- Max connections: 10

**3. Rate Limiting** (already configured):
- Default: 100 requests/minute

---

## SUPPORT

### Getting Help

- **Issues**: https://github.com/<your-repo>/issues
- **Documentation**: See README.md, QUICKSTART.md
- **Logs**: Check logs/ directory
- **Health Status**: http://localhost:8788/health

### Useful Commands

**Check All Services**:
```bash
docker-compose ps
```

**Restart Single Service**:
```bash
docker-compose restart backend
```

**View Database Tables**:
```bash
psql $DATABASE_URL -c "\dt"
```

**Count Records**:
```bash
python3 -c "from app.core import db_context; \
  with db_context() as conn: \
    for table in ['user_accounts', 'user_portfolios', 'user_holdings', 'notifications']: \
      cur = conn.cursor(); \
      cur.execute(f'SELECT COUNT(*) FROM {table}'); \
      print(f'{table}: {cur.fetchone()[0]} rows')"
```
