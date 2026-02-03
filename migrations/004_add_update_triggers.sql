-- Migration 004: Add Update Triggers
-- Created: 2026-02-03
-- Purpose: Ensure all tables with updated_at columns have triggers to auto-update them
-- Prerequisites: update_updated_at_column() function must exist (created in user_accounts.sql)

-- Ensure the update_updated_at_column function exists
-- This is a safety check - the function should already exist from user_accounts.sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to user_portfolios (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_user_portfolios_updated_at'
    ) THEN
        CREATE TRIGGER update_user_portfolios_updated_at
            BEFORE UPDATE ON user_portfolios
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Add trigger to user_holdings (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_user_holdings_updated_at'
    ) THEN
        CREATE TRIGGER update_user_holdings_updated_at
            BEFORE UPDATE ON user_holdings
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Add trigger to stock_universe (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_stock_universe_updated_at'
    ) THEN
        CREATE TRIGGER update_stock_universe_updated_at
            BEFORE UPDATE ON stock_universe
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Add trigger to user_preferences (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_user_preferences_updated_at'
    ) THEN
        CREATE TRIGGER update_user_preferences_updated_at
            BEFORE UPDATE ON user_preferences
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Add trigger to user_settings (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_user_settings_updated_at'
    ) THEN
        CREATE TRIGGER update_user_settings_updated_at
            BEFORE UPDATE ON user_settings
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Add trigger to alert_preferences (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_alert_preferences_updated_at'
    ) THEN
        CREATE TRIGGER update_alert_preferences_updated_at
            BEFORE UPDATE ON alert_preferences
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Add trigger to user_accounts (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_user_accounts_updated_at'
    ) THEN
        CREATE TRIGGER update_user_accounts_updated_at
            BEFORE UPDATE ON user_accounts
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Verify triggers created
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
    
    RAISE NOTICE '✓ Update triggers created: %', trigger_count;
END $$;
