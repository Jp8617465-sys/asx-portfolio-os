"""
jobs/db_utils.py
Shared database utilities for job scripts.

Provides a standardized way to get database connections for batch jobs.
This module mirrors the connection pool from app/core.py but is designed
for standalone job execution.
"""

import os
from contextlib import contextmanager
from typing import Generator

import psycopg2
from psycopg2.pool import ThreadedConnectionPool

# Connection pool for jobs
_job_pool = None


def get_database_url() -> str:
    """Get database URL from environment."""
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL environment variable not set")
    return url


def get_job_pool() -> ThreadedConnectionPool:
    """Get or create connection pool for jobs."""
    global _job_pool
    if _job_pool is None:
        _job_pool = ThreadedConnectionPool(
            minconn=2,
            maxconn=10,
            dsn=get_database_url()
        )
    return _job_pool


@contextmanager
def get_connection() -> Generator:
    """
    Context manager for getting a database connection from the pool.

    Usage:
        from jobs.db_utils import get_connection

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")

    The connection is automatically committed on success and
    rolled back on exception.
    """
    pool = get_job_pool()
    conn = pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)


@contextmanager
def get_raw_connection() -> Generator:
    """
    Context manager for a direct psycopg2 connection (not pooled).

    Use this for long-running jobs that need to hold a connection
    for extended periods, or when running outside the main app.

    Usage:
        from jobs.db_utils import get_raw_connection

        with get_raw_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
    """
    conn = psycopg2.connect(get_database_url())
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def close_pool():
    """Close the connection pool (call on shutdown)."""
    global _job_pool
    if _job_pool:
        _job_pool.closeall()
        _job_pool = None
