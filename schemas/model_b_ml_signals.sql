-- Model B (fundamentals) ML signals table
create table if not exists model_b_ml_signals (
    id bigserial primary key,
    as_of date not null,
    model text not null default 'model_b_v1_0',
    symbol text not null,
    signal text not null, -- BUY, HOLD, SELL
    quality_score text,   -- A, B, C, D, F (fundamental quality grade)
    confidence numeric,   -- 0-1 probability
    ml_prob numeric,      -- probability of positive return
    ml_expected_return numeric, -- expected return %
    -- Key fundamental metrics at signal time
    pe_ratio numeric,
    pb_ratio numeric,
    roe numeric,
    debt_to_equity numeric,
    profit_margin numeric,
    -- Metadata
    rank integer,
    score numeric,        -- composite score
    created_at timestamptz not null default now(),
    unique (as_of, model, symbol)
);

-- Indexes for performance
create index if not exists idx_model_b_signals_symbol_asof
    on model_b_ml_signals(symbol, as_of desc);

create index if not exists idx_model_b_signals_asof_model
    on model_b_ml_signals(as_of, model);

create index if not exists idx_model_b_signals_quality
    on model_b_ml_signals(quality_score, as_of)
    where quality_score in ('A', 'B'); -- Index high-quality signals

create index if not exists idx_model_b_signals_signal_type
    on model_b_ml_signals(signal, as_of)
    where signal in ('BUY', 'STRONG_BUY');

-- Comments
comment on table model_b_ml_signals is 'Model B (fundamental analysis) trading signals';
comment on column model_b_ml_signals.quality_score is 'A=Excellent, B=Good, C=Fair, D=Poor, F=Fail';
comment on column model_b_ml_signals.confidence is 'Model confidence in signal (0-1)';
comment on column model_b_ml_signals.signal is 'Trading signal: BUY, HOLD, SELL';
