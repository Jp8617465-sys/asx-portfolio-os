"""
app/routes/health.py
Health check and debug endpoints.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import JSONResponse

from app.core import db, require_key, logger

router = APIRouter()


@router.get("/health")
def health():
    """
    Health check endpoint with database connectivity test.
    Returns 200 if healthy, 503 if unhealthy.
    """
    health_data = {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "checks": {}
    }

    # Check database connectivity
    try:
        with db() as con:
            with con.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
        health_data["checks"]["database"] = "ok"
    except Exception as e:
        health_data["status"] = "unhealthy"
        health_data["checks"]["database"] = f"error: {str(e)}"
        return JSONResponse(status_code=503, content=health_data)

    # Check if recent ML signals exist (optional - shows data freshness)
    try:
        with db() as con:
            with con.cursor() as cur:
                cur.execute("""
                    SELECT COUNT(*), MAX(signal_date)
                    FROM model_a_ml_signals
                    WHERE signal_date >= CURRENT_DATE - INTERVAL '7 days'
                """)
                count, max_date = cur.fetchone()
                health_data["checks"]["ml_signals"] = {
                    "recent_count": count,
                    "latest_date": str(max_date) if max_date else None
                }
    except Exception as e:
        # Non-critical - don't fail health check
        health_data["checks"]["ml_signals"] = f"warning: {str(e)}"

    return health_data


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
