create table if not exists features_fundamental (
    id bigserial primary key,
    symbol text not null,
    as_of date not null,
    roe_z numeric,
    pe_inverse numeric,
    valuation_score numeric,
    quality_score numeric,
    updated_at timestamptz not null default now()
);

create unique index if not exists features_fundamental_symbol_as_of_uidx
    on features_fundamental (symbol, as_of);
