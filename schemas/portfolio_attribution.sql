create table if not exists portfolio_attribution (
    id bigserial primary key,
    model text not null,
    as_of date not null,
    symbol text not null,
    weight numeric,
    return_1d numeric,
    contribution numeric,
    created_at timestamptz not null default now()
);

create index if not exists portfolio_attribution_model_asof_idx
    on portfolio_attribution (model, as_of);
