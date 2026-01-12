create table if not exists fundamentals (
    id bigserial primary key,
    symbol text not null,
    pe_ratio numeric,
    eps numeric,
    roe numeric,
    debt_to_equity numeric,
    market_cap numeric,
    updated_at timestamptz not null default now()
);

create unique index if not exists fundamentals_symbol_updated_at_uidx
    on fundamentals (symbol, updated_at);
