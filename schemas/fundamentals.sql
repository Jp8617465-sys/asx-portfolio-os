CREATE TABLE IF NOT EXISTS fundamentals (
    id BIGSERIAL PRIMARY KEY,
    symbol TEXT NOT NULL,
    sector TEXT,
    industry TEXT,
    pe_ratio NUMERIC,
    pb_ratio NUMERIC,
    eps NUMERIC,
    roe NUMERIC,
    debt_to_equity NUMERIC,
    market_cap NUMERIC,
    div_yield NUMERIC,
    period_end DATE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE fundamentals
    ADD COLUMN IF NOT EXISTS sector TEXT,
    ADD COLUMN IF NOT EXISTS industry TEXT,
    ADD COLUMN IF NOT EXISTS pb_ratio NUMERIC,
    ADD COLUMN IF NOT EXISTS div_yield NUMERIC,
    ADD COLUMN IF NOT EXISTS period_end DATE,
    -- V2 additions for Model B
    ADD COLUMN IF NOT EXISTS revenue_growth_yoy NUMERIC,
    ADD COLUMN IF NOT EXISTS profit_margin NUMERIC,
    ADD COLUMN IF NOT EXISTS current_ratio NUMERIC,
    ADD COLUMN IF NOT EXISTS quick_ratio NUMERIC,
    ADD COLUMN IF NOT EXISTS eps_growth NUMERIC,
    ADD COLUMN IF NOT EXISTS free_cash_flow NUMERIC;

CREATE UNIQUE INDEX IF NOT EXISTS fundamentals_symbol_updated_at_uidx
    ON fundamentals (symbol, updated_at);
