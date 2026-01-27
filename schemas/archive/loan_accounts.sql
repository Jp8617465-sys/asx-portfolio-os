create table if not exists loan_accounts (
    id bigserial primary key,
    principal numeric not null,
    annual_rate numeric not null,
    years integer not null,
    extra_payment numeric,
    monthly_payment numeric,
    total_interest numeric,
    created_at timestamptz not null default now()
);
