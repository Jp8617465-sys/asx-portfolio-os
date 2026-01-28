create table if not exists fundamentals (
    id bigserial primary key,
    symbol text not null,
    sector text,
    industry text,
    pe_ratio numeric,
    pb_ratio numeric,
    eps numeric,
    roe numeric,
    debt_to_equity numeric,
    market_cap numeric,
    div_yield numeric,
    period_end date,
    updated_at timestamptz not null default now()
);

alter table fundamentals
    add column if not exists sector text,
    add column if not exists industry text,
    add column if not exists pb_ratio numeric,
    add column if not exists div_yield numeric,
    add column if not exists period_end date,
    -- V2 additions for Model B
    add column if not exists revenue_growth_yoy numeric,
    add column if not exists profit_margin numeric,
    add column if not exists current_ratio numeric,
    add column if not exists quick_ratio numeric,
    add column if not exists eps_growth numeric,
    add column if not exists free_cash_flow numeric;

create unique index if not exists fundamentals_symbol_updated_at_uidx
    on fundamentals (symbol, updated_at);
