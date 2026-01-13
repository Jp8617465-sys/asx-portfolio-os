create table if not exists model_feature_importance (
    id bigserial primary key,
    model_name text not null,
    model_version text not null,
    feature text not null,
    importance numeric,
    created_at timestamptz not null default now()
);

create unique index if not exists model_feature_importance_uidx
    on model_feature_importance (model_name, model_version, feature);
