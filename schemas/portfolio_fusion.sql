-- Portfolio Fusion: Unified portfolio analytics across all asset classes
create table if not exists portfolio_fusion (
    id bigserial primary key,
    computed_at timestamptz not null default now(),
    
    -- Equity holdings
    equity_value numeric,
    equity_count integer,
    equity_sharpe numeric,
    equity_allocation_pct numeric,
    
    -- Property holdings
    property_value numeric,
    property_count integer,
    property_yield_avg numeric,
    property_allocation_pct numeric,
    
    -- Loan obligations
    loan_balance numeric,
    loan_count integer,
    loan_monthly_payment numeric,
    loan_allocation_pct numeric,
    
    -- Aggregate portfolio metrics
    total_assets numeric,
    total_liabilities numeric,
    net_worth numeric,
    debt_service_ratio numeric,
    
    -- Risk metrics
    portfolio_volatility numeric,
    max_drawdown numeric,
    risk_score numeric,
    
    -- Metadata
    data_freshness_hours numeric,
    confidence_score numeric,
    
    created_at timestamptz not null default now()
);

create index if not exists idx_portfolio_fusion_computed_at on portfolio_fusion(computed_at desc);
