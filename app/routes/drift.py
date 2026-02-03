"""
app/routes/drift.py
Model Drift Monitoring API.
"""

from typing import Optional

from psycopg2.extras import RealDictCursor
from fastapi import APIRouter, Header, Query

from app.core import db_context, require_key

router = APIRouter(prefix="/drift", tags=["Drift Monitoring"])


@router.get("/summary")
def get_drift_summary(x_api_key: Optional[str] = Header(None)):
    """
    Get drift monitoring summary.

    Returns:
    - Latest drift scores for all features
    - Drift alerts (PSI > threshold)
    - Trend over time
    """
    require_key(x_api_key)

    with db_context() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            # Get latest drift audit
            cursor.execute("""
                SELECT
                    feature_name,
                    psi_score,
                    status,
                    baseline_start,
                    baseline_end,
                    current_start,
                    current_end,
                    created_at
                FROM model_a_drift_audit
                WHERE created_at = (SELECT MAX(created_at) FROM model_a_drift_audit)
                ORDER BY psi_score DESC
            """)

            latest_drift = cursor.fetchall()

            if not latest_drift:
                return {
                    "status": "no_data",
                    "message": "No drift data available. Run audit_drift_job.py first."
                }

            # Count drift alerts
            drift_alerts = [d for d in latest_drift if d['status'] == 'DRIFT']
            warning_alerts = [d for d in latest_drift if d['status'] == 'WARNING']

            # Get drift trend (last 7 days)
            cursor.execute("""
                SELECT
                    DATE(created_at) as date,
                    AVG(psi_score) as avg_psi,
                    MAX(psi_score) as max_psi,
                    COUNT(CASE WHEN status = 'DRIFT' THEN 1 END) as drift_count
                FROM model_a_drift_audit
                WHERE created_at > NOW() - INTERVAL '7 days'
                GROUP BY DATE(created_at)
                ORDER BY date
            """)

            trend = cursor.fetchall()

            return {
                "status": "success",
                "last_check": latest_drift[0]['created_at'].isoformat() if latest_drift else None,
                "summary": {
                    "total_features": len(latest_drift),
                    "features_with_drift": len(drift_alerts),
                    "features_with_warning": len(warning_alerts),
                    "features_stable": len(latest_drift) - len(drift_alerts) - len(warning_alerts),
                    "max_psi_score": max(d['psi_score'] for d in latest_drift) if latest_drift else 0
                },
                "drift_alerts": [
                    {
                        "feature_name": d['feature_name'],
                        "psi_score": float(d['psi_score']),
                        "status": d['status']
                    }
                    for d in drift_alerts
                ],
                "warning_alerts": [
                    {
                        "feature_name": d['feature_name'],
                        "psi_score": float(d['psi_score']),
                        "status": d['status']
                    }
                    for d in warning_alerts
                ],
                "trend": [
                    {
                        "date": t['date'].isoformat(),
                        "avg_psi": float(t['avg_psi']),
                        "max_psi": float(t['max_psi']),
                        "drift_count": t['drift_count']
                    }
                    for t in trend
                ]
            }


@router.get("/features")
def get_feature_drift(
    feature_name: Optional[str] = Query(None, description="Filter by feature name"),
    status: Optional[str] = Query(None, description="Filter by status (STABLE/WARNING/DRIFT)"),
    x_api_key: Optional[str] = Header(None)
):
    """
    Get detailed drift information for features.

    Returns PSI scores and status for all features or filtered subset.
    """
    require_key(x_api_key)

    with db_context() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            where_clauses = ["created_at = (SELECT MAX(created_at) FROM model_a_drift_audit)"]
            params = []

            if feature_name:
                where_clauses.append("feature_name = %s")
                params.append(feature_name)

            if status:
                where_clauses.append("status = %s")
                params.append(status.upper())

            where_sql = " AND ".join(where_clauses)

            cursor.execute(f"""
                SELECT
                    feature_name,
                    psi_score,
                    status,
                    baseline_start,
                    baseline_end,
                    current_start,
                    current_end,
                    created_at
                FROM model_a_drift_audit
                WHERE {where_sql}
                ORDER BY psi_score DESC
            """, params)

            features = cursor.fetchall()

            return {
                "status": "success",
                "count": len(features),
                "features": [
                    {
                        "feature_name": f['feature_name'],
                        "psi_score": float(f['psi_score']),
                        "status": f['status'],
                        "baseline_period": {
                            "start": f['baseline_start'].isoformat() if f['baseline_start'] else None,
                            "end": f['baseline_end'].isoformat() if f['baseline_end'] else None
                        },
                        "current_period": {
                            "start": f['current_start'].isoformat() if f['current_start'] else None,
                            "end": f['current_end'].isoformat() if f['current_end'] else None
                        },
                        "checked_at": f['created_at'].isoformat()
                    }
                    for f in features
                ]
            }


@router.get("/history")
def get_drift_history(
    feature_name: str = Query(..., description="Feature name to track"),
    days: int = Query(30, description="Number of days to look back"),
    x_api_key: Optional[str] = Header(None)
):
    """
    Get drift history for a specific feature over time.

    Useful for trending and understanding drift evolution.
    """
    require_key(x_api_key)

    with db_context() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("""
                SELECT
                    feature_name,
                    psi_score,
                    status,
                    created_at
                FROM model_a_drift_audit
                WHERE feature_name = %s
                  AND created_at > NOW() - INTERVAL '%s days'
                ORDER BY created_at
            """, (feature_name, days))

            history = cursor.fetchall()

            return {
                "status": "success",
                "feature_name": feature_name,
                "period_days": days,
                "count": len(history),
                "history": [
                    {
                        "psi_score": float(h['psi_score']),
                        "status": h['status'],
                        "timestamp": h['created_at'].isoformat()
                    }
                    for h in history
                ]
            }
