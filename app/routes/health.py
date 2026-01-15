"""
app/routes/health.py
Health check and debug endpoints.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Header, HTTPException

from app.core import db, require_key, logger

router = APIRouter()


@router.get("/health")
def health():
    """Health check endpoint."""
    return {"ok": True, "ts": datetime.utcnow().isoformat()}


@router.get("/debug/db_check")
def debug_db_check(x_api_key: Optional[str] = Header(default=None)):
    """Debug endpoint to check database connectivity."""
    require_key(x_api_key)
    try:
        with db() as con, con.cursor() as cur:
            cur.execute("select current_database(), current_user")
            info = cur.fetchone()
            cur.execute("select now()")
            now = cur.fetchone()[0]
        return {
            "status": "ok",
            "database": info[0],
            "user": info[1],
            "now": now.isoformat() if now else None,
        }
    except Exception as e:
        logger.exception("DB check failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
