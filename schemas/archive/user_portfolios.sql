-- User Portfolio Management Schema
-- Tracks user-uploaded portfolios, holdings, and AI-driven rebalancing suggestions

-- =============================================================================
-- User Portfolios: Main portfolio records
-- =============================================================================
create table if not exists user_portfolios (
    id bigserial primary key,
    user_id text not null, -- User identifier (can be API key, user email, etc.)
    name text not null default 'My Portfolio',
    currency text not null default 'AUD',

    -- Portfolio totals (cached for performance)
    total_value numeric,
    total_cost_basis numeric,
    total_pl numeric,
    total_pl_pct numeric,
    cash_balance numeric default 0,

    -- Metadata
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    last_synced_at timestamptz, -- Last time prices were synced

    -- Soft delete
    is_active boolean not null default true
);

create index if not exists idx_user_portfolios_user_id on user_portfolios(user_id) where is_active = true;
create index if not exists idx_user_portfolios_updated_at on user_portfolios(updated_at desc);

-- =============================================================================
-- User Holdings: Individual stock positions
-- =============================================================================
create table if not exists user_holdings (
    id bigserial primary key,
    portfolio_id bigint not null references user_portfolios(id) on delete cascade,

    -- Position details
    ticker text not null, -- e.g., 'CBA.AX'
    shares numeric not null check (shares > 0),
    avg_cost numeric not null check (avg_cost >= 0), -- Average cost per share
    date_acquired date, -- When the position was first opened

    -- Current market data (synced from prices table)
    current_price numeric,
    current_value numeric, -- shares * current_price

    -- P&L calculations
    cost_basis numeric, -- shares * avg_cost
    unrealized_pl numeric, -- current_value - cost_basis
    unrealized_pl_pct numeric, -- (current_price - avg_cost) / avg_cost * 100

    -- AI signal (synced from signals table)
    current_signal text, -- STRONG_BUY, BUY, HOLD, SELL, STRONG_SELL
    signal_confidence numeric, -- 0-100
    signal_as_of date, -- Date of the signal

    -- Metadata
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    -- Constraints
    constraint unique_holding_per_portfolio unique (portfolio_id, ticker)
);

create index if not exists idx_user_holdings_portfolio_id on user_holdings(portfolio_id);
create index if not exists idx_user_holdings_ticker on user_holdings(ticker);
create index if not exists idx_user_holdings_current_signal on user_holdings(current_signal);

-- =============================================================================
-- Portfolio Rebalancing Suggestions: AI-driven recommendations
-- =============================================================================
create table if not exists portfolio_rebalancing_suggestions (
    id bigserial primary key,
    portfolio_id bigint not null references user_portfolios(id) on delete cascade,

    -- Suggestion details
    ticker text not null,
    action text not null check (action in ('BUY', 'SELL', 'HOLD', 'TRIM', 'ADD')),
    suggested_quantity numeric, -- Number of shares to buy/sell
    suggested_value numeric, -- Dollar value of the trade

    -- Rationale
    reason text not null, -- Human-readable explanation
    current_signal text, -- Current AI signal
    signal_confidence numeric, -- 0-100

    -- Impact analysis
    impact_on_return numeric, -- Expected % change in portfolio return
    impact_on_risk numeric, -- Expected % change in portfolio volatility
    impact_on_sector_allocation jsonb, -- Sector weights before/after

    -- Current position (if exists)
    current_shares numeric,
    current_weight_pct numeric, -- % of portfolio
    target_weight_pct numeric, -- Suggested % of portfolio

    -- Priority/ranking
    priority int, -- 1 = highest priority
    confidence_score numeric, -- 0-100, how confident we are in this suggestion

    -- Status tracking
    status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'executed')),
    executed_at timestamptz,

    -- Metadata
    generated_at timestamptz not null default now(),
    expires_at timestamptz, -- Suggestions can expire after N days
    created_at timestamptz not null default now()
);

create index if not exists idx_rebalancing_portfolio_id on portfolio_rebalancing_suggestions(portfolio_id);
create index if not exists idx_rebalancing_status on portfolio_rebalancing_suggestions(status);
create index if not exists idx_rebalancing_priority on portfolio_rebalancing_suggestions(priority);
create index if not exists idx_rebalancing_generated_at on portfolio_rebalancing_suggestions(generated_at desc);

-- =============================================================================
-- Portfolio Risk Metrics: Calculated risk measures
-- =============================================================================
create table if not exists portfolio_risk_metrics (
    id bigserial primary key,
    portfolio_id bigint not null references user_portfolios(id) on delete cascade,

    -- Date for which metrics are calculated
    as_of date not null,

    -- Return metrics
    total_return_pct numeric, -- Overall return %
    daily_return_pct numeric, -- 1-day return
    weekly_return_pct numeric, -- 7-day return
    monthly_return_pct numeric, -- 30-day return
    ytd_return_pct numeric, -- Year-to-date return

    -- Risk metrics
    volatility numeric, -- Annualized standard deviation of returns
    sharpe_ratio numeric, -- (Return - Risk-free rate) / Volatility
    sortino_ratio numeric, -- Like Sharpe but only counts downside volatility
    beta numeric, -- Correlation with market (ASX 200)
    alpha numeric, -- Excess return vs market

    -- Drawdown metrics
    max_drawdown_pct numeric, -- Largest peak-to-trough decline
    current_drawdown_pct numeric, -- Current decline from peak

    -- Concentration metrics
    top_holding_weight_pct numeric, -- % of portfolio in largest holding
    top_5_weight_pct numeric, -- % in top 5 holdings
    herfindahl_index numeric, -- Concentration measure (0-1, higher = more concentrated)

    -- Sector allocation (JSON for flexibility)
    sector_weights jsonb, -- {"Financials": 25.5, "Materials": 18.2, ...}
    signal_distribution jsonb, -- {"STRONG_BUY": 3, "BUY": 5, "HOLD": 2, ...}

    -- Benchmark comparison (vs ASX 200)
    benchmark_return_pct numeric,
    active_return_pct numeric, -- Portfolio return - benchmark return
    tracking_error numeric, -- Std dev of active returns
    information_ratio numeric, -- Active return / tracking error

    -- Metadata
    calculation_timestamp timestamptz not null default now(),
    created_at timestamptz not null default now(),

    -- Ensure one record per portfolio per day
    constraint unique_metrics_per_day unique (portfolio_id, as_of)
);

create index if not exists idx_risk_metrics_portfolio_id on portfolio_risk_metrics(portfolio_id);
create index if not exists idx_risk_metrics_as_of on portfolio_risk_metrics(as_of desc);

-- =============================================================================
-- Helper Views
-- =============================================================================

-- Portfolio summary view with latest metrics
create or replace view vw_portfolio_summary as
select
    p.id as portfolio_id,
    p.user_id,
    p.name,
    p.total_value,
    p.total_pl,
    p.total_pl_pct,
    p.cash_balance,
    p.last_synced_at,
    count(h.id) as num_holdings,
    count(case when h.current_signal in ('STRONG_BUY', 'BUY') then 1 end) as num_buy_signals,
    count(case when h.current_signal in ('STRONG_SELL', 'SELL') then 1 end) as num_sell_signals,
    rm.sharpe_ratio,
    rm.volatility,
    rm.beta,
    rm.max_drawdown_pct,
    rm.as_of as metrics_as_of
from user_portfolios p
left join user_holdings h on h.portfolio_id = p.id
left join lateral (
    select *
    from portfolio_risk_metrics
    where portfolio_id = p.id
    order by as_of desc
    limit 1
) rm on true
where p.is_active = true
group by p.id, rm.id;

-- =============================================================================
-- Functions
-- =============================================================================

-- Update portfolio totals based on holdings
create or replace function update_portfolio_totals(p_portfolio_id bigint)
returns void as $$
begin
    update user_portfolios
    set
        total_value = coalesce((
            select sum(current_value)
            from user_holdings
            where portfolio_id = p_portfolio_id
        ), 0) + coalesce(cash_balance, 0),
        total_cost_basis = coalesce((
            select sum(cost_basis)
            from user_holdings
            where portfolio_id = p_portfolio_id
        ), 0),
        total_pl = coalesce((
            select sum(unrealized_pl)
            from user_holdings
            where portfolio_id = p_portfolio_id
        ), 0),
        total_pl_pct = case
            when coalesce((
                select sum(cost_basis)
                from user_holdings
                where portfolio_id = p_portfolio_id
            ), 0) > 0 then
                (coalesce((
                    select sum(unrealized_pl)
                    from user_holdings
                    where portfolio_id = p_portfolio_id
                ), 0) / coalesce((
                    select sum(cost_basis)
                    from user_holdings
                    where portfolio_id = p_portfolio_id
                ), 1)) * 100
            else 0
        end,
        updated_at = now(),
        last_synced_at = now()
    where id = p_portfolio_id;
end;
$$ language plpgsql;

-- Sync holding prices and P&L
create or replace function sync_holding_prices(p_holding_id bigint)
returns void as $$
declare
    v_ticker text;
    v_shares numeric;
    v_avg_cost numeric;
    v_current_price numeric;
begin
    -- Get holding details
    select ticker, shares, avg_cost
    into v_ticker, v_shares, v_avg_cost
    from user_holdings
    where id = p_holding_id;

    -- Get current price from prices table
    select close into v_current_price
    from prices
    where ticker = v_ticker
    order by date desc
    limit 1;

    -- Update holding calculations
    if v_current_price is not null then
        update user_holdings
        set
            current_price = v_current_price,
            current_value = v_shares * v_current_price,
            cost_basis = v_shares * v_avg_cost,
            unrealized_pl = (v_shares * v_current_price) - (v_shares * v_avg_cost),
            unrealized_pl_pct = ((v_current_price - v_avg_cost) / nullif(v_avg_cost, 0)) * 100,
            updated_at = now()
        where id = p_holding_id;
    end if;

    -- Get current signal
    update user_holdings h
    set
        current_signal = s.signal,
        signal_confidence = s.confidence,
        signal_as_of = s.as_of,
        updated_at = now()
    from (
        select signal, confidence, as_of
        from signals
        where ticker = v_ticker
        order by as_of desc
        limit 1
    ) s
    where h.id = p_holding_id;
end;
$$ language plpgsql;

-- =============================================================================
-- Triggers
-- =============================================================================

-- Auto-update portfolio totals when holdings change
create or replace function trigger_update_portfolio_totals()
returns trigger as $$
begin
    perform update_portfolio_totals(coalesce(NEW.portfolio_id, OLD.portfolio_id));
    return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_holding_update_portfolio on user_holdings;
create trigger trg_holding_update_portfolio
    after insert or update or delete on user_holdings
    for each row
    execute function trigger_update_portfolio_totals();

-- =============================================================================
-- Comments
-- =============================================================================
comment on table user_portfolios is 'User-uploaded portfolios with holdings tracking';
comment on table user_holdings is 'Individual stock positions within a portfolio';
comment on table portfolio_rebalancing_suggestions is 'AI-generated rebalancing recommendations';
comment on table portfolio_risk_metrics is 'Calculated risk and return metrics per portfolio';
