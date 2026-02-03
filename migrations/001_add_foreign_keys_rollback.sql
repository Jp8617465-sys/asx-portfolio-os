-- Migration 001 Rollback: Remove Foreign Key Constraints
-- Created: 2026-02-03
-- Purpose: Rollback foreign key constraints added in migration 001

-- Remove foreign key from news_sentiment table
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_news_sentiment_ticker'
    ) THEN
        ALTER TABLE news_sentiment DROP CONSTRAINT fk_news_sentiment_ticker;
    END IF;
END $$;

-- Remove foreign key from fundamentals table
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_fundamentals_symbol'
    ) THEN
        ALTER TABLE fundamentals DROP CONSTRAINT fk_fundamentals_symbol;
    END IF;
END $$;

-- Remove foreign key from user_holdings table
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_user_holdings_ticker'
    ) THEN
        ALTER TABLE user_holdings DROP CONSTRAINT fk_user_holdings_ticker;
    END IF;
END $$;

-- Remove foreign key from portfolio_rebalancing_suggestions table
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_rebalancing_ticker'
    ) THEN
        ALTER TABLE portfolio_rebalancing_suggestions DROP CONSTRAINT fk_rebalancing_ticker;
    END IF;
END $$;

-- Remove foreign key from model_a_ml_signals table
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_model_a_symbol'
    ) THEN
        ALTER TABLE model_a_ml_signals DROP CONSTRAINT fk_model_a_symbol;
    END IF;
END $$;

-- Remove foreign key from model_c_sentiment_signals table
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_model_c_symbol'
    ) THEN
        ALTER TABLE model_c_sentiment_signals DROP CONSTRAINT fk_model_c_symbol;
    END IF;
END $$;

-- Verify foreign keys removed
DO $$
DECLARE
    fk_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints
    WHERE constraint_name IN (
        'fk_news_sentiment_ticker',
        'fk_fundamentals_symbol',
        'fk_user_holdings_ticker',
        'fk_rebalancing_ticker',
        'fk_model_a_symbol',
        'fk_model_c_symbol'
    );
    
    RAISE NOTICE '✓ Foreign keys remaining: %', fk_count;
END $$;
