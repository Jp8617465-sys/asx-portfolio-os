"""
app/routes/health.py
Health check and debug endpoints.
"""

import os
import shutil
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Header, HTTPException

from app.core import db, require_key, logger

router = APIRouter()


@router.get("/health")
def health():
    """
    Enhanced health check endpoint with diagnostic information.
    
    Returns:
        - Basic health status
        - Database connectivity
        - Output directory writability
        - Model artifact existence
        - System resources (disk space, memory if available)
    """
    health_data = {
        "ok": True,
        "ts": datetime.utcnow().isoformat(),
        "checks": {}
    }
    
    # Database connectivity check
    try:
        with db() as con, con.cursor() as cur:
            cur.execute("SELECT 1")
            health_data["checks"]["database"] = {
                "status": "ok",
                "message": "Database connection successful"
            }
    except Exception as e:
        health_data["ok"] = False
        health_data["checks"]["database"] = {
            "status": "error",
            "message": str(e)
        }
        logger.error(f"Health check - Database error: {e}")
    
    # Output directory writability check
    output_dirs = ["/app/outputs", "outputs", "data/training"]
    dir_checks = {}
    for dir_path in output_dirs:
        try:
            # Check if directory exists
            exists = os.path.exists(dir_path)
            
            # Try to create if it doesn't exist
            if not exists:
                try:
                    os.makedirs(dir_path, exist_ok=True)
                    exists = True
                except:
                    pass
            
            # Test write permissions
            writable = False
            if exists:
                test_file = os.path.join(dir_path, ".health_check_test")
                try:
                    with open(test_file, 'w') as f:
                        f.write("test")
                    os.remove(test_file)
                    writable = True
                except:
                    pass
            
            dir_checks[dir_path] = {
                "exists": exists,
                "writable": writable,
                "status": "ok" if (exists and writable) else "warning"
            }
            
            if not (exists and writable):
                health_data["ok"] = False
        except Exception as e:
            dir_checks[dir_path] = {
                "status": "error",
                "message": str(e)
            }
            health_data["ok"] = False
    
    health_data["checks"]["output_directories"] = dir_checks
    
    # Model artifact existence check
    model_files = [
        "outputs/model_a_v1_4.pkl",
        "outputs/model_a_v1_3.pkl",
        "outputs/model_a_v1_1.pkl",
    ]
    
    model_checks = {}
    models_found = 0
    for model_path in model_files:
        exists = os.path.exists(model_path)
        if exists:
            models_found += 1
            size = os.path.getsize(model_path)
            model_checks[model_path] = {
                "exists": True,
                "size_bytes": size,
                "status": "ok"
            }
        else:
            model_checks[model_path] = {
                "exists": False,
                "status": "not_found"
            }
    
    health_data["checks"]["model_artifacts"] = {
        "total_checked": len(model_files),
        "found": models_found,
        "files": model_checks,
        "status": "ok" if models_found > 0 else "warning"
    }
    
    # Disk space check
    try:
        stat = shutil.disk_usage("/")
        health_data["checks"]["disk_space"] = {
            "total_gb": round(stat.total / (1024**3), 2),
            "used_gb": round(stat.used / (1024**3), 2),
            "free_gb": round(stat.free / (1024**3), 2),
            "percent_used": round(stat.used / stat.total * 100, 2),
            "status": "ok" if stat.free / stat.total > 0.1 else "warning"
        }
    except Exception as e:
        health_data["checks"]["disk_space"] = {
            "status": "error",
            "message": str(e)
        }
    
    # Working directory info
    health_data["checks"]["environment"] = {
        "working_directory": os.getcwd(),
        "status": "ok"
    }
    
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
