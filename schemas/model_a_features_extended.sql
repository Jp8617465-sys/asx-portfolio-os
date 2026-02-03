CREATE TABLE IF NOT EXISTS model_a_features_extended (
    id BIGSERIAL PRIMARY KEY,
    as_of DATE NOT NULL,
    symbol TEXT NOT NULL,
    features JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (as_of, symbol)
);
