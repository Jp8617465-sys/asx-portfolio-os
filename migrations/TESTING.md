# Migration Testing Guide

## Overview
This guide explains how to test the database migrations before applying them to production.

## Prerequisites
- PostgreSQL 12 or higher
- `psql` command-line tool
- Database connection with CREATE/ALTER privileges
- Test database (copy of production or fresh database)

## Pre-Migration Checklist

### 1. Backup Your Database
```bash
# Create a full backup
pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d_%H%M%S).sql

# Or use pg_dump with compression
pg_dump "$DATABASE_URL" | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### 2. Verify Database Connection
```bash
psql "$DATABASE_URL" -c "SELECT version();"
```

### 3. Check Existing Schema
```bash
# List all tables
psql "$DATABASE_URL" -c "\dt"

# Check for existing foreign keys
psql "$DATABASE_URL" -c "\
SELECT tc.table_name, tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;"
```

## Migration Test Process

### Step 1: Test stock_universe Schema
```bash
# Apply stock_universe schema
psql "$DATABASE_URL" < schemas/stock_universe.sql

# Verify table created
psql "$DATABASE_URL" -c "\d stock_universe"

# Verify indexes
psql "$DATABASE_URL" -c "\di stock_universe*"
```

### Step 2: Seed Stock Universe Data
```bash
# Seed with sample data
psql "$DATABASE_URL" < migrations/seed_stock_universe.sql

# Verify data
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM stock_universe;"
psql "$DATABASE_URL" -c "SELECT ticker, company_name, sector FROM stock_universe LIMIT 10;"
```

### Step 3: Test Migration 001 (Foreign Keys)
```bash
# Before: Check for orphaned records
psql "$DATABASE_URL" -c "\
SELECT 'news_sentiment' as table_name, COUNT(*) as orphaned_count
FROM news_sentiment n
WHERE NOT EXISTS (SELECT 1 FROM stock_universe s WHERE s.ticker = n.ticker)
UNION ALL
SELECT 'fundamentals', COUNT(*)
FROM fundamentals f
WHERE NOT EXISTS (SELECT 1 FROM stock_universe s WHERE s.ticker = f.symbol)
UNION ALL
SELECT 'user_holdings', COUNT(*)
FROM user_holdings h
WHERE NOT EXISTS (SELECT 1 FROM stock_universe s WHERE s.ticker = h.ticker);"

# Apply migration
psql "$DATABASE_URL" < migrations/001_add_foreign_keys.sql

# Verify foreign keys created
psql "$DATABASE_URL" -c "\
SELECT tc.table_name, tc.constraint_name
FROM information_schema.table_constraints AS tc 
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.constraint_name LIKE 'fk_%'
ORDER BY tc.table_name;"

# Test foreign key constraint
psql "$DATABASE_URL" -c "\
-- This should fail with foreign key violation
INSERT INTO news_sentiment (ticker, title, url, published_at)
VALUES ('INVALID.AX', 'Test Article', 'http://test.com', NOW());"
```

### Step 4: Test Migration 002 (Timestamps)
```bash
# Before: Check timestamp columns
psql "$DATABASE_URL" -c "\
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name LIKE '%_at'
  AND data_type = 'timestamp without time zone'
ORDER BY table_name, column_name;"

# Apply migration
psql "$DATABASE_URL" < migrations/002_standardize_timestamps.sql

# After: Verify all are TIMESTAMPTZ
psql "$DATABASE_URL" -c "\
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name LIKE '%_at'
ORDER BY table_name, column_name;"
```

### Step 5: Test Migration 003 (Indexes)
```bash
# Before: Count existing indexes
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';"

# Apply migration
psql "$DATABASE_URL" < migrations/003_add_performance_indexes.sql

# After: Verify new indexes
psql "$DATABASE_URL" -c "\
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;"

# Test index usage with EXPLAIN
psql "$DATABASE_URL" -c "\
EXPLAIN ANALYZE
SELECT * FROM news_sentiment
WHERE ticker = 'BHP.AX'
  AND sentiment_label = 'positive'
ORDER BY published_at DESC
LIMIT 10;"
```

### Step 6: Test Migration 004 (Triggers)
```bash
# Apply migration
psql "$DATABASE_URL" < migrations/004_add_update_triggers.sql

# Verify triggers created
psql "$DATABASE_URL" -c "\
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%updated_at%'
ORDER BY event_object_table;"

# Test trigger functionality
psql "$DATABASE_URL" -c "\
-- Get current timestamp for a record
SELECT ticker, updated_at FROM stock_universe WHERE ticker = 'BHP.AX';

-- Update the record
UPDATE stock_universe SET company_name = 'BHP Group Limited' WHERE ticker = 'BHP.AX';

-- Verify updated_at changed
SELECT ticker, updated_at FROM stock_universe WHERE ticker = 'BHP.AX';"
```

## Automated Testing

### Run All Tests
```bash
bash scripts/test_migrations.sh
```

## Testing Rollback

### Test Each Rollback Script
```bash
# Test rollback 004
psql "$DATABASE_URL" < migrations/004_add_update_triggers_rollback.sql

# Test rollback 003
psql "$DATABASE_URL" < migrations/003_add_performance_indexes_rollback.sql

# Test rollback 002
psql "$DATABASE_URL" < migrations/002_standardize_timestamps_rollback.sql

# Test rollback 001
psql "$DATABASE_URL" < migrations/001_add_foreign_keys_rollback.sql
```

## Performance Testing

### Test Query Performance Before/After Indexes
```bash
# Create a test script
cat > /tmp/test_queries.sql << 'EOF'
-- Query 1: News by ticker and sentiment
EXPLAIN ANALYZE
SELECT * FROM news_sentiment
WHERE ticker = 'BHP.AX' AND sentiment_label = 'positive'
ORDER BY published_at DESC LIMIT 10;

-- Query 2: Holdings with signals
EXPLAIN ANALYZE
SELECT * FROM user_holdings
WHERE ticker = 'CBA.AX' AND current_signal = 'STRONG_BUY';

-- Query 3: Pending suggestions
EXPLAIN ANALYZE
SELECT * FROM portfolio_rebalancing_suggestions
WHERE status = 'pending' ORDER BY priority LIMIT 20;
EOF

# Run before migrations
psql "$DATABASE_URL" < /tmp/test_queries.sql > /tmp/before_migrations.log

# Apply migrations
# ... (apply migrations here)

# Run after migrations
psql "$DATABASE_URL" < /tmp/test_queries.sql > /tmp/after_migrations.log

# Compare results
diff /tmp/before_migrations.log /tmp/after_migrations.log
```

## Common Issues and Solutions

### Issue 1: Orphaned Records
**Problem**: Foreign key constraint fails due to orphaned records
**Solution**:
```sql
-- Find orphaned records in news_sentiment
SELECT ticker, COUNT(*) 
FROM news_sentiment 
WHERE ticker NOT IN (SELECT ticker FROM stock_universe)
GROUP BY ticker;

-- Option 1: Add missing tickers to stock_universe
INSERT INTO stock_universe (ticker, company_name, is_active)
SELECT DISTINCT ticker, ticker || ' Company', TRUE
FROM news_sentiment
WHERE ticker NOT IN (SELECT ticker FROM stock_universe);

-- Option 2: Delete orphaned records (use with caution!)
DELETE FROM news_sentiment
WHERE ticker NOT IN (SELECT ticker FROM stock_universe);
```

### Issue 2: Timestamp Conversion Fails
**Problem**: Invalid timestamp values prevent conversion
**Solution**:
```sql
-- Find invalid timestamps
SELECT id, created_at
FROM user_portfolios
WHERE created_at IS NULL OR created_at < '1970-01-01';

-- Fix or delete invalid records
UPDATE user_portfolios
SET created_at = NOW()
WHERE created_at IS NULL;
```

### Issue 3: Index Creation Takes Too Long
**Problem**: Large tables cause index creation to be slow
**Solution**:
```sql
-- Create indexes CONCURRENTLY (doesn't lock table)
CREATE INDEX CONCURRENTLY idx_news_ticker_sentiment 
ON news_sentiment(ticker, sentiment_label, published_at DESC);
```

## Production Deployment Checklist

- [ ] Backup database
- [ ] Test all migrations on staging database
- [ ] Verify no orphaned records
- [ ] Estimate migration time (test on production-sized data)
- [ ] Schedule maintenance window if needed
- [ ] Prepare rollback plan
- [ ] Test rollback on staging
- [ ] Monitor query performance after deployment
- [ ] Update application code if needed for new constraints

## Post-Migration Verification

```bash
# Run comprehensive verification
psql "$DATABASE_URL" << 'EOF'
-- Check all foreign keys
SELECT COUNT(*) as fk_count FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY' AND constraint_name LIKE 'fk_%';

-- Check all TIMESTAMPTZ columns
SELECT COUNT(*) as tstz_count FROM information_schema.columns
WHERE data_type = 'timestamp with time zone' AND column_name LIKE '%_at';

-- Check all indexes
SELECT COUNT(*) as idx_count FROM pg_indexes 
WHERE schemaname = 'public' AND indexname LIKE 'idx_%';

-- Check all triggers
SELECT COUNT(*) as trigger_count FROM information_schema.triggers
WHERE trigger_name LIKE '%updated_at%';
EOF
```

## Support
If you encounter issues during migration testing, refer to:
- PostgreSQL documentation: https://www.postgresql.org/docs/
- schemas/README.md for migration details
- Individual migration files for specific implementation details
