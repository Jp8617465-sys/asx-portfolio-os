"""
app/features/alerts/routes/alert_routes.py
Feature-based API routes for price alert operations.

Thin controller layer -- delegates to direct DB queries via psycopg2 RealDictCursor.
Uses db_context() for database access and require_key() for authentication.
Follows the same pattern as app/features/etf/routes/etf_routes.py.
"""

from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from psycopg2 import IntegrityError
from psycopg2.extras import RealDictCursor

from app.contracts.types import CreateAlertRequest
from app.core import db_context, require_key, logger

router = APIRouter()


# ===========================================================================
# GET /api/alerts
# ===========================================================================

@router.get("/api/alerts")
def get_alerts(
    x_api_key: Optional[str] = Header(default=None),
):
    """
    Get all price alerts for the current user.

    Returns:
        Dictionary with status, count, and list of alerts.
    """
    require_key(x_api_key)

    # TODO: resolve user_id from JWT in production
    user_id = 1

    try:
        with db_context() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute(
                """
                SELECT id, user_id, symbol, alert_type, threshold, status,
                       notification_channel, created_at, triggered_at, current_price
                FROM price_alerts
                WHERE user_id = %s
                ORDER BY created_at DESC
                """,
                (user_id,),
            )
            rows = cur.fetchall()

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to fetch alerts: %s", e)
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    alerts = [
        {
            "id": r["id"],
            "user_id": r["user_id"],
            "symbol": r["symbol"],
            "alert_type": r["alert_type"],
            "threshold": float(r["threshold"]) if r.get("threshold") is not None else None,
            "status": r["status"],
            "notification_channel": r.get("notification_channel", "email"),
            "created_at": str(r["created_at"]) if r.get("created_at") else None,
            "triggered_at": str(r["triggered_at"]) if r.get("triggered_at") else None,
            "current_price": float(r["current_price"]) if r.get("current_price") is not None else None,
        }
        for r in rows
    ]

    return {
        "status": "ok",
        "count": len(alerts),
        "alerts": alerts,
    }


# ===========================================================================
# POST /api/alerts
# ===========================================================================

@router.post("/api/alerts", status_code=201)
def create_alert(
    payload: CreateAlertRequest,
    x_api_key: Optional[str] = Header(default=None),
):
    """
    Create a new price alert.

    Returns:
        Dictionary with status and the created alert.
    """
    require_key(x_api_key)

    # TODO: resolve user_id from JWT in production
    user_id = 1

    try:
        with db_context() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute(
                """
                INSERT INTO price_alerts (user_id, symbol, alert_type, threshold, notification_channel)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, user_id, symbol, alert_type, threshold, status,
                          notification_channel, created_at, triggered_at, current_price
                """,
                (user_id, payload.symbol, payload.alert_type, payload.threshold, payload.notification_channel),
            )
            row = cur.fetchone()

    except IntegrityError:
        raise HTTPException(
            status_code=409,
            detail="An alert with this symbol, type, and threshold already exists",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to create alert: %s", e)
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    alert = {
        "id": row["id"],
        "user_id": row["user_id"],
        "symbol": row["symbol"],
        "alert_type": row["alert_type"],
        "threshold": float(row["threshold"]) if row.get("threshold") is not None else None,
        "status": row["status"],
        "notification_channel": row.get("notification_channel", "email"),
        "created_at": str(row["created_at"]) if row.get("created_at") else None,
        "triggered_at": str(row["triggered_at"]) if row.get("triggered_at") else None,
        "current_price": float(row["current_price"]) if row.get("current_price") is not None else None,
    }

    return {"status": "ok", "alert": alert}


# ===========================================================================
# PUT /api/alerts/{alert_id}
# ===========================================================================

@router.put("/api/alerts/{alert_id}")
def update_alert(
    alert_id: int,
    payload: CreateAlertRequest,
    x_api_key: Optional[str] = Header(default=None),
):
    """
    Update an existing price alert.

    Returns:
        Dictionary with status and the updated alert.
    """
    require_key(x_api_key)

    # TODO: resolve user_id from JWT in production
    user_id = 1

    try:
        with db_context() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)

            # Verify ownership
            cur.execute(
                "SELECT id, user_id FROM price_alerts WHERE id = %s",
                (alert_id,),
            )
            existing = cur.fetchone()

            if existing is None:
                raise HTTPException(status_code=404, detail="Alert not found")

            if existing["user_id"] != user_id:
                raise HTTPException(status_code=403, detail="Not authorized")

            # Update
            cur.execute(
                """
                UPDATE price_alerts
                SET symbol = %s, alert_type = %s, threshold = %s, notification_channel = %s
                WHERE id = %s
                RETURNING id, user_id, symbol, alert_type, threshold, status,
                          notification_channel, created_at, triggered_at, current_price
                """,
                (payload.symbol, payload.alert_type, payload.threshold, payload.notification_channel, alert_id),
            )
            row = cur.fetchone()

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to update alert %s: %s", alert_id, e)
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    alert = {
        "id": row["id"],
        "user_id": row["user_id"],
        "symbol": row["symbol"],
        "alert_type": row["alert_type"],
        "threshold": float(row["threshold"]) if row.get("threshold") is not None else None,
        "status": row["status"],
        "notification_channel": row.get("notification_channel", "email"),
        "created_at": str(row["created_at"]) if row.get("created_at") else None,
        "triggered_at": str(row["triggered_at"]) if row.get("triggered_at") else None,
        "current_price": float(row["current_price"]) if row.get("current_price") is not None else None,
    }

    return {"status": "ok", "alert": alert}


# ===========================================================================
# DELETE /api/alerts/{alert_id}
# ===========================================================================

@router.delete("/api/alerts/{alert_id}")
def delete_alert(
    alert_id: int,
    x_api_key: Optional[str] = Header(default=None),
):
    """
    Delete a price alert.

    Returns:
        Dictionary with status and message.
    """
    require_key(x_api_key)

    # TODO: resolve user_id from JWT in production
    user_id = 1

    try:
        with db_context() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)

            # Verify ownership
            cur.execute(
                "SELECT id, user_id FROM price_alerts WHERE id = %s",
                (alert_id,),
            )
            existing = cur.fetchone()

            if existing is None:
                raise HTTPException(status_code=404, detail="Alert not found")

            if existing["user_id"] != user_id:
                raise HTTPException(status_code=403, detail="Not authorized")

            # Delete
            cur.execute(
                "DELETE FROM price_alerts WHERE id = %s",
                (alert_id,),
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to delete alert %s: %s", alert_id, e)
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    return {"status": "ok", "message": "Alert deleted"}


# ===========================================================================
# GET /api/alerts/history
# ===========================================================================

@router.get("/api/alerts/history")
def get_alert_history(
    x_api_key: Optional[str] = Header(default=None),
):
    """
    Get alert trigger history for the current user.

    Returns:
        Dictionary with status, count, and history records.
    """
    require_key(x_api_key)

    # TODO: resolve user_id from JWT in production
    user_id = 1

    try:
        with db_context() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute(
                """
                SELECT ah.id, ah.alert_id, ah.symbol, ah.alert_type,
                       ah.threshold, ah.triggered_at, ah.price_at_trigger,
                       ah.notification_sent
                FROM alert_history ah
                JOIN price_alerts pa ON pa.id = ah.alert_id
                WHERE pa.user_id = %s
                ORDER BY ah.triggered_at DESC
                """,
                (user_id,),
            )
            rows = cur.fetchall()

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to fetch alert history: %s", e)
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    history = [
        {
            "id": r["id"],
            "alert_id": r["alert_id"],
            "symbol": r["symbol"],
            "alert_type": r["alert_type"],
            "threshold": float(r["threshold"]) if r.get("threshold") is not None else None,
            "triggered_at": str(r["triggered_at"]) if r.get("triggered_at") else None,
            "price_at_trigger": float(r["price_at_trigger"]) if r.get("price_at_trigger") is not None else None,
            "notification_sent": r.get("notification_sent", False),
        }
        for r in rows
    ]

    return {
        "status": "ok",
        "count": len(history),
        "history": history,
    }
