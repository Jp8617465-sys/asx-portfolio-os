-- User Watchlist Table
-- Created: 2026-01-29
-- Purpose: Allow users to track favorite stocks for quick access

CREATE TABLE IF NOT EXISTS user_watchlist (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES user_accounts(user_id) ON DELETE CASCADE,
    ticker VARCHAR(20) NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,  -- Optional user notes about why they're watching this stock
    CONSTRAINT unique_user_ticker UNIQUE(user_id, ticker)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_watchlist_user_id ON user_watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_user_watchlist_ticker ON user_watchlist(ticker);
CREATE INDEX IF NOT EXISTS idx_user_watchlist_added_at ON user_watchlist(added_at DESC);

COMMENT ON TABLE user_watchlist IS 'User watchlist for tracking favorite stocks';
COMMENT ON COLUMN user_watchlist.ticker IS 'Stock ticker symbol (e.g., BHP.AX)';
COMMENT ON COLUMN user_watchlist.notes IS 'Optional user notes about the stock';
