create table if not exists fundamentals (
    id bigserial primary key,
    symbol text not null,
    pe_ratio numeric,
    pb_ratio numeric,
    eps numeric,
    roe numeric,
    debt_to_equity numeric,
    market_cap numeric,
    period_end date,
    updated_at timestamptz not null default now()
);

alter table fundamentals
    add column if not exists pb_ratio numeric,
    add column if not exists period_end date;

create unique index if not exists fundamentals_symbol_updated_at_uidx
    on fundamentals (symbol, updated_at);
