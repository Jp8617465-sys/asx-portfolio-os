CREATE TABLE IF NOT EXISTS model_feature_importance (
    id BIGSERIAL PRIMARY KEY,
    model_name TEXT NOT NULL,
    model_version TEXT NOT NULL,
    feature TEXT NOT NULL,
    importance NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS model_feature_importance_uidx
    ON model_feature_importance (model_name, model_version, feature);
