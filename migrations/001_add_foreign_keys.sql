-- Migration 001: Add Foreign Key Constraints
-- Created: 2026-02-03
-- Purpose: Add foreign key constraints to all tables referencing tickers
-- Prerequisites: stock_universe table must exist and be populated

-- Add foreign key to news_sentiment table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_news_sentiment_ticker'
    ) THEN
        ALTER TABLE news_sentiment 
            ADD CONSTRAINT fk_news_sentiment_ticker 
            FOREIGN KEY (ticker) REFERENCES stock_universe(ticker) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key to fundamentals table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_fundamentals_symbol'
    ) THEN
        ALTER TABLE fundamentals 
            ADD CONSTRAINT fk_fundamentals_symbol 
            FOREIGN KEY (symbol) REFERENCES stock_universe(ticker) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key to user_holdings table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_user_holdings_ticker'
    ) THEN
        ALTER TABLE user_holdings 
            ADD CONSTRAINT fk_user_holdings_ticker 
            FOREIGN KEY (ticker) REFERENCES stock_universe(ticker) ON DELETE RESTRICT;
    END IF;
END $$;

-- Add foreign key to portfolio_rebalancing_suggestions table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_rebalancing_ticker'
    ) THEN
        ALTER TABLE portfolio_rebalancing_suggestions 
            ADD CONSTRAINT fk_rebalancing_ticker 
            FOREIGN KEY (ticker) REFERENCES stock_universe(ticker) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key to model_a_ml_signals table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_model_a_symbol'
    ) THEN
        ALTER TABLE model_a_ml_signals 
            ADD CONSTRAINT fk_model_a_symbol 
            FOREIGN KEY (symbol) REFERENCES stock_universe(ticker) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key to model_c_sentiment_signals table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_model_c_symbol'
    ) THEN
        ALTER TABLE model_c_sentiment_signals 
            ADD CONSTRAINT fk_model_c_symbol 
            FOREIGN KEY (symbol) REFERENCES stock_universe(ticker) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key to model_b_ml_signals table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_model_b_symbol'
    ) THEN
        ALTER TABLE model_b_ml_signals 
            ADD CONSTRAINT fk_model_b_symbol 
            FOREIGN KEY (symbol) REFERENCES stock_universe(ticker) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key to ensemble_signals table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_ensemble_symbol'
    ) THEN
        ALTER TABLE ensemble_signals 
            ADD CONSTRAINT fk_ensemble_symbol 
            FOREIGN KEY (symbol) REFERENCES stock_universe(ticker) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key to user_watchlist table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_watchlist_ticker'
    ) THEN
        ALTER TABLE user_watchlist 
            ADD CONSTRAINT fk_watchlist_ticker 
            FOREIGN KEY (ticker) REFERENCES stock_universe(ticker) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key to model_a_features_extended table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_model_a_features_symbol'
    ) THEN
        ALTER TABLE model_a_features_extended 
            ADD CONSTRAINT fk_model_a_features_symbol 
            FOREIGN KEY (symbol) REFERENCES stock_universe(ticker) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key to portfolio_attribution table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_portfolio_attribution_symbol'
    ) THEN
        ALTER TABLE portfolio_attribution 
            ADD CONSTRAINT fk_portfolio_attribution_symbol 
            FOREIGN KEY (symbol) REFERENCES stock_universe(ticker) ON DELETE CASCADE;
    END IF;
END $$;

-- Verify foreign keys created
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
        'fk_model_c_symbol',
        'fk_model_b_symbol',
        'fk_ensemble_symbol',
        'fk_watchlist_ticker',
        'fk_model_a_features_symbol',
        'fk_portfolio_attribution_symbol'
    );
    
    RAISE NOTICE '✓ Foreign keys created: % of 11', fk_count;
END $$;
