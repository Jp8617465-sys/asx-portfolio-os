-- Stock Universe Reference Table
-- Central reference for all valid ASX tickers/symbols
CREATE TABLE IF NOT EXISTS stock_universe (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255),
    sector VARCHAR(100),
    industry VARCHAR(100),
    market_cap NUMERIC,
    is_active BOOLEAN DEFAULT TRUE,
    listed_date DATE,
    delisted_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_universe_symbol ON stock_universe(symbol);
CREATE INDEX IF NOT EXISTS idx_stock_universe_sector ON stock_universe(sector);
CREATE INDEX IF NOT EXISTS idx_stock_universe_active ON stock_universe(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE stock_universe IS 'Reference table for all valid ASX stock symbols';
COMMENT ON COLUMN stock_universe.symbol IS 'Stock ticker symbol (e.g., BHP.AX, CBA.AX)';
COMMENT ON COLUMN stock_universe.is_active IS 'Whether stock is currently listed/trading';
