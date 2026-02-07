-- ETF Holdings Schema
-- Stores daily holdings for ETFs tracked in the system
-- Supports time-series analysis of ETF composition changes

CREATE TABLE IF NOT EXISTS etf_holdings (
    id SERIAL PRIMARY KEY,
    etf_symbol VARCHAR(20) NOT NULL,
    holding_symbol VARCHAR(20) NOT NULL,
    holding_name VARCHAR(255),
    weight DECIMAL(8,6),
    shares_held BIGINT,
    market_value DECIMAL(18,2),
    sector VARCHAR(100),
    as_of_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(etf_symbol, holding_symbol, as_of_date)
);

-- Index for querying specific ETF holdings by date
CREATE INDEX IF NOT EXISTS idx_etf_holdings_etf_date ON etf_holdings(etf_symbol, as_of_date DESC);

-- Index for sector-based queries
CREATE INDEX IF NOT EXISTS idx_etf_holdings_sector ON etf_holdings(sector);
