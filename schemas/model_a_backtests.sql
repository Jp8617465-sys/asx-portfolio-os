create table if not exists model_a_backtests (
    id bigserial primary key,
    as_of date not null,
    sharpe numeric,
    cagr numeric,
    max_drawdown numeric,
    created_at timestamptz not null default now()
);
