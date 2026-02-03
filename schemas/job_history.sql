-- Job History: Track all pipeline job executions
CREATE TABLE IF NOT EXISTS job_history (
    id BIGSERIAL PRIMARY KEY,
    job_name TEXT NOT NULL,
    job_type TEXT NOT NULL, -- 'ingestion', 'training', 'prediction', 'analytics', 'fusion'
    status TEXT NOT NULL, -- 'running', 'success', 'failed'
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_seconds NUMERIC,
    
    -- Job metadata
    records_processed INTEGER,
    error_message TEXT,
    parameters JSONB,
    
    -- Output metrics
    output_summary JSONB,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_history_job_name ON job_history(job_name);
CREATE INDEX IF NOT EXISTS idx_job_history_status ON job_history(status);
CREATE INDEX IF NOT EXISTS idx_job_history_started_at ON job_history(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_history_job_type ON job_history(job_type);
