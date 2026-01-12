create table if not exists macro_data (
    id bigserial primary key,
    dt date not null,
    rba_cash_rate numeric,
    cpi numeric,
    unemployment numeric,
    yield_2y numeric,
    yield_10y numeric,
    yield_curve_slope numeric,
    updated_at timestamptz not null default now(),
    unique (dt)
);
