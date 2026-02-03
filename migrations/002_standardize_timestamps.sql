-- Migration 002: Standardize Timestamp Columns
-- Created: 2026-02-03
-- Purpose: Convert all TIMESTAMP columns to TIMESTAMPTZ for timezone awareness
-- Note: PostgreSQL TIMESTAMP lacks timezone information which can cause issues in distributed systems

-- user_portfolios: Convert timestamps to TIMESTAMPTZ
DO $$ 
BEGIN
    -- created_at
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_portfolios' 
        AND column_name = 'created_at' 
        AND data_type = 'timestamp without time zone'
    ) THEN
        ALTER TABLE user_portfolios 
            ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
    END IF;
    
    -- updated_at
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_portfolios' 
        AND column_name = 'updated_at' 
        AND data_type = 'timestamp without time zone'
    ) THEN
        ALTER TABLE user_portfolios 
            ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';
    END IF;
    
    -- last_synced_at
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_portfolios' 
        AND column_name = 'last_synced_at' 
        AND data_type = 'timestamp without time zone'
    ) THEN
        ALTER TABLE user_portfolios 
            ALTER COLUMN last_synced_at TYPE TIMESTAMPTZ USING last_synced_at AT TIME ZONE 'UTC';
    END IF;
END $$;

-- user_holdings: Convert timestamps to TIMESTAMPTZ
DO $$ 
BEGIN
    -- last_price_update
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_holdings' 
        AND column_name = 'last_price_update' 
        AND data_type = 'timestamp without time zone'
    ) THEN
        ALTER TABLE user_holdings 
            ALTER COLUMN last_price_update TYPE TIMESTAMPTZ USING last_price_update AT TIME ZONE 'UTC';
    END IF;
    
    -- created_at
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_holdings' 
        AND column_name = 'created_at' 
        AND data_type = 'timestamp without time zone'
    ) THEN
        ALTER TABLE user_holdings 
            ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
    END IF;
    
    -- updated_at
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_holdings' 
        AND column_name = 'updated_at' 
        AND data_type = 'timestamp without time zone'
    ) THEN
        ALTER TABLE user_holdings 
            ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';
    END IF;
END $$;

-- portfolio_rebalancing_suggestions: Convert timestamps to TIMESTAMPTZ
DO $$ 
BEGIN
    -- generated_at
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'portfolio_rebalancing_suggestions' 
        AND column_name = 'generated_at' 
        AND data_type = 'timestamp without time zone'
    ) THEN
        ALTER TABLE portfolio_rebalancing_suggestions 
            ALTER COLUMN generated_at TYPE TIMESTAMPTZ USING generated_at AT TIME ZONE 'UTC';
    END IF;
    
    -- executed_at
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'portfolio_rebalancing_suggestions' 
        AND column_name = 'executed_at' 
        AND data_type = 'timestamp without time zone'
    ) THEN
        ALTER TABLE portfolio_rebalancing_suggestions 
            ALTER COLUMN executed_at TYPE TIMESTAMPTZ USING executed_at AT TIME ZONE 'UTC';
    END IF;
END $$;

-- notifications: Convert timestamps to TIMESTAMPTZ
DO $$ 
BEGIN
    -- created_at
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'created_at' 
        AND data_type = 'timestamp without time zone'
    ) THEN
        ALTER TABLE notifications 
            ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
    END IF;
    
    -- read_at
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'read_at' 
        AND data_type = 'timestamp without time zone'
    ) THEN
        ALTER TABLE notifications 
            ALTER COLUMN read_at TYPE TIMESTAMPTZ USING read_at AT TIME ZONE 'UTC';
    END IF;
    
    -- expires_at
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'expires_at' 
        AND data_type = 'timestamp without time zone'
    ) THEN
        ALTER TABLE notifications 
            ALTER COLUMN expires_at TYPE TIMESTAMPTZ USING expires_at AT TIME ZONE 'UTC';
    END IF;
END $$;

-- alert_preferences: Convert timestamps to TIMESTAMPTZ
DO $$ 
BEGIN
    -- created_at
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'alert_preferences' 
        AND column_name = 'created_at' 
        AND data_type = 'timestamp without time zone'
    ) THEN
        ALTER TABLE alert_preferences 
            ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
    END IF;
    
    -- updated_at
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'alert_preferences' 
        AND column_name = 'updated_at' 
        AND data_type = 'timestamp without time zone'
    ) THEN
        ALTER TABLE alert_preferences 
            ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';
    END IF;
END $$;

-- user_accounts: Convert timestamps to TIMESTAMPTZ
DO $$ 
BEGIN
    -- created_at
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_accounts' 
        AND column_name = 'created_at' 
        AND data_type = 'timestamp without time zone'
    ) THEN
        ALTER TABLE user_accounts 
            ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
    END IF;
    
    -- updated_at
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_accounts' 
        AND column_name = 'updated_at' 
        AND data_type = 'timestamp without time zone'
    ) THEN
        ALTER TABLE user_accounts 
            ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';
    END IF;
    
    -- last_login_at
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_accounts' 
        AND column_name = 'last_login_at' 
        AND data_type = 'timestamp without time zone'
    ) THEN
        ALTER TABLE user_accounts 
            ALTER COLUMN last_login_at TYPE TIMESTAMPTZ USING last_login_at AT TIME ZONE 'UTC';
    END IF;
END $$;

-- Verify timestamp conversions
DO $$
DECLARE
    ts_count INTEGER;
    tstz_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO ts_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND data_type = 'timestamp without time zone'
    AND table_name IN (
        'user_portfolios', 'user_holdings', 'portfolio_rebalancing_suggestions',
        'notifications', 'alert_preferences', 'user_accounts'
    );
    
    SELECT COUNT(*) INTO tstz_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND data_type = 'timestamp with time zone'
    AND table_name IN (
        'user_portfolios', 'user_holdings', 'portfolio_rebalancing_suggestions',
        'notifications', 'alert_preferences', 'user_accounts'
    );
    
    RAISE NOTICE '✓ TIMESTAMP columns remaining: %', ts_count;
    RAISE NOTICE '✓ TIMESTAMPTZ columns converted: %', tstz_count;
END $$;
