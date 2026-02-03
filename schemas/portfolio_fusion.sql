-- Portfolio Fusion: Unified portfolio analytics across all asset classes
CREATE TABLE IF NOT EXISTS portfolio_fusion (
    id BIGSERIAL PRIMARY KEY,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Equity holdings
    equity_value NUMERIC,
    equity_count INTEGER,
    equity_sharpe NUMERIC,
    equity_allocation_pct NUMERIC,
    
    -- Property holdings
    property_value NUMERIC,
    property_count INTEGER,
    property_yield_avg NUMERIC,
    property_allocation_pct NUMERIC,
    
    -- Loan obligations
    loan_balance NUMERIC,
    loan_count INTEGER,
    loan_monthly_payment NUMERIC,
    loan_allocation_pct NUMERIC,
    
    -- Aggregate portfolio metrics
    total_assets NUMERIC,
    total_liabilities NUMERIC,
    net_worth NUMERIC,
    debt_service_ratio NUMERIC,
    
    -- Risk metrics
    portfolio_volatility NUMERIC,
    max_drawdown NUMERIC,
    risk_score NUMERIC,
    
    -- Metadata
    data_freshness_hours NUMERIC,
    confidence_score NUMERIC,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_fusion_computed_at ON portfolio_fusion(computed_at DESC);
