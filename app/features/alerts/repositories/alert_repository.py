"""
app/features/alerts/repositories/alert_repository.py
Database access layer for price alerts.

Uses db_context() and RealDictCursor directly (same pattern as ETF routes).
All SQL is parameterized with %s placeholders.
"""

from psycopg2.extras import RealDictCursor

from app.core import db_context, logger


class AlertRepository:
    """Repository for price_alerts and alert_history tables."""

    def get_alerts_for_user(self, user_id: int) -> list:
        """Get all alerts for a given user, ordered by most recent first."""
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
            return cur.fetchall()

    def get_alert_by_id(self, alert_id: int) -> dict | None:
        """Get a single alert by its primary key."""
        with db_context() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute(
                """
                SELECT id, user_id, symbol, alert_type, threshold, status,
                       notification_channel, created_at, triggered_at, current_price
                FROM price_alerts
                WHERE id = %s
                """,
                (alert_id,),
            )
            return cur.fetchone()

    def create_alert(
        self,
        user_id: int,
        symbol: str,
        alert_type: str,
        threshold: float,
        notification_channel: str = "email",
    ) -> dict:
        """Insert a new price alert and return the created row."""
        with db_context() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute(
                """
                INSERT INTO price_alerts (user_id, symbol, alert_type, threshold, notification_channel)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, user_id, symbol, alert_type, threshold, status,
                          notification_channel, created_at, triggered_at, current_price
                """,
                (user_id, symbol, alert_type, threshold, notification_channel),
            )
            return cur.fetchone()

    def update_alert(self, alert_id: int, updates: dict) -> dict | None:
        """Update an alert's mutable fields and return the updated row."""
        allowed_fields = {"threshold", "notification_channel", "status", "symbol", "alert_type"}
        filtered = {k: v for k, v in updates.items() if k in allowed_fields}

        if not filtered:
            return self.get_alert_by_id(alert_id)

        set_clauses = ", ".join(f"{key} = %s" for key in filtered)
        values = list(filtered.values()) + [alert_id]

        with db_context() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute(
                f"""
                UPDATE price_alerts
                SET {set_clauses}
                WHERE id = %s
                RETURNING id, user_id, symbol, alert_type, threshold, status,
                          notification_channel, created_at, triggered_at, current_price
                """,
                values,
            )
            return cur.fetchone()

    def delete_alert(self, alert_id: int) -> bool:
        """Delete an alert by id. Returns True if a row was deleted."""
        with db_context() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute(
                "DELETE FROM price_alerts WHERE id = %s",
                (alert_id,),
            )
            return cur.rowcount > 0

    def get_active_alerts(self) -> list:
        """Get all alerts with status = 'active' across all users."""
        with db_context() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute(
                """
                SELECT id, user_id, symbol, alert_type, threshold, status,
                       notification_channel, created_at, triggered_at, current_price
                FROM price_alerts
                WHERE status = 'active'
                ORDER BY symbol ASC
                """,
            )
            return cur.fetchall()

    def trigger_alert(self, alert_id: int, price: float) -> dict | None:
        """
        Mark an alert as triggered, record the current price, and insert
        a row into alert_history.  Returns the updated alert or None.
        """
        with db_context() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)

            # Update the alert status
            cur.execute(
                """
                UPDATE price_alerts
                SET status = 'triggered',
                    triggered_at = NOW(),
                    current_price = %s
                WHERE id = %s
                RETURNING id, user_id, symbol, alert_type, threshold, status,
                          notification_channel, created_at, triggered_at, current_price
                """,
                (price, alert_id),
            )
            alert = cur.fetchone()

            if alert is None:
                return None

            # Insert into alert_history
            cur.execute(
                """
                INSERT INTO alert_history (alert_id, symbol, alert_type, threshold, price_at_trigger)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (alert["id"], alert["symbol"], alert["alert_type"], alert["threshold"], price),
            )

            return alert

    def get_alert_history(self, user_id: int) -> list:
        """Get trigger history for all alerts belonging to a user."""
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
            return cur.fetchall()
