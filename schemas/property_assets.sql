create table if not exists property_assets (
    id bigserial primary key,
    region text not null,
    avg_price numeric,
    avg_yield numeric,
    sample_count integer,
    created_at timestamptz not null default now()
);
