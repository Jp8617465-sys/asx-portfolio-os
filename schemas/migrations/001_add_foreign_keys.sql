-- Migration: Add Foreign Key Constraints to Reference stock_universe
-- This enforces referential integrity for all ticker/symbol references

-- Add FK to fundamentals table
ALTER TABLE fundamentals 
    ADD CONSTRAINT fk_fundamentals_symbol 
    FOREIGN KEY (symbol) 
    REFERENCES stock_universe(symbol) 
    ON DELETE RESTRICT;

-- Add FK to news_sentiment table
ALTER TABLE news_sentiment 
    ADD CONSTRAINT fk_news_sentiment_ticker 
    FOREIGN KEY (ticker) 
    REFERENCES stock_universe(symbol) 
    ON DELETE CASCADE;

-- Add FK to user_holdings table
ALTER TABLE user_holdings 
    ADD CONSTRAINT fk_user_holdings_ticker 
    FOREIGN KEY (ticker) 
    REFERENCES stock_universe(symbol) 
    ON DELETE RESTRICT;

-- Add FK to user_watchlist table
ALTER TABLE user_watchlist 
    ADD CONSTRAINT fk_user_watchlist_ticker 
    FOREIGN KEY (ticker) 
    REFERENCES stock_universe(symbol) 
    ON DELETE RESTRICT;

-- Add FK to model_a_ml_signals table
ALTER TABLE model_a_ml_signals 
    ADD CONSTRAINT fk_model_a_signals_symbol 
    FOREIGN KEY (symbol) 
    REFERENCES stock_universe(symbol) 
    ON DELETE CASCADE;

-- Add FK to model_b_ml_signals table
ALTER TABLE model_b_ml_signals 
    ADD CONSTRAINT fk_model_b_signals_symbol 
    FOREIGN KEY (symbol) 
    REFERENCES stock_universe(symbol) 
    ON DELETE CASCADE;

-- Add FK to model_c_sentiment_signals table
ALTER TABLE model_c_sentiment_signals 
    ADD CONSTRAINT fk_model_c_signals_symbol 
    FOREIGN KEY (symbol) 
    REFERENCES stock_universe(symbol) 
    ON DELETE CASCADE;

-- Add FK to portfolio_attribution table
ALTER TABLE portfolio_attribution 
    ADD CONSTRAINT fk_portfolio_attribution_symbol 
    FOREIGN KEY (symbol) 
    REFERENCES stock_universe(symbol) 
    ON DELETE CASCADE;

-- Add FK to portfolio_rebalancing_suggestions table
ALTER TABLE portfolio_rebalancing_suggestions 
    ADD CONSTRAINT fk_rebalancing_ticker 
    FOREIGN KEY (ticker) 
    REFERENCES stock_universe(symbol) 
    ON DELETE RESTRICT;
