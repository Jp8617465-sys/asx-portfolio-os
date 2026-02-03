-- Migration: Add Foreign Key Constraints to Reference stock_universe
-- This enforces referential integrity for all ticker/symbol references
-- Idempotent: Can be run multiple times safely

-- Add FK to fundamentals table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_fundamentals_symbol'
    ) THEN
        ALTER TABLE fundamentals 
            ADD CONSTRAINT fk_fundamentals_symbol 
            FOREIGN KEY (symbol) 
            REFERENCES stock_universe(symbol) 
            ON DELETE RESTRICT;
    END IF;
END $$;

-- Add FK to news_sentiment table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_news_sentiment_ticker'
    ) THEN
        ALTER TABLE news_sentiment 
            ADD CONSTRAINT fk_news_sentiment_ticker 
            FOREIGN KEY (ticker) 
            REFERENCES stock_universe(symbol) 
            ON DELETE CASCADE;
    END IF;
END $$;

-- Add FK to user_holdings table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_holdings_ticker'
    ) THEN
        ALTER TABLE user_holdings 
            ADD CONSTRAINT fk_user_holdings_ticker 
            FOREIGN KEY (ticker) 
            REFERENCES stock_universe(symbol) 
            ON DELETE RESTRICT;
    END IF;
END $$;

-- Add FK to user_watchlist table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_watchlist_ticker'
    ) THEN
        ALTER TABLE user_watchlist 
            ADD CONSTRAINT fk_user_watchlist_ticker 
            FOREIGN KEY (ticker) 
            REFERENCES stock_universe(symbol) 
            ON DELETE RESTRICT;
    END IF;
END $$;

-- Add FK to model_a_ml_signals table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_model_a_signals_symbol'
    ) THEN
        ALTER TABLE model_a_ml_signals 
            ADD CONSTRAINT fk_model_a_signals_symbol 
            FOREIGN KEY (symbol) 
            REFERENCES stock_universe(symbol) 
            ON DELETE CASCADE;
    END IF;
END $$;

-- Add FK to model_b_ml_signals table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_model_b_signals_symbol'
    ) THEN
        ALTER TABLE model_b_ml_signals 
            ADD CONSTRAINT fk_model_b_signals_symbol 
            FOREIGN KEY (symbol) 
            REFERENCES stock_universe(symbol) 
            ON DELETE CASCADE;
    END IF;
END $$;

-- Add FK to model_c_sentiment_signals table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_model_c_signals_symbol'
    ) THEN
        ALTER TABLE model_c_sentiment_signals 
            ADD CONSTRAINT fk_model_c_signals_symbol 
            FOREIGN KEY (symbol) 
            REFERENCES stock_universe(symbol) 
            ON DELETE CASCADE;
    END IF;
END $$;

-- Add FK to portfolio_attribution table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_portfolio_attribution_symbol'
    ) THEN
        ALTER TABLE portfolio_attribution 
            ADD CONSTRAINT fk_portfolio_attribution_symbol 
            FOREIGN KEY (symbol) 
            REFERENCES stock_universe(symbol) 
            ON DELETE CASCADE;
    END IF;
END $$;

-- Add FK to portfolio_rebalancing_suggestions table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_rebalancing_ticker'
    ) THEN
        ALTER TABLE portfolio_rebalancing_suggestions 
            ADD CONSTRAINT fk_rebalancing_ticker 
            FOREIGN KEY (ticker) 
            REFERENCES stock_universe(symbol) 
            ON DELETE RESTRICT;
    END IF;
END $$;

-- Add FK to ensemble_signals table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_ensemble_signals_symbol'
    ) THEN
        ALTER TABLE ensemble_signals 
            ADD CONSTRAINT fk_ensemble_signals_symbol 
            FOREIGN KEY (symbol) 
            REFERENCES stock_universe(symbol) 
            ON DELETE CASCADE;
    END IF;
END $$;
