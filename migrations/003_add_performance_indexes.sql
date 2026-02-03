-- Migration 003: Add Performance Indexes
-- Created: 2026-02-03
-- Purpose: Add indexes for frequently queried columns and common query patterns
-- Note: Indexes improve read performance but add overhead to writes

-- Fundamentals table indexes
CREATE INDEX IF NOT EXISTS idx_fundamentals_symbol ON fundamentals(symbol);
CREATE INDEX IF NOT EXISTS idx_fundamentals_sector ON fundamentals(sector);
CREATE INDEX IF NOT EXISTS idx_fundamentals_industry ON fundamentals(industry);
CREATE INDEX IF NOT EXISTS idx_fundamentals_updated_at ON fundamentals(updated_at DESC);

-- News sentiment - composite index for common queries
-- This index helps with queries filtering by ticker, sentiment, and ordering by date
CREATE INDEX IF NOT EXISTS idx_news_ticker_sentiment 
    ON news_sentiment(ticker, sentiment_label, published_at DESC);

-- Additional news sentiment indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_news_sentiment_score ON news_sentiment(sentiment_score DESC) 
    WHERE sentiment_score IS NOT NULL;

-- User holdings - composite index for portfolio queries with signals
CREATE INDEX IF NOT EXISTS idx_holdings_ticker_signal 
    ON user_holdings(ticker, current_signal) 
    WHERE current_signal IS NOT NULL;

-- User holdings - index for signal confidence filtering
CREATE INDEX IF NOT EXISTS idx_holdings_signal_confidence 
    ON user_holdings(signal_confidence DESC NULLS LAST) 
    WHERE signal_confidence IS NOT NULL;

-- Portfolio suggestions - active suggestions by status and priority
CREATE INDEX IF NOT EXISTS idx_suggestions_status_priority 
    ON portfolio_rebalancing_suggestions(status, priority DESC) 
    WHERE status = 'pending';

-- Portfolio suggestions - index for time-based queries
CREATE INDEX IF NOT EXISTS idx_suggestions_generated_at 
    ON portfolio_rebalancing_suggestions(generated_at DESC);

-- Notifications - user unread with type and date
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_unread 
    ON notifications(user_id, notification_type, created_at DESC) 
    WHERE is_read = FALSE;

-- Notifications - priority filtering for high-priority unread
CREATE INDEX IF NOT EXISTS idx_notifications_priority_unread 
    ON notifications(priority, created_at DESC) 
    WHERE is_read = FALSE AND priority IN ('high', 'urgent');

-- Model A signals - composite index for symbol and date lookups
CREATE INDEX IF NOT EXISTS idx_model_a_symbol_date 
    ON model_a_ml_signals(symbol, as_of DESC);

-- Model A signals - index for high-confidence signals
CREATE INDEX IF NOT EXISTS idx_model_a_rank ON model_a_ml_signals(rank) 
    WHERE rank IS NOT NULL;

-- Model C signals - composite index for symbol and date lookups
CREATE INDEX IF NOT EXISTS idx_model_c_symbol_date 
    ON model_c_sentiment_signals(symbol, as_of DESC);

-- Model C signals - index for signal filtering
CREATE INDEX IF NOT EXISTS idx_model_c_signal_confidence 
    ON model_c_sentiment_signals(signal, confidence DESC) 
    WHERE confidence IS NOT NULL;

-- Model B signals - composite index for symbol and date lookups
CREATE INDEX IF NOT EXISTS idx_model_b_symbol_date 
    ON model_b_ml_signals(symbol, as_of DESC);

-- Model B signals - index for quality score filtering
CREATE INDEX IF NOT EXISTS idx_model_b_quality 
    ON model_b_ml_signals(quality_score, as_of DESC) 
    WHERE quality_score IN ('A', 'B');

-- Ensemble signals - composite index for symbol and date lookups
CREATE INDEX IF NOT EXISTS idx_ensemble_symbol_date 
    ON ensemble_signals(symbol, as_of DESC);

-- Ensemble signals - index for high-confidence signals
CREATE INDEX IF NOT EXISTS idx_ensemble_confidence 
    ON ensemble_signals(confidence DESC, signal) 
    WHERE confidence IS NOT NULL;

-- User watchlist - composite index for user and ticker
CREATE INDEX IF NOT EXISTS idx_watchlist_user_ticker 
    ON user_watchlist(user_id, ticker);

-- Model A features - composite index for symbol and date
CREATE INDEX IF NOT EXISTS idx_model_a_features_symbol_date 
    ON model_a_features_extended(symbol, as_of DESC);

-- Portfolio attribution - composite index for model, date, and symbol
CREATE INDEX IF NOT EXISTS idx_portfolio_attr_model_date 
    ON portfolio_attribution(model, as_of DESC, symbol);

-- Portfolio risk metrics - index for latest metrics queries
CREATE INDEX IF NOT EXISTS idx_risk_metrics_portfolio_date 
    ON portfolio_risk_metrics(portfolio_id, as_of DESC);

-- User preferences - index for fast preference lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_key 
    ON user_preferences(user_id, preference_key);

-- User settings - already has unique constraint on user_id, no additional index needed

-- Verify indexes created
DO $$
DECLARE
    idx_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO idx_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%'
    AND indexname IN (
        'idx_fundamentals_symbol',
        'idx_fundamentals_sector',
        'idx_news_ticker_sentiment',
        'idx_holdings_ticker_signal',
        'idx_suggestions_status_priority',
        'idx_notifications_user_type_unread',
        'idx_model_a_symbol_date',
        'idx_model_c_symbol_date',
        'idx_model_b_symbol_date',
        'idx_ensemble_symbol_date',
        'idx_watchlist_user_ticker',
        'idx_model_a_features_symbol_date',
        'idx_portfolio_attr_model_date',
        'idx_risk_metrics_portfolio_date',
        'idx_user_preferences_key'
    );
    
    RAISE NOTICE '✓ Performance indexes created: %', idx_count;
END $$;
