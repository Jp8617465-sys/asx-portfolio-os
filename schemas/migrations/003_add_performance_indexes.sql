-- Migration: Add performance indexes for common query patterns

-- Fundamentals table - single symbol lookups
CREATE INDEX IF NOT EXISTS idx_fundamentals_symbol ON fundamentals(symbol);
CREATE INDEX IF NOT EXISTS idx_fundamentals_period_end ON fundamentals(period_end DESC);

-- News sentiment - composite indexes for filtered queries
CREATE INDEX IF NOT EXISTS idx_news_sentiment_ticker_label ON news_sentiment(ticker, sentiment_label);
CREATE INDEX IF NOT EXISTS idx_news_sentiment_ticker_published ON news_sentiment(ticker, published_at DESC);

-- Portfolio tables - composite indexes
-- Note: idx_user_portfolios_active already exists in portfolio_management.sql
-- Note: idx_user_holdings_portfolio_id already exists in portfolio_management.sql
CREATE INDEX IF NOT EXISTS idx_user_holdings_portfolio_ticker ON user_holdings(portfolio_id, ticker);

-- Model signals - date range queries
CREATE INDEX IF NOT EXISTS idx_model_c_signals_date_symbol ON model_c_sentiment_signals(as_of DESC, symbol);

-- User watchlist - user queries
CREATE INDEX IF NOT EXISTS idx_user_watchlist_user_added ON user_watchlist(user_id, added_at DESC);

-- Analyze tables to update query planner statistics
ANALYZE fundamentals;
ANALYZE news_sentiment;
ANALYZE user_portfolios;
ANALYZE user_holdings;
ANALYZE model_c_sentiment_signals;
ANALYZE user_watchlist;
