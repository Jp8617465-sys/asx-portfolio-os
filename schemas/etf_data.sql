create table if not exists etf_data (
    id bigserial primary key,
    symbol text not null,
    etf_name text,
    sector text,
    nav numeric,
    flow_1w numeric,
    flow_1m numeric,
    updated_at timestamptz not null default now()
);

create unique index if not exists etf_data_symbol_uidx
    on etf_data (symbol);
