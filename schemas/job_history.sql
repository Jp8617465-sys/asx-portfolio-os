-- Job History: Track all pipeline job executions
create table if not exists job_history (
    id bigserial primary key,
    job_name text not null,
    job_type text not null, -- 'ingestion', 'training', 'prediction', 'analytics', 'fusion'
    status text not null, -- 'running', 'success', 'failed'
    started_at timestamptz not null default now(),
    completed_at timestamptz,
    duration_seconds numeric,
    
    -- Job metadata
    records_processed integer,
    error_message text,
    parameters jsonb,
    
    -- Output metrics
    output_summary jsonb,
    
    created_at timestamptz not null default now()
);

create index if not exists idx_job_history_job_name on job_history(job_name);
create index if not exists idx_job_history_status on job_history(status);
create index if not exists idx_job_history_started_at on job_history(started_at desc);
create index if not exists idx_job_history_job_type on job_history(job_type);
