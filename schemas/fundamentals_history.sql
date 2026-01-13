create table if not exists fundamentals_history (
    id bigserial primary key,
    symbol text not null,
    as_of date not null,
    metric text not null,
    value numeric,
    source text default 'eodhd',
    created_at timestamptz not null default now()
);

create unique index if not exists fundamentals_history_symbol_asof_metric_uidx
    on fundamentals_history (symbol, as_of, metric);
