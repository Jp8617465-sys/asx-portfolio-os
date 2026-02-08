"""
app/features/alerts/repositories/__tests__/test_alert_repository.py
Unit tests for AlertRepository — database access layer for price alerts.
Uses mocked db_context and cursor to verify SQL operations.
"""

from datetime import datetime
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest


@pytest.fixture
def mock_db():
    """Mock db_context() context manager, returning (mock_conn, mock_cursor)."""
    with patch(
        "app.features.alerts.repositories.alert_repository.db_context"
    ) as mock_ctx:
        mock_conn = MagicMock()
        mock_cursor = MagicMock(
            spec=["execute", "fetchall", "fetchone", "close", "description"]
        )
        mock_conn.cursor.return_value = mock_cursor
        mock_ctx.return_value.__enter__ = MagicMock(return_value=mock_conn)
        mock_ctx.return_value.__exit__ = MagicMock(return_value=False)
        yield mock_conn, mock_cursor


class TestGetAlertsForUser:
    """Tests for AlertRepository.get_alerts_for_user."""

    def test_returns_list_of_alerts(self, mock_db):
        from app.features.alerts.repositories.alert_repository import AlertRepository

        mock_conn, mock_cursor = mock_db
        mock_cursor.fetchall.return_value = [
            {
                "id": 1,
                "user_id": 1,
                "symbol": "BHP.AX",
                "alert_type": "PRICE_ABOVE",
                "threshold": Decimal("45.00"),
                "status": "active",
                "notification_channel": "email",
                "created_at": datetime(2026, 1, 1),
                "triggered_at": None,
                "current_price": None,
            },
            {
                "id": 2,
                "user_id": 1,
                "symbol": "CBA.AX",
                "alert_type": "PRICE_BELOW",
                "threshold": Decimal("100.00"),
                "status": "active",
                "notification_channel": "email",
                "created_at": datetime(2026, 1, 2),
                "triggered_at": None,
                "current_price": None,
            },
        ]

        repo = AlertRepository()
        result = repo.get_alerts_for_user(1)

        assert len(result) == 2
        assert result[0]["symbol"] == "BHP.AX"
        assert result[1]["symbol"] == "CBA.AX"
        mock_cursor.execute.assert_called_once()

    def test_returns_empty_list_for_unknown_user(self, mock_db):
        from app.features.alerts.repositories.alert_repository import AlertRepository

        mock_conn, mock_cursor = mock_db
        mock_cursor.fetchall.return_value = []

        repo = AlertRepository()
        result = repo.get_alerts_for_user(999)

        assert result == []


class TestGetAlertById:
    """Tests for AlertRepository.get_alert_by_id."""

    def test_returns_alert_when_found(self, mock_db):
        from app.features.alerts.repositories.alert_repository import AlertRepository

        mock_conn, mock_cursor = mock_db
        mock_cursor.fetchone.return_value = {
            "id": 1,
            "user_id": 1,
            "symbol": "BHP.AX",
            "alert_type": "PRICE_ABOVE",
            "threshold": Decimal("45.00"),
            "status": "active",
            "notification_channel": "email",
            "created_at": datetime(2026, 1, 1),
            "triggered_at": None,
            "current_price": None,
        }

        repo = AlertRepository()
        result = repo.get_alert_by_id(1)

        assert result is not None
        assert result["id"] == 1
        assert result["symbol"] == "BHP.AX"

    def test_returns_none_when_not_found(self, mock_db):
        from app.features.alerts.repositories.alert_repository import AlertRepository

        mock_conn, mock_cursor = mock_db
        mock_cursor.fetchone.return_value = None

        repo = AlertRepository()
        result = repo.get_alert_by_id(999)

        assert result is None


class TestCreateAlert:
    """Tests for AlertRepository.create_alert."""

    def test_creates_and_returns_alert(self, mock_db):
        from app.features.alerts.repositories.alert_repository import AlertRepository

        mock_conn, mock_cursor = mock_db
        mock_cursor.fetchone.return_value = {
            "id": 1,
            "user_id": 1,
            "symbol": "BHP.AX",
            "alert_type": "PRICE_ABOVE",
            "threshold": Decimal("45.00"),
            "status": "active",
            "notification_channel": "email",
            "created_at": datetime(2026, 1, 1),
            "triggered_at": None,
            "current_price": None,
        }

        repo = AlertRepository()
        result = repo.create_alert(
            user_id=1,
            symbol="BHP.AX",
            alert_type="PRICE_ABOVE",
            threshold=45.00,
            notification_channel="email",
        )

        assert result["id"] == 1
        assert result["symbol"] == "BHP.AX"
        assert result["alert_type"] == "PRICE_ABOVE"
        mock_cursor.execute.assert_called_once()
        # Verify INSERT is in the SQL
        sql = mock_cursor.execute.call_args[0][0]
        assert "INSERT" in sql.upper()

    def test_creates_alert_with_default_channel(self, mock_db):
        from app.features.alerts.repositories.alert_repository import AlertRepository

        mock_conn, mock_cursor = mock_db
        mock_cursor.fetchone.return_value = {
            "id": 2,
            "user_id": 1,
            "symbol": "CBA.AX",
            "alert_type": "PRICE_BELOW",
            "threshold": Decimal("100.00"),
            "status": "active",
            "notification_channel": "email",
            "created_at": datetime(2026, 1, 1),
            "triggered_at": None,
            "current_price": None,
        }

        repo = AlertRepository()
        result = repo.create_alert(
            user_id=1,
            symbol="CBA.AX",
            alert_type="PRICE_BELOW",
            threshold=100.00,
        )

        assert result["notification_channel"] == "email"


class TestUpdateAlert:
    """Tests for AlertRepository.update_alert."""

    def test_updates_and_returns_alert(self, mock_db):
        from app.features.alerts.repositories.alert_repository import AlertRepository

        mock_conn, mock_cursor = mock_db
        mock_cursor.fetchone.return_value = {
            "id": 1,
            "user_id": 1,
            "symbol": "BHP.AX",
            "alert_type": "PRICE_ABOVE",
            "threshold": Decimal("50.00"),
            "status": "active",
            "notification_channel": "sms",
            "created_at": datetime(2026, 1, 1),
            "triggered_at": None,
            "current_price": None,
        }

        repo = AlertRepository()
        result = repo.update_alert(1, {"threshold": 50.00, "notification_channel": "sms"})

        assert result is not None
        assert result["threshold"] == Decimal("50.00")
        mock_cursor.execute.assert_called_once()
        sql = mock_cursor.execute.call_args[0][0]
        assert "UPDATE" in sql.upper()

    def test_returns_none_when_alert_not_found(self, mock_db):
        from app.features.alerts.repositories.alert_repository import AlertRepository

        mock_conn, mock_cursor = mock_db
        mock_cursor.fetchone.return_value = None

        repo = AlertRepository()
        result = repo.update_alert(999, {"threshold": 50.00})

        assert result is None


class TestDeleteAlert:
    """Tests for AlertRepository.delete_alert."""

    def test_deletes_and_returns_true(self, mock_db):
        from app.features.alerts.repositories.alert_repository import AlertRepository

        mock_conn, mock_cursor = mock_db
        mock_cursor.rowcount = 1

        repo = AlertRepository()
        result = repo.delete_alert(1)

        assert result is True
        sql = mock_cursor.execute.call_args[0][0]
        assert "DELETE" in sql.upper()

    def test_returns_false_when_alert_not_found(self, mock_db):
        from app.features.alerts.repositories.alert_repository import AlertRepository

        mock_conn, mock_cursor = mock_db
        mock_cursor.rowcount = 0

        repo = AlertRepository()
        result = repo.delete_alert(999)

        assert result is False


class TestGetActiveAlerts:
    """Tests for AlertRepository.get_active_alerts."""

    def test_returns_only_active_alerts(self, mock_db):
        from app.features.alerts.repositories.alert_repository import AlertRepository

        mock_conn, mock_cursor = mock_db
        mock_cursor.fetchall.return_value = [
            {
                "id": 1,
                "user_id": 1,
                "symbol": "BHP.AX",
                "alert_type": "PRICE_ABOVE",
                "threshold": Decimal("45.00"),
                "status": "active",
                "notification_channel": "email",
                "created_at": datetime(2026, 1, 1),
                "triggered_at": None,
                "current_price": None,
            },
        ]

        repo = AlertRepository()
        result = repo.get_active_alerts()

        assert len(result) == 1
        assert result[0]["status"] == "active"
        sql = mock_cursor.execute.call_args[0][0]
        assert "active" in sql.lower()


class TestTriggerAlert:
    """Tests for AlertRepository.trigger_alert."""

    def test_triggers_alert_and_creates_history(self, mock_db):
        from app.features.alerts.repositories.alert_repository import AlertRepository

        mock_conn, mock_cursor = mock_db
        # First call: UPDATE price_alerts (returns the updated alert)
        # Second call: INSERT alert_history
        mock_cursor.fetchone.return_value = {
            "id": 1,
            "user_id": 1,
            "symbol": "BHP.AX",
            "alert_type": "PRICE_ABOVE",
            "threshold": Decimal("45.00"),
            "status": "triggered",
            "notification_channel": "email",
            "created_at": datetime(2026, 1, 1),
            "triggered_at": datetime(2026, 2, 8),
            "current_price": Decimal("47.50"),
        }

        repo = AlertRepository()
        result = repo.trigger_alert(1, 47.50)

        assert result is not None
        assert result["status"] == "triggered"
        # Should have two execute calls: UPDATE alert + INSERT history
        assert mock_cursor.execute.call_count == 2

    def test_returns_none_when_alert_not_found(self, mock_db):
        from app.features.alerts.repositories.alert_repository import AlertRepository

        mock_conn, mock_cursor = mock_db
        mock_cursor.fetchone.return_value = None

        repo = AlertRepository()
        result = repo.trigger_alert(999, 50.00)

        assert result is None


class TestGetAlertHistory:
    """Tests for AlertRepository.get_alert_history."""

    def test_returns_history_records(self, mock_db):
        from app.features.alerts.repositories.alert_repository import AlertRepository

        mock_conn, mock_cursor = mock_db
        mock_cursor.fetchall.return_value = [
            {
                "id": 1,
                "alert_id": 1,
                "symbol": "BHP.AX",
                "alert_type": "PRICE_ABOVE",
                "threshold": Decimal("45.00"),
                "triggered_at": datetime(2026, 2, 8),
                "price_at_trigger": Decimal("47.50"),
                "notification_sent": True,
            },
        ]

        repo = AlertRepository()
        result = repo.get_alert_history(1)

        assert len(result) == 1
        assert result[0]["symbol"] == "BHP.AX"
        assert result[0]["price_at_trigger"] == Decimal("47.50")

    def test_returns_empty_for_no_history(self, mock_db):
        from app.features.alerts.repositories.alert_repository import AlertRepository

        mock_conn, mock_cursor = mock_db
        mock_cursor.fetchall.return_value = []

        repo = AlertRepository()
        result = repo.get_alert_history(999)

        assert result == []
