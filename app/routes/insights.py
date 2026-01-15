"""
app/routes/insights.py
Feature importance and ASX announcements insights endpoints.
"""

import os
import json
import glob
from datetime import datetime
from typing import Optional

import psycopg2
from fastapi import APIRouter, Header, HTTPException

from app.core import db, require_key, logger, PROJECT_ROOT, OUTPUT_DIR

router = APIRouter()


def _load_latest_feature_importance():
    """Load feature importance from training summary files."""
    summary_paths = sorted(glob.glob(os.path.join(PROJECT_ROOT, "models", "model_a_training_summary_*.txt")))
    if not summary_paths:
        return None

    latest_path = summary_paths[-1]
    features = []
    started = False

    with open(latest_path, "r") as f:
        for line in f:
            if line.strip().startswith("Top Features"):
                started = True
                continue
            if not started:
                continue
            if not line.strip():
                continue
            if "feature" in line and "importance" in line:
                continue

            parts = line.strip().split()
            if len(parts) < 2:
                continue
            importance = parts[-1]
            feature = " ".join(parts[:-1])
            try:
                features.append({"feature": feature, "importance": float(importance)})
            except ValueError:
                continue

    updated_at = datetime.utcfromtimestamp(os.path.getmtime(latest_path)).isoformat()
    return {"path": latest_path, "updated_at": updated_at, "features": features}


def _load_feature_importance_from_db(model_name: str, model_version: str, limit: int):
    """Load feature importance from database."""
    try:
        with db() as con, con.cursor() as cur:
            cur.execute(
                """
                select feature, importance
                from model_feature_importance
                where model_name = %s and model_version = %s
                order by importance desc nulls last, created_at desc
                limit %s
                """,
                (model_name, model_version, limit),
            )
            rows = cur.fetchall()
    except psycopg2.errors.UndefinedTable:
        return None
    except Exception as exc:
        logger.exception("Feature importance DB fallback failed: %s", exc)
        return None

    if not rows:
        return None

    features = []
    for row in rows:
        features.append({
            "feature": row[0],
            "importance": float(row[1]) if row[1] is not None else None,
        })
    return {"source": "db", "features": features}


@router.get("/insights/feature-importance")
def feature_importance_summary(
    model: str = "model_a_ml",
    limit: int = 10,
    x_api_key: Optional[str] = Header(default=None),
):
    """Get feature importance summary."""
    require_key(x_api_key)

    data = _load_latest_feature_importance()
    if not data:
        raise HTTPException(status_code=404, detail="No training summaries found.")

    return {
        "status": "ok",
        "model": model,
        "source": data["path"],
        "updated_at": data["updated_at"],
        "features": data["features"][:limit],
    }


@router.get("/model/explainability")
def model_explainability(
    model_version: str = "v1_2",
    model_name: str = "model_a_ml",
    limit: int = 20,
    x_api_key: Optional[str] = Header(default=None),
):
    """Get model explainability data (feature importance)."""
    require_key(x_api_key)

    candidates = [
        os.path.join(OUTPUT_DIR, f"feature_importance_{model_version}.json"),
        os.path.join(PROJECT_ROOT, f"feature_importance_{model_version}.json"),
        os.path.join(PROJECT_ROOT, "outputs", "feature_importance_latest.json"),
        os.path.join(PROJECT_ROOT, "models", f"feature_importance_{model_version}.json"),
    ]
    path = next((p for p in candidates if os.path.exists(p)), None)

    if not path:
        db_fallback = _load_feature_importance_from_db(model_name, model_version, limit)
        if db_fallback:
            return {
                "status": "ok",
                "model_version": model_version,
                "source": db_fallback["source"],
                "features": db_fallback["features"],
            }
        fallback = _load_latest_feature_importance()
        if fallback:
            return {
                "status": "ok",
                "model_version": model_version,
                "path": fallback["path"],
                "features": fallback["features"][:limit],
            }
        raise HTTPException(status_code=404, detail="No feature importance data found.")

    try:
        with open(path, "r") as f:
            payload = json.load(f)
    except Exception as exc:
        logger.exception("Failed to read feature importance file: %s", exc)
        db_fallback = _load_feature_importance_from_db(model_name, model_version, limit)
        if db_fallback:
            return {
                "status": "ok",
                "model_version": model_version,
                "source": db_fallback["source"],
                "features": db_fallback["features"],
            }
        raise HTTPException(status_code=500, detail=f"Failed to read feature importance: {exc}")

    if isinstance(payload, dict):
        rows = payload.get("features") or payload.get("data") or []
    else:
        rows = payload

    if not isinstance(rows, list):
        raise HTTPException(status_code=500, detail="Invalid feature importance format.")

    trimmed = rows[:limit]
    return {"status": "ok", "model_version": model_version, "path": path, "features": trimmed}


@router.get("/insights/asx_announcements")
def asx_announcements_summary(
    limit: int = 10,
    lookback_days: int = 30,
    x_api_key: Optional[str] = Header(default=None),
):
    """Get ASX announcements summary with sentiment analysis."""
    require_key(x_api_key)
    try:
        with db() as con, con.cursor() as cur:
            cur.execute(
                """
                select dt, code, headline, sentiment, event_type, confidence, stance, relevance_score, source
                from nlp_announcements
                order by dt desc, created_at desc
                limit %s
                """,
                (limit,),
            )
            rows = cur.fetchall()

            cur.execute(
                """
                select sentiment, count(*)
                from nlp_announcements
                where dt >= current_date - (%s * interval '1 day')
                group by sentiment
                """,
                (lookback_days,),
            )
            sentiment_rows = cur.fetchall()

            cur.execute(
                """
                select event_type, count(*)
                from nlp_announcements
                where dt >= current_date - (%s * interval '1 day')
                group by event_type
                """,
                (lookback_days,),
            )
            event_rows = cur.fetchall()
    except psycopg2.errors.UndefinedTable:
        raise HTTPException(status_code=404, detail="nlp_announcements table not found")
    except Exception as exc:
        logger.exception("ASX announcements summary failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))

    items = [
        {
            "dt": row[0].isoformat() if row[0] else None,
            "code": row[1],
            "headline": row[2],
            "sentiment": row[3],
            "event_type": row[4],
            "confidence": float(row[5]) if row[5] is not None else None,
            "stance": row[6],
            "relevance_score": float(row[7]) if row[7] is not None else None,
            "source": row[8],
        }
        for row in rows
    ]
    sentiment_counts = {str(row[0] or "unknown").lower(): int(row[1]) for row in sentiment_rows}
    event_counts = {str(row[0] or "unknown").lower(): int(row[1]) for row in event_rows}

    return {
        "status": "ok",
        "limit": int(limit),
        "lookback_days": int(lookback_days),
        "items": items,
        "summary": {
            "sentiment_counts": sentiment_counts,
            "event_counts": event_counts,
        },
    }


@router.post("/ingest/asx_announcements")
def ingest_asx_announcements(
    limit: int = 20,
    x_api_key: Optional[str] = Header(default=None),
):
    """Trigger ASX announcements scraper."""
    require_key(x_api_key)
    try:
        from jobs.asx_announcements_scraper import run_scraper
        df = run_scraper(limit=limit)
        return {"status": "ok", "rows": int(len(df))}
    except Exception as e:
        logger.exception("ASX announcements ingestion failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
