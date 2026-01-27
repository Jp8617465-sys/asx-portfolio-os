create table if not exists risk_exposure_snapshot (
    id bigserial primary key,
    symbol text not null,
    as_of date not null,
    sector text,
    factor_vol numeric,
    beta_market numeric,
    factor_corr jsonb,
    created_at timestamptz not null default now()
);

create unique index if not exists risk_exposure_snapshot_uidx
    on risk_exposure_snapshot (symbol, as_of);
