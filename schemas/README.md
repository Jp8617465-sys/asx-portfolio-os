# Database Schema Documentation

## Overview
This directory contains the database schema definitions for the ASX Portfolio OS application. The schemas are designed to support multi-user portfolio management, AI-driven trading signals, news sentiment analysis, and real-time portfolio tracking.

## Schema Files

### Core Tables
- **`user_accounts.sql`** - User authentication and settings
  - `user_accounts` - User login credentials and profile
  - `user_preferences` - User-specific application preferences
  - `user_settings` - General user settings (JSONB key-value store)
  
- **`notifications.sql`** - User notifications and alerts
  - `notifications` - System and signal notifications
  - `alert_preferences` - User-configurable alert settings

- **`portfolio_management.sql`** - Portfolio and holdings management
  - `user_portfolios` - Portfolio metadata with aggregated values
  - `user_holdings` - Individual stock positions with live prices and signals
  - `portfolio_rebalancing_suggestions` - AI-driven rebalancing recommendations
  - `portfolio_risk_metrics` - Risk and return metrics per portfolio

- **`watchlist.sql`** - User watchlists
  - User-defined stock watchlists for monitoring

- **`stock_universe.sql`** - **NEW** Canonical stock reference table
  - `stock_universe` - Master table for all stock tickers with company metadata
  - Enforces data integrity via foreign keys

### Data Tables
- **`fundamentals.sql`** - Financial fundamentals data
  - Company financial metrics (P/E, EPS, ROE, debt ratios, etc.)

- **`news_sentiment.sql`** - News sentiment analysis
  - News articles with sentiment scores for Model C

### AI Signal Tables
- **`model_a_ml_signals.sql`** - Model A machine learning signals
  - ML-based trading signals with confidence scores

- **`model_b_ml_signals.sql`** - Model B quality score signals
  - Stock quality grades (A, B, C, D, F)

- **`model_c_sentiment_signals.sql`** - Model C sentiment-based signals
  - Trading signals derived from news sentiment analysis

- **`ensemble_signals.sql`** - Combined ensemble signals
  - Aggregated signals from multiple models

### Supporting Tables
- **`job_history.sql`** - Background job tracking
- **`model_a_drift_audit.sql`** - Model drift monitoring
- **`model_a_features_extended.sql`** - Extended feature set for Model A
- **`model_feature_importance.sql`** - Feature importance tracking
- **`portfolio_attribution.sql`** - Portfolio performance attribution
- **`portfolio_fusion.sql`** - Portfolio fusion and aggregation

### Utility Scripts
- **`add_indexes.sql`** - Additional performance indexes
- **`cleanup_unused_tables.sql`** - Remove deprecated tables

## Migration Strategy

### Migration Files
Migrations are located in the `../migrations/` directory and should be applied in numerical order:

1. **`001_add_foreign_keys.sql`** - Adds foreign key constraints linking all ticker references to `stock_universe`
2. **`002_standardize_timestamps.sql`** - Converts all TIMESTAMP columns to TIMESTAMPTZ for timezone awareness
3. **`003_add_performance_indexes.sql`** - Adds indexes for frequently queried columns
4. **`004_add_update_triggers.sql`** - Ensures all tables have triggers for `updated_at` columns

Each migration has a corresponding `_rollback.sql` script for reverting changes if needed.

### Migration Rules
- **Idempotent**: All migrations can be safely run multiple times
- **Order matters**: Run migrations in numerical order (001 → 002 → 003 → 004)
- **Always backup**: Backup your database before running migrations
- **Test first**: Test migrations on a copy of production data

## Applying Schemas and Migrations

### Initial Setup (Fresh Database)
```bash
# 1. Set your database connection
export DATABASE_URL="postgresql://user:password@host:port/database"

# 2. Run the setup script (applies core schemas)
bash setup_database.sh

# 3. Apply stock_universe schema
psql "$DATABASE_URL" < schemas/stock_universe.sql

# 4. Apply migrations in order
psql "$DATABASE_URL" < migrations/001_add_foreign_keys.sql
psql "$DATABASE_URL" < migrations/002_standardize_timestamps.sql
psql "$DATABASE_URL" < migrations/003_add_performance_indexes.sql
psql "$DATABASE_URL" < migrations/004_add_update_triggers.sql
```

### Applying Individual Migration
```bash
# Run a specific migration
psql "$DATABASE_URL" < migrations/001_add_foreign_keys.sql

# Rollback if needed
psql "$DATABASE_URL" < migrations/001_add_foreign_keys_rollback.sql
```

### Verifying Migrations
```bash
# Check which tables exist
psql "$DATABASE_URL" -c "\dt"

# Check foreign keys
psql "$DATABASE_URL" -c "\
SELECT
    tc.table_name, 
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, tc.constraint_name;"

# Check timestamp types
psql "$DATABASE_URL" -c "\
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name LIKE '%_at'
ORDER BY table_name, column_name;"

# Check indexes
psql "$DATABASE_URL" -c "\di"
```

## Archive Directory

The `archive/` directory contains **old/deprecated schemas for reference only**.

**⚠️ DO NOT apply archived schemas in production or development.**

These files are kept for historical reference and to understand the schema evolution:
- `archive/user_portfolios.sql` - Old portfolio schema (superseded by `portfolio_management.sql`)
- `archive/sentiment.sql` - Old sentiment schema (superseded by `news_sentiment.sql`)
- Other archived schemas from previous iterations

## Data Integrity Features

### Foreign Key Constraints
All ticker/symbol references now have foreign key constraints to `stock_universe`:
- ✅ `news_sentiment.ticker` → `stock_universe.ticker`
- ✅ `fundamentals.symbol` → `stock_universe.ticker`
- ✅ `user_holdings.ticker` → `stock_universe.ticker`
- ✅ `portfolio_rebalancing_suggestions.ticker` → `stock_universe.ticker`
- ✅ `model_a_ml_signals.symbol` → `stock_universe.ticker`
- ✅ `model_b_ml_signals.symbol` → `stock_universe.ticker`
- ✅ `model_c_sentiment_signals.symbol` → `stock_universe.ticker`
- ✅ `ensemble_signals.symbol` → `stock_universe.ticker`
- ✅ `user_watchlist.ticker` → `stock_universe.ticker`
- ✅ `model_a_features_extended.symbol` → `stock_universe.ticker`
- ✅ `portfolio_attribution.symbol` → `stock_universe.ticker`

This prevents orphaned records and ensures data consistency.

### Timestamp Standardization
All timestamp columns use `TIMESTAMPTZ` (timezone-aware):
- Prevents timezone bugs in distributed systems
- Ensures consistent time handling across different regions
- All timestamps stored in UTC by default

### Update Triggers
All tables with `updated_at` columns have triggers to auto-update them:
- Ensures `updated_at` is always current
- Eliminates manual timestamp management in application code
- Provides accurate audit trail

## Performance Optimizations

### Composite Indexes
Strategic composite indexes for common query patterns:
- `news_sentiment(ticker, sentiment_label, published_at)` - News queries by ticker and sentiment
- `user_holdings(ticker, current_signal)` - Portfolio queries with signals
- `portfolio_rebalancing_suggestions(status, priority)` - Active suggestions
- `notifications(user_id, notification_type, created_at)` - User notifications

### Partial Indexes
Partial indexes for filtered queries:
- Active stocks: `stock_universe(is_active) WHERE is_active = TRUE`
- Pending suggestions: `portfolio_rebalancing_suggestions(status, priority) WHERE status = 'pending'`
- Unread notifications: `notifications(user_id, is_read) WHERE is_read = FALSE`

## Development Workflow

### Adding a New Table
1. Create a new `.sql` file in `schemas/`
2. Include `IF NOT EXISTS` clauses
3. Add appropriate indexes
4. Add comments explaining the table's purpose
5. Update this README.md
6. Test on a development database first

### Modifying an Existing Table
1. Create a new migration file (e.g., `005_add_new_columns.sql`)
2. Include rollback script
3. Test on a copy of production data
4. Document the changes in this README
5. Apply to development → staging → production

### Best Practices
- ✅ Use `TIMESTAMPTZ` for all timestamp columns
- ✅ Add foreign keys for referential integrity
- ✅ Create indexes for frequently queried columns
- ✅ Use `IF NOT EXISTS` and `IF EXISTS` for idempotency
- ✅ Include comments on tables and columns
- ✅ Write rollback scripts for all migrations
- ✅ Test migrations on non-production data first

## Troubleshooting

### Foreign Key Violation
If you get a foreign key constraint error:
```
ERROR:  insert or update on table "news_sentiment" violates foreign key constraint "fk_news_sentiment_ticker"
```

**Solution**: Ensure the ticker exists in `stock_universe` before inserting:
```sql
-- Add missing ticker to stock_universe first
INSERT INTO stock_universe (ticker, company_name, is_active)
VALUES ('BHP.AX', 'BHP Group Limited', TRUE)
ON CONFLICT (ticker) DO NOTHING;

-- Then insert into news_sentiment
INSERT INTO news_sentiment (ticker, title, url, published_at)
VALUES ('BHP.AX', 'News title', 'https://...', NOW());
```

### Migration Failed
If a migration fails partway through:
1. Check the error message carefully
2. Run the rollback script for that migration
3. Fix the issue (e.g., add missing data)
4. Re-run the migration

### Timestamp Conversion Issues
If timestamp conversion fails due to invalid data:
1. Identify rows with NULL or invalid timestamps
2. Update or delete those rows
3. Re-run the migration

## Support and Resources

- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
- **Schema Design Best Practices**: See `../docs/database_design.md` (if available)
- **Migration Guides**: See individual migration files for detailed comments

## Version History

- **2026-02-03**: Added `stock_universe` table and migrations for FK constraints, timestamp standardization, performance indexes, and update triggers
- **2026-01-29**: Initial schema creation with user accounts, portfolios, notifications, and AI signals

---

**Last Updated**: 2026-02-03
**Maintained By**: ASX Portfolio OS Development Team
