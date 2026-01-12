create table if not exists model_a_features_extended (
    id bigserial primary key,
    as_of date not null,
    symbol text not null,
    features jsonb not null,
    created_at timestamptz not null default now(),
    unique (as_of, symbol)
);
