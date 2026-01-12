create table if not exists model_a_ml_signals (
    id bigserial primary key,
    as_of date not null,
    model text not null,
    symbol text not null,
    rank integer,
    score numeric,
    ml_prob numeric,
    ml_expected_return numeric,
    created_at timestamptz not null default now(),
    unique (as_of, model, symbol)
);
