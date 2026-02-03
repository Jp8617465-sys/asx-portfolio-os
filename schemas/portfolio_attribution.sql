CREATE TABLE IF NOT EXISTS portfolio_attribution (
    id BIGSERIAL PRIMARY KEY,
    model TEXT NOT NULL,
    as_of DATE NOT NULL,
    symbol TEXT NOT NULL,
    weight NUMERIC,
    return_1d NUMERIC,
    contribution NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS portfolio_attribution_model_asof_idx
    ON portfolio_attribution (model, as_of);
