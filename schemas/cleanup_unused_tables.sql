-- ASX Portfolio OS: Database Schema Cleanup
-- Removing unused tables identified in production readiness audit
-- Date: 2026-01-27
-- Safe to run - only drops tables not actively used in production

-- WARNING: This will permanently delete data. Backup first if needed.
-- Run this script after verifying these tables are truly unused.

-- Phase 2 / Future feature tables (not yet implemented)
DROP TABLE IF EXISTS model_b_predictions CASCADE;
DROP TABLE IF EXISTS model_c_predictions CASCADE;
DROP TABLE IF EXISTS rl_experiments CASCADE;
DROP TABLE IF EXISTS etf_data CASCADE;
DROP TABLE IF EXISTS nlp_announcements CASCADE;
DROP TABLE IF EXISTS sentiment CASCADE;
DROP TABLE IF EXISTS property_assets CASCADE;
DROP TABLE IF EXISTS loan_accounts CASCADE;
DROP TABLE IF EXISTS features_fundamental CASCADE;
DROP TABLE IF EXISTS features_fundamental_trends CASCADE;
DROP TABLE IF EXISTS fundamentals_history CASCADE;
DROP TABLE IF EXISTS macro CASCADE;

-- Duplicate/unused model tables
DROP TABLE IF EXISTS model_a_predictions CASCADE; -- Duplicates model_a_ml_signals
DROP TABLE IF EXISTS model_a_backtests CASCADE; -- Not used in production
DROP TABLE IF EXISTS model_registry CASCADE; -- Not used

-- Unused monitoring tables
DROP TABLE IF EXISTS risk_exposure_snapshot CASCADE; -- Not populated
DROP TABLE IF EXISTS portfolio_performance CASCADE; -- Not used

-- User management tables (auth not implemented)
DROP TABLE IF EXISTS user_alerts CASCADE;
DROP TABLE IF EXISTS user_portfolios CASCADE;

-- Keep these production tables:
-- ✅ prices (1.2M rows - price data)
-- ✅ model_a_ml_signals (daily signals)
-- ✅ model_a_features_extended (for feature pre-computation optimization)
-- ✅ model_a_drift_audit (drift monitoring infrastructure)
-- ✅ portfolio_fusion (portfolio tracking)
-- ✅ portfolio_attribution (portfolio analytics)
-- ✅ job_history (pipeline monitoring)
-- ✅ model_feature_importance (SHAP analysis)
-- ✅ fundamentals (has data for 50 tickers, keep for Phase 2)

-- Verify cleanup
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
