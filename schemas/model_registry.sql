create table if not exists model_registry (
    id bigserial primary key,
    model_name text not null,
    version text,
    run_id text,
    metrics jsonb,
    features jsonb,
    artifacts jsonb,
    created_at timestamptz not null default now()
);
