CREATE TABLE IF NOT EXISTS model_a_drift_audit (
    id BIGSERIAL PRIMARY KEY,
    model TEXT NOT NULL,
    baseline_label TEXT NOT NULL,
    current_label TEXT NOT NULL,
    metrics JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
