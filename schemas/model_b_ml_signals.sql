-- Model B (fundamentals) ML signals table
CREATE TABLE IF NOT EXISTS model_b_ml_signals (
    id BIGSERIAL PRIMARY KEY,
    as_of DATE NOT NULL,
    model TEXT NOT NULL DEFAULT 'model_b_v1_0',
    symbol TEXT NOT NULL,
    signal TEXT NOT NULL, -- BUY, HOLD, SELL
    quality_score TEXT,   -- A, B, C, D, F (fundamental quality grade)
    confidence NUMERIC,   -- 0-1 probability
    ml_prob NUMERIC,      -- probability of positive return
    ml_expected_return NUMERIC, -- expected return %
    -- Key fundamental metrics at signal time
    pe_ratio NUMERIC,
    pb_ratio NUMERIC,
    roe NUMERIC,
    debt_to_equity NUMERIC,
    profit_margin NUMERIC,
    -- Metadata
    rank INTEGER,
    score NUMERIC,        -- composite score
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (as_of, model, symbol)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_model_b_signals_symbol_asof
    ON model_b_ml_signals(symbol, as_of DESC);

CREATE INDEX IF NOT EXISTS idx_model_b_signals_asof_model
    ON model_b_ml_signals(as_of, model);

CREATE INDEX IF NOT EXISTS idx_model_b_signals_quality
    ON model_b_ml_signals(quality_score, as_of)
    WHERE quality_score IN ('A', 'B'); -- Index high-quality signals

CREATE INDEX IF NOT EXISTS idx_model_b_signals_signal_type
    ON model_b_ml_signals(signal, as_of)
    WHERE signal IN ('BUY', 'STRONG_BUY');

-- Comments
COMMENT ON TABLE model_b_ml_signals IS 'Model B (fundamental analysis) trading signals';
COMMENT ON COLUMN model_b_ml_signals.quality_score IS 'A=Excellent, B=Good, C=Fair, D=Poor, F=Fail';
COMMENT ON COLUMN model_b_ml_signals.confidence IS 'Model confidence in signal (0-1)';
COMMENT ON COLUMN model_b_ml_signals.signal IS 'Trading signal: BUY, HOLD, SELL';
