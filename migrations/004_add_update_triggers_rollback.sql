-- Migration 004 Rollback: Remove Update Triggers
-- Created: 2026-02-03
-- Purpose: Rollback update triggers added in migration 004

-- Drop trigger from user_portfolios
DROP TRIGGER IF EXISTS update_user_portfolios_updated_at ON user_portfolios;

-- Drop trigger from user_holdings
DROP TRIGGER IF EXISTS update_user_holdings_updated_at ON user_holdings;

-- Drop trigger from stock_universe
DROP TRIGGER IF EXISTS update_stock_universe_updated_at ON stock_universe;

-- Drop trigger from user_preferences
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;

-- Drop trigger from user_settings
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;

-- Drop trigger from alert_preferences
DROP TRIGGER IF EXISTS update_alert_preferences_updated_at ON alert_preferences;

-- Drop trigger from user_accounts
DROP TRIGGER IF EXISTS update_user_accounts_updated_at ON user_accounts;

-- Note: We don't drop the update_updated_at_column() function as it may be used by other triggers

-- Verify triggers removed
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger
    WHERE tgname IN (
        'update_user_portfolios_updated_at',
        'update_user_holdings_updated_at',
        'update_stock_universe_updated_at',
        'update_user_preferences_updated_at',
        'update_user_settings_updated_at',
        'update_alert_preferences_updated_at',
        'update_user_accounts_updated_at'
    );
    
    RAISE NOTICE '✓ Update triggers remaining: %', trigger_count;
END $$;
