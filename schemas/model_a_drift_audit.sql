create table if not exists model_a_drift_audit (
    id bigserial primary key,
    model text not null,
    baseline_label text not null,
    current_label text not null,
    metrics jsonb not null,
    created_at timestamptz not null default now()
);
