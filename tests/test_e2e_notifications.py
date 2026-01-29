"""
E2E Test: Notification and alert system flow
Tests notification creation, retrieval, marking as read, and alert preferences
"""

import pytest
from fastapi.testclient import TestClient
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.core import db_context

client = TestClient(app)


class TestE2ENotificationFlow:
    """End-to-end notification system tests."""

    @pytest.fixture
    def auth_token(self):
        """Get auth token for demo user."""
        response = client.post(
            "/auth/login",
            json={"username": "demo_user", "password": "testpass123"}
        )
        return response.json()["access_token"]

    @pytest.fixture
    def user_id(self, auth_token):
        """Get user ID from token."""
        response = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        return response.json()["user_id"]

    def test_complete_notification_flow(self, auth_token, user_id):
        """Test complete notification lifecycle."""

        # Step 1: Get existing notifications
        notifications_response = client.get(
            "/notifications",
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        assert notifications_response.status_code == 200
        notifications_data = notifications_response.json()
        assert "notifications" in notifications_data
        assert "total_count" in notifications_data
        assert "unread_count" in notifications_data

        initial_count = notifications_data["total_count"]

        # Step 2: Create a test notification directly in DB
        with db_context() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO notifications (
                    user_id, notification_type, title, message, priority, data
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING notification_id
                """,
                (
                    user_id,
                    "test",
                    "Test Notification",
                    "This is a test notification",
                    "normal",
                    '{"test": true}'
                )
            )
            notification_id = cur.fetchone()[0]
            conn.commit()

        # Step 3: Get notifications again (should have one more)
        notifications_response2 = client.get(
            "/notifications",
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        assert notifications_response2.status_code == 200
        notifications_data2 = notifications_response2.json()
        assert notifications_data2["total_count"] == initial_count + 1

        # Step 4: Get only unread notifications
        unread_response = client.get(
            "/notifications?unread_only=true",
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        assert unread_response.status_code == 200
        unread_data = unread_response.json()
        assert unread_data["unread_count"] > 0

        # Find our test notification
        test_notif = next(
            (n for n in unread_data["notifications"] if n["notification_id"] == notification_id),
            None
        )
        assert test_notif is not None
        assert test_notif["is_read"] is False

        # Step 5: Mark notification as read
        mark_read_response = client.put(
            f"/notifications/{notification_id}/read",
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        assert mark_read_response.status_code == 200

        # Step 6: Verify notification is now read
        unread_response2 = client.get(
            "/notifications?unread_only=true",
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        unread_data2 = unread_response2.json()
        test_notif2 = next(
            (n for n in unread_data2["notifications"] if n["notification_id"] == notification_id),
            None
        )
        # Should not be in unread list anymore
        assert test_notif2 is None

        # Step 7: Delete notification
        delete_response = client.delete(
            f"/notifications/{notification_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        assert delete_response.status_code == 200

    def test_alert_preferences_flow(self, auth_token):
        """Test alert preference management."""

        # Step 1: Get alert preferences
        prefs_response = client.get(
            "/alerts/preferences",
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        assert prefs_response.status_code == 200
        prefs_data = prefs_response.json()
        assert "preferences" in prefs_data
        assert len(prefs_data["preferences"]) > 0

        # Should have default alert types
        alert_types = [p["alert_type"] for p in prefs_data["preferences"]]
        assert "signal_strong_buy" in alert_types
        assert "signal_strong_sell" in alert_types

        # Step 2: Update single alert preference
        update_response = client.patch(
            "/alerts/preferences/signal_strong_buy",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "enabled": False,
                "settings": {"frequency": "daily", "min_confidence": 0.9}
            }
        )

        assert update_response.status_code == 200
        updated_pref = update_response.json()
        assert updated_pref["alert_type"] == "signal_strong_buy"
        assert updated_pref["enabled"] is False
        assert updated_pref["settings"]["min_confidence"] == 0.9

        # Step 3: Update all preferences (bulk)
        all_prefs = [
            {
                "alert_type": "signal_strong_buy",
                "enabled": True,
                "settings": {"frequency": "immediate", "min_confidence": 0.8}
            },
            {
                "alert_type": "signal_strong_sell",
                "enabled": True,
                "settings": {"frequency": "immediate", "min_confidence": 0.8}
            },
            {
                "alert_type": "drift_detected",
                "enabled": False,
                "settings": {"frequency": "weekly"}
            }
        ]

        bulk_response = client.put(
            "/alerts/preferences",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=all_prefs
        )

        assert bulk_response.status_code == 200
        bulk_data = bulk_response.json()
        assert len(bulk_data["preferences"]) >= 3

        # Verify updates
        prefs_by_type = {p["alert_type"]: p for p in bulk_data["preferences"]}
        assert prefs_by_type["signal_strong_buy"]["enabled"] is True
        assert prefs_by_type["drift_detected"]["enabled"] is False

    def test_mark_all_read(self, auth_token, user_id):
        """Test marking all notifications as read."""

        # Create multiple test notifications
        with db_context() as conn:
            cur = conn.cursor()
            for i in range(3):
                cur.execute(
                    """
                    INSERT INTO notifications (user_id, notification_type, title, message, priority)
                    VALUES (%s, 'test', %s, %s, 'normal')
                    """,
                    (user_id, f"Test Notification {i}", f"Message {i}")
                )
            conn.commit()

        # Get unread count
        unread_response = client.get(
            "/notifications?unread_only=true",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        unread_count_before = unread_response.json()["unread_count"]
        assert unread_count_before >= 3

        # Mark all as read
        mark_all_response = client.post(
            "/notifications/mark-all-read",
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        assert mark_all_response.status_code == 200
        assert mark_all_response.json()["count"] >= 3

        # Verify unread count is now 0
        unread_response2 = client.get(
            "/notifications?unread_only=true",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        unread_count_after = unread_response2.json()["unread_count"]
        assert unread_count_after == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
