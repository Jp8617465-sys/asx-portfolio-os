CREATE TABLE IF NOT EXISTS model_a_ml_signals (
    id BIGSERIAL PRIMARY KEY,
    as_of DATE NOT NULL,
    model TEXT NOT NULL,
    symbol TEXT NOT NULL,
    rank INTEGER,
    score NUMERIC,
    ml_prob NUMERIC,
    ml_expected_return NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (as_of, model, symbol)
);
