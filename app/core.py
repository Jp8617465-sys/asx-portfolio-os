"""
app/core.py
Shared utilities, configuration, and database access.
"""

import os
import logging
import gzip
import shutil
from logging.handlers import TimedRotatingFileHandler
from datetime import datetime, date
from typing import Optional
from contextlib import contextmanager

import psycopg2
from psycopg2.pool import ThreadedConnectionPool
from fastapi import HTTPException
from dotenv import load_dotenv

load_dotenv()

def validate_environment():
    """Validate all required environment variables are set."""
    required_vars = {
        "DATABASE_URL": "PostgreSQL connection string",
        "EODHD_API_KEY": "EOD Historical Data API key",
        "OS_API_KEY": "API key for protecting endpoints",
    }

    missing = []
    for var, description in required_vars.items():
        if not os.getenv(var):
            missing.append(f"  - {var}: {description}")

    if missing:
        error_msg = "Missing required environment variables:\n" + "\n".join(missing)
        raise RuntimeError(error_msg)

# Validate environment before loading variables
validate_environment()

# Configuration
DATABASE_URL = os.environ["DATABASE_URL"]
EODHD_API_KEY = os.environ["EODHD_API_KEY"]
OS_API_KEY = os.environ["OS_API_KEY"]
ENABLE_ASSISTANT = os.getenv("ENABLE_ASSISTANT", "true").lower() in ("1", "true", "yes", "on")

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "outputs")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Logging setup
LOG_DIR = os.path.join(PROJECT_ROOT, "logs")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_PATH = os.path.join(LOG_DIR, "model_a.log")


class GZipRotator:
    """Custom compressor: gzip old logs."""
    def __call__(self, source, dest):
        with open(source, "rb") as sf, gzip.open(dest + ".gz", "wb") as df:
            shutil.copyfileobj(sf, df)
        os.remove(source)


logger = logging.getLogger("asx_portfolio_os")
logger.setLevel(logging.INFO)

# Daily rotation (keeps 14 days)
file_handler = TimedRotatingFileHandler(
    LOG_PATH,
    when="midnight",
    interval=1,
    backupCount=14,
    encoding="utf-8",
)
file_handler.suffix = "%Y-%m-%d"
file_handler.rotator = GZipRotator()

file_formatter = logging.Formatter(
    "%(asctime)s [%(levelname)s] %(message)s", "%Y-%m-%d %H:%M:%S"
)
file_handler.setFormatter(file_formatter)
logger.addHandler(file_handler)

# Console handler
console_handler = logging.StreamHandler()
console_handler.setFormatter(file_formatter)
logger.addHandler(console_handler)

logger.info("🔧 Logging initialized with daily rotation + gzip at %s", LOG_PATH)


# Database connection pool
_connection_pool = None


def get_pool():
    """Get or create connection pool."""
    global _connection_pool
    if _connection_pool is None:
        _connection_pool = ThreadedConnectionPool(
            minconn=2,
            maxconn=10,
            dsn=DATABASE_URL
        )
        logger.info("✅ Database connection pool initialized (2-10 connections)")
    return _connection_pool


def db():
    """Get connection from pool."""
    pool = get_pool()
    return pool.getconn()


def return_conn(conn):
    """Return connection to pool."""
    pool = get_pool()
    pool.putconn(conn)


@contextmanager
def db_context():
    """Context manager for pooled connections with automatic commit/rollback."""
    conn = db()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        return_conn(conn)


def require_key(x_api_key: Optional[str]):
    """Validate API key."""
    if x_api_key != OS_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")


def parse_as_of(value: str, field_name: str = "as_of") -> date:
    """Parse a date string in YYYY-MM-DD format."""
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid {field_name} format; expected YYYY-MM-DD")
