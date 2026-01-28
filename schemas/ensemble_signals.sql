-- Ensemble signals combining Model A (momentum) and Model B (fundamentals)
create table if not exists ensemble_signals (
    id bigserial primary key,
    as_of date not null,
    symbol text not null,
    -- Final ensemble signal
    signal text not null, -- STRONG_BUY, BUY, HOLD, SELL, STRONG_SELL
    ensemble_score numeric, -- 0-1 weighted score (60% A + 40% B)
    confidence numeric,     -- combined confidence
    -- Component signals
    model_a_signal text,
    model_b_signal text,
    model_a_confidence numeric,
    model_b_confidence numeric,
    -- Conflict detection
    conflict boolean default false,
    conflict_reason text,
    -- Agreement metrics
    signals_agree boolean, -- true if both models give same direction
    -- Rankings
    rank integer,
    model_a_rank integer,
    model_b_rank integer,
    -- Metadata
    created_at timestamptz not null default now(),
    unique (as_of, symbol)
);

-- Indexes for performance
create index if not exists idx_ensemble_signals_symbol_asof
    on ensemble_signals(symbol, as_of desc);

create index if not exists idx_ensemble_signals_asof
    on ensemble_signals(as_of desc);

create index if not exists idx_ensemble_signals_signal_type
    on ensemble_signals(signal, as_of)
    where signal in ('STRONG_BUY', 'BUY');

create index if not exists idx_ensemble_signals_agreement
    on ensemble_signals(signals_agree, as_of)
    where signals_agree = true; -- Index for agreement filter

create index if not exists idx_ensemble_signals_no_conflict
    on ensemble_signals(conflict, as_of)
    where conflict = false; -- Index for no-conflict filter

create index if not exists idx_ensemble_signals_score
    on ensemble_signals(ensemble_score desc, as_of);

-- Comments
comment on table ensemble_signals is 'Ensemble signals combining Model A (momentum) and Model B (fundamentals)';
comment on column ensemble_signals.ensemble_score is 'Weighted score: 60% Model A + 40% Model B';
comment on column ensemble_signals.conflict is 'True when models give opposite signals (e.g., A=BUY, B=SELL)';
comment on column ensemble_signals.signals_agree is 'True when both models agree on direction';
