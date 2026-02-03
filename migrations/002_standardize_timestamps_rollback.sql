-- Migration 002 Rollback: Revert Timestamp Standardization
-- Created: 2026-02-03
-- Purpose: Rollback TIMESTAMPTZ conversions to TIMESTAMP
-- WARNING: This will lose timezone information. Only use if absolutely necessary.

-- user_portfolios: Revert to TIMESTAMP
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_portfolios' 
        AND column_name = 'created_at' 
        AND data_type = 'timestamp with time zone'
    ) THEN
        ALTER TABLE user_portfolios 
            ALTER COLUMN created_at TYPE TIMESTAMP;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_portfolios' 
        AND column_name = 'updated_at' 
        AND data_type = 'timestamp with time zone'
    ) THEN
        ALTER TABLE user_portfolios 
            ALTER COLUMN updated_at TYPE TIMESTAMP;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_portfolios' 
        AND column_name = 'last_synced_at' 
        AND data_type = 'timestamp with time zone'
    ) THEN
        ALTER TABLE user_portfolios 
            ALTER COLUMN last_synced_at TYPE TIMESTAMP;
    END IF;
END $$;

-- user_holdings: Revert to TIMESTAMP
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_holdings' 
        AND column_name = 'last_price_update' 
        AND data_type = 'timestamp with time zone'
    ) THEN
        ALTER TABLE user_holdings 
            ALTER COLUMN last_price_update TYPE TIMESTAMP;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_holdings' 
        AND column_name = 'created_at' 
        AND data_type = 'timestamp with time zone'
    ) THEN
        ALTER TABLE user_holdings 
            ALTER COLUMN created_at TYPE TIMESTAMP;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_holdings' 
        AND column_name = 'updated_at' 
        AND data_type = 'timestamp with time zone'
    ) THEN
        ALTER TABLE user_holdings 
            ALTER COLUMN updated_at TYPE TIMESTAMP;
    END IF;
END $$;

-- portfolio_rebalancing_suggestions: Revert to TIMESTAMP
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'portfolio_rebalancing_suggestions' 
        AND column_name = 'generated_at' 
        AND data_type = 'timestamp with time zone'
    ) THEN
        ALTER TABLE portfolio_rebalancing_suggestions 
            ALTER COLUMN generated_at TYPE TIMESTAMP;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'portfolio_rebalancing_suggestions' 
        AND column_name = 'executed_at' 
        AND data_type = 'timestamp with time zone'
    ) THEN
        ALTER TABLE portfolio_rebalancing_suggestions 
            ALTER COLUMN executed_at TYPE TIMESTAMP;
    END IF;
END $$;

-- notifications: Revert to TIMESTAMP
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'created_at' 
        AND data_type = 'timestamp with time zone'
    ) THEN
        ALTER TABLE notifications 
            ALTER COLUMN created_at TYPE TIMESTAMP;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'read_at' 
        AND data_type = 'timestamp with time zone'
    ) THEN
        ALTER TABLE notifications 
            ALTER COLUMN read_at TYPE TIMESTAMP;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'expires_at' 
        AND data_type = 'timestamp with time zone'
    ) THEN
        ALTER TABLE notifications 
            ALTER COLUMN expires_at TYPE TIMESTAMP;
    END IF;
END $$;

-- alert_preferences: Revert to TIMESTAMP
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'alert_preferences' 
        AND column_name = 'created_at' 
        AND data_type = 'timestamp with time zone'
    ) THEN
        ALTER TABLE alert_preferences 
            ALTER COLUMN created_at TYPE TIMESTAMP;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'alert_preferences' 
        AND column_name = 'updated_at' 
        AND data_type = 'timestamp with time zone'
    ) THEN
        ALTER TABLE alert_preferences 
            ALTER COLUMN updated_at TYPE TIMESTAMP;
    END IF;
END $$;

-- user_accounts: Revert to TIMESTAMP
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_accounts' 
        AND column_name = 'created_at' 
        AND data_type = 'timestamp with time zone'
    ) THEN
        ALTER TABLE user_accounts 
            ALTER COLUMN created_at TYPE TIMESTAMP;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_accounts' 
        AND column_name = 'updated_at' 
        AND data_type = 'timestamp with time zone'
    ) THEN
        ALTER TABLE user_accounts 
            ALTER COLUMN updated_at TYPE TIMESTAMP;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_accounts' 
        AND column_name = 'last_login_at' 
        AND data_type = 'timestamp with time zone'
    ) THEN
        ALTER TABLE user_accounts 
            ALTER COLUMN last_login_at TYPE TIMESTAMP;
    END IF;
END $$;

RAISE NOTICE '✓ Rollback complete - timestamps reverted to TIMESTAMP (timezone info lost)';
