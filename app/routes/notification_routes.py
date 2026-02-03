"""
app/routes/notification_routes.py
Notification and alert preference endpoints.
"""

from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel

from app.auth import get_current_user_id
from app.core import db_context, logger

router = APIRouter(prefix="/notifications", tags=["Notifications"])


# Request/Response Models
class Notification(BaseModel):
    notification_id: int
    notification_type: str
    title: str
    message: str
    data: Optional[Dict[str, Any]] = None
    is_read: bool
    priority: str
    created_at: str
    read_at: Optional[str] = None


class NotificationList(BaseModel):
    notifications: List[Notification]
    total_count: int
    unread_count: int


class AlertPreference(BaseModel):
    alert_type: str
    enabled: bool
    settings: Dict[str, Any]


class AlertPreferencesResponse(BaseModel):
    preferences: List[AlertPreference]


class UpdateAlertPreferenceRequest(BaseModel):
    enabled: Optional[bool] = None
    settings: Optional[Dict[str, Any]] = None


@router.get("", response_model=NotificationList)
async def get_notifications(
    user_id: int = Depends(get_current_user_id),
    unread_only: bool = Query(False, description="Return only unread notifications"),
    limit: int = Query(50, ge=1, le=200, description="Maximum number of notifications to return"),
    offset: int = Query(0, ge=0, description="Number of notifications to skip")
):
    """
    Get user's notifications.

    **Query Parameters**:
    - unread_only: If true, return only unread notifications
    - limit: Maximum number of notifications (1-200, default 50)
    - offset: Number of notifications to skip for pagination

    **Returns**:
    - notifications: List of notification objects
    - total_count: Total number of notifications matching criteria
    - unread_count: Total number of unread notifications
    """
    with db_context() as conn:
        cur = conn.cursor()

        # Build query
        where_clause = "WHERE user_id = %s"
        params = [user_id]

        if unread_only:
            where_clause += " AND is_read = FALSE"

        # Get total count
        cur.execute(
            f"SELECT COUNT(*) FROM notifications {where_clause}",
            params
        )
        total_count = cur.fetchone()[0]

        # Get unread count
        cur.execute(
            "SELECT COUNT(*) FROM notifications WHERE user_id = %s AND is_read = FALSE",
            (user_id,)
        )
        unread_count = cur.fetchone()[0]

        # Get notifications
        cur.execute(
            f"""
            SELECT
                notification_id,
                notification_type,
                title,
                message,
                data,
                is_read,
                priority,
                created_at,
                read_at
            FROM notifications
            {where_clause}
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
            """,
            params + [limit, offset]
        )

        notifications = []
        for row in cur.fetchall():
            notifications.append({
                "notification_id": row[0],
                "notification_type": row[1],
                "title": row[2],
                "message": row[3],
                "data": row[4],
                "is_read": row[5],
                "priority": row[6],
                "created_at": row[7].isoformat(),
                "read_at": row[8].isoformat() if row[8] else None,
            })

        return {
            "notifications": notifications,
            "total_count": total_count,
            "unread_count": unread_count
        }


@router.put("/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: int,
    user_id: int = Depends(get_current_user_id)
):
    """
    Mark a notification as read.

    **Path Parameters**:
    - notification_id: ID of notification to mark as read

    **Returns**:
    - Success message
    """
    with db_context() as conn:
        cur = conn.cursor()

        # Verify notification belongs to user
        cur.execute(
            "SELECT user_id, is_read FROM notifications WHERE notification_id = %s",
            (notification_id,)
        )
        row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Notification not found")

        if row[0] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to access this notification")

        if row[1]:
            # Already read
            return {"message": "Notification already marked as read"}

        # Mark as read
        cur.execute(
            """
            UPDATE notifications
            SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
            WHERE notification_id = %s
            """,
            (notification_id,)
        )
        conn.commit()

        logger.info(f"Notification {notification_id} marked as read by user {user_id}")

        return {"message": "Notification marked as read"}


@router.post("/mark-all-read")
async def mark_all_notifications_as_read(user_id: int = Depends(get_current_user_id)):
    """
    Mark all user's notifications as read.

    **Returns**:
    - Number of notifications marked as read
    """
    with db_context() as conn:
        cur = conn.cursor()

        cur.execute(
            """
            UPDATE notifications
            SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
            WHERE user_id = %s AND is_read = FALSE
            """,
            (user_id,)
        )
        count = cur.rowcount
        conn.commit()

        logger.info(f"Marked {count} notifications as read for user {user_id}")

        return {"message": f"Marked {count} notifications as read", "count": count}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: int,
    user_id: int = Depends(get_current_user_id)
):
    """
    Delete a notification.

    **Path Parameters**:
    - notification_id: ID of notification to delete

    **Returns**:
    - Success message
    """
    with db_context() as conn:
        cur = conn.cursor()

        # Verify notification belongs to user
        cur.execute(
            "SELECT user_id FROM notifications WHERE notification_id = %s",
            (notification_id,)
        )
        row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Notification not found")

        if row[0] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this notification")

        # Delete notification
        cur.execute(
            "DELETE FROM notifications WHERE notification_id = %s",
            (notification_id,)
        )
        conn.commit()

        logger.info(f"Notification {notification_id} deleted by user {user_id}")

        return {"message": "Notification deleted"}


# Alert Preferences Endpoints
alert_router = APIRouter(prefix="/alerts", tags=["Alerts"])


@alert_router.get("/preferences", response_model=AlertPreferencesResponse)
async def get_alert_preferences(user_id: int = Depends(get_current_user_id)):
    """
    Get user's alert preferences.

    **Returns**:
    - preferences: List of alert preference objects
    """
    with db_context() as conn:
        cur = conn.cursor()

        cur.execute(
            """
            SELECT alert_type, enabled, settings
            FROM alert_preferences
            WHERE user_id = %s
            ORDER BY alert_type
            """,
            (user_id,)
        )

        preferences = []
        for row in cur.fetchall():
            preferences.append({
                "alert_type": row[0],
                "enabled": row[1],
                "settings": row[2]
            })

        # If no preferences exist, create defaults
        if not preferences:
            default_types = [
                'signal_strong_buy',
                'signal_strong_sell',
                'signal_change',
                'drift_detected',
                'portfolio_alert',
                'model_update'
            ]

            for alert_type in default_types:
                cur.execute(
                    """
                    INSERT INTO alert_preferences (user_id, alert_type, enabled, settings)
                    VALUES (%s, %s, TRUE, %s)
                    RETURNING alert_type, enabled, settings
                    """,
                    (user_id, alert_type, '{"frequency": "immediate", "min_confidence": 0.7}')
                )
                row = cur.fetchone()
                preferences.append({
                    "alert_type": row[0],
                    "enabled": row[1],
                    "settings": row[2]
                })

            conn.commit()

        return {"preferences": preferences}


@alert_router.put("/preferences", response_model=AlertPreferencesResponse)
async def update_alert_preferences(
    preferences: List[AlertPreference],
    user_id: int = Depends(get_current_user_id)
):
    """
    Update user's alert preferences (bulk update).

    **Request Body**:
    - Array of alert preference objects with alert_type, enabled, and settings

    **Returns**:
    - Updated preferences
    """
    with db_context() as conn:
        cur = conn.cursor()

        for pref in preferences:
            cur.execute(
                """
                INSERT INTO alert_preferences (user_id, alert_type, enabled, settings)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (user_id, alert_type)
                DO UPDATE SET
                    enabled = EXCLUDED.enabled,
                    settings = EXCLUDED.settings,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (user_id, pref.alert_type, pref.enabled, str(pref.settings).replace("'", '"'))
            )

        conn.commit()

        logger.info(f"Updated {len(preferences)} alert preferences for user {user_id}")

        # Return updated preferences
        return await get_alert_preferences(user_id)


@alert_router.patch("/preferences/{alert_type}")
async def update_single_alert_preference(
    alert_type: str,
    request: UpdateAlertPreferenceRequest,
    user_id: int = Depends(get_current_user_id)
):
    """
    Update a single alert preference.

    **Path Parameters**:
    - alert_type: Type of alert to update

    **Request Body**:
    - enabled: Enable/disable the alert (optional)
    - settings: Alert settings (optional)

    **Returns**:
    - Updated preference
    """
    with db_context() as conn:
        cur = conn.cursor()

        # Check if preference exists
        cur.execute(
            "SELECT enabled, settings FROM alert_preferences WHERE user_id = %s AND alert_type = %s",
            (user_id, alert_type)
        )
        row = cur.fetchone()

        if not row:
            # Create new preference
            enabled = request.enabled if request.enabled is not None else True
            settings = request.settings if request.settings else {"frequency": "immediate"}

            cur.execute(
                """
                INSERT INTO alert_preferences (user_id, alert_type, enabled, settings)
                VALUES (%s, %s, %s, %s)
                RETURNING alert_type, enabled, settings
                """,
                (user_id, alert_type, enabled, str(settings).replace("'", '"'))
            )
        else:
            # Update existing
            enabled = request.enabled if request.enabled is not None else row[0]
            settings = request.settings if request.settings else row[1]

            cur.execute(
                """
                UPDATE alert_preferences
                SET enabled = %s, settings = %s, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = %s AND alert_type = %s
                RETURNING alert_type, enabled, settings
                """,
                (enabled, str(settings).replace("'", '"'), user_id, alert_type)
            )

        row = cur.fetchone()
        conn.commit()

        logger.info(f"Updated alert preference {alert_type} for user {user_id}")

        return {
            "alert_type": row[0],
            "enabled": row[1],
            "settings": row[2]
        }
