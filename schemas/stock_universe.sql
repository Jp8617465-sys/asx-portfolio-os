-- Stock Universe Reference Table
-- Created: 2026-02-03
-- Purpose: Canonical stock reference table for enforcing data integrity with foreign keys

-- Stock universe table - canonical reference for all tickers
CREATE TABLE IF NOT EXISTS stock_universe (
    ticker VARCHAR(20) PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    sector VARCHAR(100),
    industry VARCHAR(100),
    market_cap NUMERIC,
    is_active BOOLEAN DEFAULT TRUE,
    listed_date DATE,
    delisted_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT ticker_not_empty CHECK (ticker != '')
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_stock_universe_sector ON stock_universe(sector);
CREATE INDEX IF NOT EXISTS idx_stock_universe_industry ON stock_universe(industry);
CREATE INDEX IF NOT EXISTS idx_stock_universe_active ON stock_universe(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_stock_universe_company_name ON stock_universe(company_name);

-- Update trigger for updated_at
CREATE TRIGGER update_stock_universe_updated_at
    BEFORE UPDATE ON stock_universe
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE stock_universe IS 'Canonical reference table for all stock tickers in the ASX portfolio system';
COMMENT ON COLUMN stock_universe.ticker IS 'Stock ticker symbol (e.g., BHP.AX, CBA.AX)';
COMMENT ON COLUMN stock_universe.is_active IS 'Whether the stock is currently listed/tradable';
COMMENT ON COLUMN stock_universe.delisted_date IS 'Date when stock was delisted (NULL if still active)';
