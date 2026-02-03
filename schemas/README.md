# ASX Portfolio OS - Database Schema

## Directory Structure

- `schemas/*.sql` - Active schema files (apply these)
- `schemas/migrations/*.sql` - Migration scripts (apply in order)
- `schemas/archive/*.sql` - **DEPRECATED** - Do not apply these files

## Schema Application Order

1. Core tables (user management):
   - `user_accounts.sql`
   - `notifications.sql`

2. Reference data:
   - `stock_universe.sql` (NEW)

3. Market data:
   - `fundamentals.sql`
   - `news_sentiment.sql`

4. ML/Signals:
   - `model_a_ml_signals.sql`
   - `model_c_sentiment_signals.sql`
   - `model_feature_importance.sql`

5. Portfolio management:
   - `portfolio_management.sql`
   - `watchlist.sql`
   - `portfolio_attribution.sql`

6. Performance:
   - `add_indexes.sql`

7. Migrations (apply in numerical order):
   - `migrations/001_add_foreign_keys.sql`
   - `migrations/002_standardize_timestamps.sql`
   - `migrations/003_add_performance_indexes.sql`
   - `migrations/004_add_update_triggers.sql`

## Naming Conventions

- **Tables**: `snake_case`, plural nouns (e.g., `user_accounts`, `stock_universe`)
- **Columns**: `snake_case` (e.g., `user_id`, `created_at`)
- **Primary Keys**: Always named `id` (SERIAL or BIGSERIAL)
- **Foreign Keys**: Named `fk_{table}_{column}` (e.g., `fk_fundamentals_symbol`)
- **Indexes**: Named `idx_{table}_{columns}` (e.g., `idx_user_accounts_email`)
- **Timestamps**: Always use `TIMESTAMPTZ` for timezone awareness

## Best Practices

1. Always use `CREATE TABLE IF NOT EXISTS` for idempotency
2. Always add indexes with `IF NOT EXISTS`
3. Use `TIMESTAMPTZ` instead of `TIMESTAMP`
4. Add foreign key constraints for referential integrity
5. Use `ON DELETE CASCADE` or `RESTRICT` appropriately
6. Add comments to tables and complex columns
7. Include update triggers for `updated_at` columns

## Migration Strategy

To apply migrations safely:

```bash
# 1. Backup database first
pg_dump $DATABASE_URL > backup.sql

# 2. Apply migrations in order
psql $DATABASE_URL < schemas/migrations/001_add_foreign_keys.sql
psql $DATABASE_URL < schemas/migrations/002_standardize_timestamps.sql
psql $DATABASE_URL < schemas/migrations/003_add_performance_indexes.sql
psql $DATABASE_URL < schemas/migrations/004_add_update_triggers.sql

# 3. Verify migrations
psql $DATABASE_URL -c "\d+ stock_universe"
psql $DATABASE_URL -c "SELECT * FROM pg_constraint WHERE contype = 'f';"
```

## Archive Schema Files

⚠️ **WARNING**: Files in `schemas/archive/` are deprecated and should NOT be applied.

These files represent older schema designs that conflict with the current active schemas:
- `archive/user_portfolios.sql` - Conflicts with `portfolio_management.sql`
- `archive/user_alerts.sql` - Conflicts with `notifications.sql`
- `archive/macro.sql`, `archive/rl_experiments.sql`, `archive/nlp_announcements.sql` - Not currently used

If you need historical context, refer to git history.
