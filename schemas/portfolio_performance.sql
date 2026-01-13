create table if not exists portfolio_performance (
    id bigserial primary key,
    model text not null,
    as_of date not null,
    portfolio_return numeric,
    volatility numeric,
    sharpe numeric,
    created_at timestamptz not null default now()
);

create unique index if not exists portfolio_performance_model_asof_uidx
    on portfolio_performance (model, as_of);
