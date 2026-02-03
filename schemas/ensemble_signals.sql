-- Ensemble signals combining Model A (momentum) and Model B (fundamentals)
CREATE TABLE IF NOT EXISTS ensemble_signals (
    id BIGSERIAL PRIMARY KEY,
    as_of DATE NOT NULL,
    symbol TEXT NOT NULL,
    -- Final ensemble signal
    signal TEXT NOT NULL, -- STRONG_BUY, BUY, HOLD, SELL, STRONG_SELL
    ensemble_score NUMERIC, -- 0-1 weighted score (60% A + 40% B)
    confidence NUMERIC,     -- combined confidence
    -- Component signals
    model_a_signal TEXT,
    model_b_signal TEXT,
    model_a_confidence NUMERIC,
    model_b_confidence NUMERIC,
    -- Conflict detection
    conflict BOOLEAN DEFAULT FALSE,
    conflict_reason TEXT,
    -- Agreement metrics
    signals_agree BOOLEAN, -- true if both models give same direction
    -- Rankings
    rank INTEGER,
    model_a_rank INTEGER,
    model_b_rank INTEGER,
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (as_of, symbol)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ensemble_signals_symbol_asof
    ON ensemble_signals(symbol, as_of DESC);

CREATE INDEX IF NOT EXISTS idx_ensemble_signals_asof
    ON ensemble_signals(as_of DESC);

CREATE INDEX IF NOT EXISTS idx_ensemble_signals_signal_type
    ON ensemble_signals(signal, as_of)
    WHERE signal IN ('STRONG_BUY', 'BUY');

CREATE INDEX IF NOT EXISTS idx_ensemble_signals_agreement
    ON ensemble_signals(signals_agree, as_of)
    WHERE signals_agree = TRUE; -- Index for agreement filter

CREATE INDEX IF NOT EXISTS idx_ensemble_signals_no_conflict
    ON ensemble_signals(conflict, as_of)
    WHERE conflict = FALSE; -- Index for no-conflict filter

CREATE INDEX IF NOT EXISTS idx_ensemble_signals_score
    ON ensemble_signals(ensemble_score DESC, as_of);

-- Comments
COMMENT ON TABLE ensemble_signals IS 'Ensemble signals combining Model A (momentum) and Model B (fundamentals)';
COMMENT ON COLUMN ensemble_signals.ensemble_score IS 'Weighted score: 60% Model A + 40% Model B';
COMMENT ON COLUMN ensemble_signals.conflict IS 'True when models give opposite signals (e.g., A=BUY, B=SELL)';
COMMENT ON COLUMN ensemble_signals.signals_agree IS 'True when both models agree on direction';
