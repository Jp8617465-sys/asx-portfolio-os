"""
services/job_tracker.py
Job execution tracking utility.

Provides context manager for tracking job execution:
- Start time, end time, duration
- Success/failure status
- Records processed
- Error messages
- Output summaries
"""

import os
import json
from datetime import datetime
from contextlib import contextmanager
import psycopg2
from psycopg2.extras import Json


def get_db_connection():
    """Create database connection."""
    return psycopg2.connect(os.getenv("DATABASE_URL"))


@contextmanager
def track_job(job_name: str, job_type: str = "analytics", parameters: dict = None):
    """
    Context manager for tracking job execution.
    
    Usage:
        with track_job("portfolio_fusion", "fusion", {"param": "value"}):
            # your job code here
            pass
    
    Args:
        job_name: Name of the job (e.g., "portfolio_fusion")
        job_type: Type of job (ingestion, training, prediction, analytics, fusion)
        parameters: Optional dict of job parameters
    
    Yields:
        JobTracker instance with methods:
            - set_records_processed(count)
            - set_output_summary(summary_dict)
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    job_id = None
    started_at = datetime.utcnow()
    
    tracker = JobTracker()
    
    try:
        # Insert job start record
        cursor.execute("""
            INSERT INTO job_history (
                job_name, job_type, status, started_at, parameters
            ) VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """, (job_name, job_type, 'running', started_at, Json(parameters or {})))
        
        job_id = cursor.fetchone()[0]
        conn.commit()
        
        # Yield tracker to job
        yield tracker
        
        # Job succeeded
        completed_at = datetime.utcnow()
        duration = (completed_at - started_at).total_seconds()
        
        cursor.execute("""
            UPDATE job_history
            SET status = %s,
                completed_at = %s,
                duration_seconds = %s,
                records_processed = %s,
                output_summary = %s
            WHERE id = %s
        """, (
            'success',
            completed_at,
            duration,
            tracker.records_processed,
            Json(tracker.output_summary or {}),
            job_id
        ))
        conn.commit()
        
    except Exception as e:
        # Job failed
        if job_id:
            completed_at = datetime.utcnow()
            duration = (completed_at - started_at).total_seconds()
            
            cursor.execute("""
                UPDATE job_history
                SET status = %s,
                    completed_at = %s,
                    duration_seconds = %s,
                    error_message = %s
                WHERE id = %s
            """, ('failed', completed_at, duration, str(e), job_id))
            conn.commit()
        
        raise
        
    finally:
        cursor.close()
        conn.close()


class JobTracker:
    """Job tracking helper."""
    
    def __init__(self):
        self.records_processed = None
        self.output_summary = None
    
    def set_records_processed(self, count: int):
        """Set number of records processed."""
        self.records_processed = count
    
    def set_output_summary(self, summary: dict):
        """Set output summary dictionary."""
        self.output_summary = summary
