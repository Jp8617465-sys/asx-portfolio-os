create table if not exists etf_data (
    id bigserial primary key,
    symbol text not null,
    etf_name text,
    sector text,
    nav numeric,
    return_1w numeric,
    return_1m numeric,
    sector_flow_1w numeric,
    sector_flow_1m numeric,
    flow_1w numeric,
    flow_1m numeric,
    updated_at timestamptz not null default now()
);

alter table etf_data
    add column if not exists return_1w numeric,
    add column if not exists return_1m numeric,
    add column if not exists sector_flow_1w numeric,
    add column if not exists sector_flow_1m numeric;

create unique index if not exists etf_data_symbol_uidx
    on etf_data (symbol);
