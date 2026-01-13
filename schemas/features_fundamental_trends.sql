create table if not exists features_fundamental_trends (
    id bigserial primary key,
    symbol text not null,
    metric text not null,
    window_size integer not null,
    mean_value numeric,
    pct_change numeric,
    slope numeric,
    volatility numeric,
    as_of date not null,
    created_at timestamptz not null default now()
);

create unique index if not exists features_fundamental_trends_uidx
    on features_fundamental_trends (symbol, metric, window_size, as_of);
