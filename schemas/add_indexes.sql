-- ASX Portfolio OS: Performance Optimization Indexes
-- Date: 2026-01-27
-- Purpose: Add indexes to improve query performance on production tables

-- Prices table - Most queried table (1.2M rows)
CREATE INDEX IF NOT EXISTS idx_prices_symbol_dt ON prices(symbol, dt DESC);
CREATE INDEX IF NOT EXISTS idx_prices_dt ON prices(dt DESC);
CREATE INDEX IF NOT EXISTS idx_prices_symbol ON prices(symbol);

-- Model A signals table - Dashboard queries
CREATE INDEX IF NOT EXISTS idx_signals_as_of ON model_a_ml_signals(as_of DESC);
CREATE INDEX IF NOT EXISTS idx_signals_rank ON model_a_ml_signals(rank ASC);
CREATE INDEX IF NOT EXISTS idx_signals_symbol ON model_a_ml_signals(symbol);
CREATE INDEX IF NOT EXISTS idx_signals_signal ON model_a_ml_signals(signal);
CREATE INDEX IF NOT EXISTS idx_signals_as_of_symbol ON model_a_ml_signals(as_of DESC, symbol);

-- Portfolio fusion - User holdings queries
CREATE INDEX IF NOT EXISTS idx_portfolio_user_date ON portfolio_fusion(user_id, as_of DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_as_of ON portfolio_fusion(as_of DESC);

-- Job history - Monitoring queries
CREATE INDEX IF NOT EXISTS idx_job_history_started ON job_history(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_history_job_name ON job_history(job_name);
CREATE INDEX IF NOT EXISTS idx_job_history_status ON job_history(status);
CREATE INDEX IF NOT EXISTS idx_job_history_job_started ON job_history(job_name, started_at DESC);

-- Portfolio attribution - Analytics queries
CREATE INDEX IF NOT EXISTS idx_portfolio_attribution_user ON portfolio_attribution(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_attribution_date ON portfolio_attribution(attribution_date DESC);

-- Model A drift audit - Drift monitoring
CREATE INDEX IF NOT EXISTS idx_drift_audit_feature ON model_a_drift_audit(feature_name);
CREATE INDEX IF NOT EXISTS idx_drift_audit_date ON model_a_drift_audit(audit_date DESC);

-- Model feature importance - SHAP analysis
CREATE INDEX IF NOT EXISTS idx_feature_importance_model ON model_feature_importance(model_id);
CREATE INDEX IF NOT EXISTS idx_feature_importance_rank ON model_feature_importance(importance_rank ASC);

-- Fundamentals table (prepared for Phase 2)
CREATE INDEX IF NOT EXISTS idx_fundamentals_symbol_dt ON fundamentals(symbol, dt DESC);
CREATE INDEX IF NOT EXISTS idx_fundamentals_dt ON fundamentals(dt DESC);

-- Analyze tables to update statistics
ANALYZE prices;
ANALYZE model_a_ml_signals;
ANALYZE portfolio_fusion;
ANALYZE job_history;
ANALYZE portfolio_attribution;
ANALYZE model_a_drift_audit;
ANALYZE model_feature_importance;
ANALYZE fundamentals;

-- Verify indexes created
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
