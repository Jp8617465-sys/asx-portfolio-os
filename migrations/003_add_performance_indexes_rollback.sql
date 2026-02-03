-- Migration 003 Rollback: Remove Performance Indexes
-- Created: 2026-02-03
-- Purpose: Rollback performance indexes added in migration 003

-- Drop fundamentals table indexes
DROP INDEX IF EXISTS idx_fundamentals_symbol;
DROP INDEX IF EXISTS idx_fundamentals_sector;
DROP INDEX IF EXISTS idx_fundamentals_industry;
DROP INDEX IF EXISTS idx_fundamentals_updated_at;

-- Drop news sentiment indexes
DROP INDEX IF EXISTS idx_news_ticker_sentiment;
DROP INDEX IF EXISTS idx_news_sentiment_score;

-- Drop user holdings indexes
DROP INDEX IF EXISTS idx_holdings_ticker_signal;
DROP INDEX IF EXISTS idx_holdings_signal_confidence;

-- Drop portfolio suggestions indexes
DROP INDEX IF EXISTS idx_suggestions_status_priority;
DROP INDEX IF EXISTS idx_suggestions_generated_at;

-- Drop notifications indexes
DROP INDEX IF EXISTS idx_notifications_user_type_unread;
DROP INDEX IF EXISTS idx_notifications_priority_unread;

-- Drop model A signal indexes
DROP INDEX IF EXISTS idx_model_a_symbol_date;
DROP INDEX IF EXISTS idx_model_a_rank;

-- Drop model C signal indexes
DROP INDEX IF EXISTS idx_model_c_symbol_date;
DROP INDEX IF EXISTS idx_model_c_signal_confidence;

-- Drop model B signal indexes
DROP INDEX IF EXISTS idx_model_b_symbol_date;
DROP INDEX IF EXISTS idx_model_b_quality;

-- Drop ensemble signal indexes
DROP INDEX IF EXISTS idx_ensemble_symbol_date;
DROP INDEX IF EXISTS idx_ensemble_confidence;

-- Drop user watchlist indexes
DROP INDEX IF EXISTS idx_watchlist_user_ticker;

-- Drop model A features indexes
DROP INDEX IF EXISTS idx_model_a_features_symbol_date;

-- Drop portfolio attribution indexes
DROP INDEX IF EXISTS idx_portfolio_attr_model_date;

-- Drop portfolio risk metrics indexes
DROP INDEX IF EXISTS idx_risk_metrics_portfolio_date;

-- Drop user preferences indexes
DROP INDEX IF EXISTS idx_user_preferences_key;

-- Verify indexes removed
DO $$
DECLARE
    idx_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO idx_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname IN (
        'idx_fundamentals_symbol',
        'idx_fundamentals_sector',
        'idx_news_ticker_sentiment',
        'idx_holdings_ticker_signal',
        'idx_suggestions_status_priority',
        'idx_notifications_user_type_unread',
        'idx_model_a_symbol_date',
        'idx_model_c_symbol_date',
        'idx_risk_metrics_portfolio_date',
        'idx_user_preferences_key'
    );
    
    RAISE NOTICE '✓ Performance indexes remaining: %', idx_count;
END $$;
