"""
app/routes/jobs.py
Job History API - Track and monitor pipeline job executions.
"""

import os
from datetime import datetime, timedelta
from typing import Optional

import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import APIRouter, HTTPException, Header, Query

from app.core import logger

router = APIRouter(prefix="/jobs", tags=["Job History"])


def get_db_connection():
    """Create database connection."""
    return psycopg2.connect(os.getenv("DATABASE_URL"))


def verify_api_key(x_api_key: Optional[str] = Header(None)):
    """Verify API key for protected endpoints."""
    expected = os.getenv("OS_API_KEY")
    if expected and x_api_key != expected:
        raise HTTPException(status_code=401, detail="Invalid API key")


@router.get("/history")
def get_job_history(
    job_name: Optional[str] = Query(None, description="Filter by job name"),
    job_type: Optional[str] = Query(None, description="Filter by job type"),
    status: Optional[str] = Query(None, description="Filter by status (running/success/failed)"),
    limit: int = Query(50, description="Maximum number of records to return"),
    x_api_key: Optional[str] = Header(None)
):
    """
    Get job execution history.
    
    Returns recent job runs with:
    - Job name, type, status
    - Start time, duration
    - Records processed
    - Error messages (if failed)
    - Output summaries
    """
    verify_api_key(x_api_key)
    
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Build query with filters
        where_clauses = []
        params = []
        
        if job_name:
            where_clauses.append("job_name = %s")
            params.append(job_name)
        
        if job_type:
            where_clauses.append("job_type = %s")
            params.append(job_type)
        
        if status:
            where_clauses.append("status = %s")
            params.append(status)
        
        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"
        params.append(limit)
        
        cursor.execute(f"""
            SELECT 
                id, job_name, job_type, status,
                started_at, completed_at, duration_seconds,
                records_processed, error_message, output_summary,
                parameters
            FROM job_history
            WHERE {where_sql}
            ORDER BY started_at DESC
            LIMIT %s
        """, params)
        
        jobs = cursor.fetchall()
        
        # Format response
        return {
            "status": "success",
            "count": len(jobs),
            "jobs": [
                {
                    "id": job['id'],
                    "job_name": job['job_name'],
                    "job_type": job['job_type'],
                    "status": job['status'],
                    "started_at": job['started_at'].isoformat(),
                    "completed_at": job['completed_at'].isoformat() if job['completed_at'] else None,
                    "duration_seconds": float(job['duration_seconds']) if job['duration_seconds'] else None,
                    "records_processed": job['records_processed'],
                    "error_message": job['error_message'],
                    "output_summary": job['output_summary'],
                    "parameters": job['parameters']
                }
                for job in jobs
            ]
        }
        
    except Exception as e:
        logger.error(f"Error fetching job history: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@router.get("/summary")
def get_job_summary(x_api_key: Optional[str] = Header(None)):
    """
    Get job execution summary statistics.
    
    Returns:
    - Total jobs run
    - Success/failure rates by job type
    - Average durations
    - Recent failures
    """
    verify_api_key(x_api_key)
    
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Overall stats
        cursor.execute("""
            SELECT 
                COUNT(*) as total_jobs,
                SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
                AVG(CASE WHEN duration_seconds IS NOT NULL THEN duration_seconds ELSE NULL END) as avg_duration
            FROM job_history
            WHERE started_at > NOW() - INTERVAL '7 days'
        """)
        
        overall = cursor.fetchone()
        
        # Stats by job type
        cursor.execute("""
            SELECT 
                job_type,
                COUNT(*) as total,
                SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                AVG(CASE WHEN duration_seconds IS NOT NULL THEN duration_seconds ELSE NULL END) as avg_duration
            FROM job_history
            WHERE started_at > NOW() - INTERVAL '7 days'
            GROUP BY job_type
            ORDER BY total DESC
        """)
        
        by_type = cursor.fetchall()
        
        # Recent failures
        cursor.execute("""
            SELECT 
                job_name, job_type, started_at, error_message
            FROM job_history
            WHERE status = 'failed'
            ORDER BY started_at DESC
            LIMIT 10
        """)
        
        recent_failures = cursor.fetchall()
        
        return {
            "status": "success",
            "time_window": "Last 7 days",
            "overall": {
                "total_jobs": overall['total_jobs'],
                "successful": overall['successful'],
                "failed": overall['failed'],
                "running": overall['running'],
                "success_rate": (overall['successful'] / overall['total_jobs'] * 100) if overall['total_jobs'] > 0 else 0,
                "avg_duration_seconds": float(overall['avg_duration']) if overall['avg_duration'] else None
            },
            "by_job_type": [
                {
                    "job_type": row['job_type'],
                    "total": row['total'],
                    "successful": row['successful'],
                    "failed": row['failed'],
                    "success_rate": (row['successful'] / row['total'] * 100) if row['total'] > 0 else 0,
                    "avg_duration_seconds": float(row['avg_duration']) if row['avg_duration'] else None
                }
                for row in by_type
            ],
            "recent_failures": [
                {
                    "job_name": f['job_name'],
                    "job_type": f['job_type'],
                    "started_at": f['started_at'].isoformat(),
                    "error_message": f['error_message']
                }
                for f in recent_failures
            ]
        }
        
    except Exception as e:
        logger.error(f"Error fetching job summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@router.get("/health")
def get_job_health(x_api_key: Optional[str] = Header(None)):
    """
    Get job health status.
    
    Returns health indicators:
    - Any jobs stuck in 'running' state
    - Recent failure rate
    - Jobs not run recently
    """
    verify_api_key(x_api_key)
    
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Find stuck jobs (running for > 2 hours)
        cursor.execute("""
            SELECT job_name, job_type, started_at
            FROM job_history
            WHERE status = 'running'
              AND started_at < NOW() - INTERVAL '2 hours'
            ORDER BY started_at
        """)
        
        stuck_jobs = cursor.fetchall()
        
        # Recent failure rate
        cursor.execute("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
            FROM job_history
            WHERE started_at > NOW() - INTERVAL '24 hours'
        """)
        
        recent = cursor.fetchone()
        failure_rate = (recent['failed'] / recent['total'] * 100) if recent['total'] > 0 else 0
        
        # Expected jobs and last run times
        cursor.execute("""
            SELECT DISTINCT ON (job_name)
                job_name, job_type, started_at, status
            FROM job_history
            ORDER BY job_name, started_at DESC
        """)
        
        last_runs = cursor.fetchall()
        
        health_status = "healthy"
        warnings = []
        
        if stuck_jobs:
            health_status = "warning"
            warnings.append(f"{len(stuck_jobs)} job(s) stuck in running state")
        
        if failure_rate > 20:
            health_status = "warning"
            warnings.append(f"High failure rate: {failure_rate:.1f}% in last 24h")
        
        return {
            "status": "success",
            "health_status": health_status,
            "warnings": warnings,
            "stuck_jobs": [
                {
                    "job_name": j['job_name'],
                    "job_type": j['job_type'],
                    "started_at": j['started_at'].isoformat(),
                    "hours_running": (datetime.utcnow() - j['started_at']).total_seconds() / 3600
                }
                for j in stuck_jobs
            ],
            "recent_failure_rate": failure_rate,
            "last_job_runs": [
                {
                    "job_name": j['job_name'],
                    "job_type": j['job_type'],
                    "last_run": j['started_at'].isoformat(),
                    "status": j['status'],
                    "hours_ago": (datetime.utcnow() - j['started_at']).total_seconds() / 3600
                }
                for j in last_runs
            ]
        }
        
    except Exception as e:
        logger.error(f"Error fetching job health: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()
