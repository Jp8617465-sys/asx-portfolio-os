"""
app/features/alerts/routes/__tests__/test_alert_routes.py
Unit tests for alert API routes.
Uses FastAPI TestClient with mocked dependencies (db_context, require_key).
"""

from datetime import datetime
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.features.alerts.routes.alert_routes import router


@pytest.fixture
def app():
    """Create a minimal FastAPI app with just the alert routes."""
    test_app = FastAPI()
    test_app.include_router(router)
    return test_app


@pytest.fixture
def client(app):
    return TestClient(app)


# ---- Sample DB rows (RealDictCursor returns dict-like objects) ----

SAMPLE_ALERT_ROW = {
    "id": 1,
    "user_id": 1,
    "symbol": "BHP.AX",
    "alert_type": "PRICE_ABOVE",
    "threshold": Decimal("45.0000"),
    "status": "active",
    "notification_channel": "email",
    "created_at": datetime(2026, 1, 1, 0, 0, 0),
    "triggered_at": None,
    "current_price": None,
}

SAMPLE_ALERT_ROW_2 = {
    "id": 2,
    "user_id": 1,
    "symbol": "CBA.AX",
    "alert_type": "PRICE_BELOW",
    "threshold": Decimal("100.0000"),
    "status": "active",
    "notification_channel": "email",
    "created_at": datetime(2026, 1, 2, 0, 0, 0),
    "triggered_at": None,
    "current_price": None,
}

SAMPLE_HISTORY_ROW = {
    "id": 1,
    "alert_id": 1,
    "symbol": "BHP.AX",
    "alert_type": "PRICE_ABOVE",
    "threshold": Decimal("45.0000"),
    "triggered_at": datetime(2026, 2, 8, 10, 30, 0),
    "price_at_trigger": Decimal("47.5000"),
    "notification_sent": True,
}


class TestGetAlerts:
    """Tests for GET /api/alerts."""

    @patch("app.features.alerts.routes.alert_routes.db_context")
    @patch("app.features.alerts.routes.alert_routes.require_key")
    def test_returns_alerts_list(self, mock_key, mock_db, client):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchall.return_value = [SAMPLE_ALERT_ROW, SAMPLE_ALERT_ROW_2]
        mock_db.return_value.__enter__ = MagicMock(return_value=mock_conn)
        mock_db.return_value.__exit__ = MagicMock(return_value=False)

        response = client.get("/api/alerts", headers={"x-api-key": "test"})

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["count"] == 2
        assert len(data["alerts"]) == 2
        assert data["alerts"][0]["symbol"] == "BHP.AX"

    @patch("app.features.alerts.routes.alert_routes.db_context")
    @patch("app.features.alerts.routes.alert_routes.require_key")
    def test_returns_empty_list(self, mock_key, mock_db, client):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchall.return_value = []
        mock_db.return_value.__enter__ = MagicMock(return_value=mock_conn)
        mock_db.return_value.__exit__ = MagicMock(return_value=False)

        response = client.get("/api/alerts", headers={"x-api-key": "test"})

        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 0
        assert data["alerts"] == []

    @patch("app.features.alerts.routes.alert_routes.require_key")
    def test_requires_api_key(self, mock_key, client):
        from fastapi import HTTPException

        mock_key.side_effect = HTTPException(status_code=401, detail="Unauthorized")

        response = client.get("/api/alerts")
        assert response.status_code == 401


class TestCreateAlert:
    """Tests for POST /api/alerts."""

    @patch("app.features.alerts.routes.alert_routes.db_context")
    @patch("app.features.alerts.routes.alert_routes.require_key")
    def test_creates_alert(self, mock_key, mock_db, client):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchone.return_value = SAMPLE_ALERT_ROW
        mock_db.return_value.__enter__ = MagicMock(return_value=mock_conn)
        mock_db.return_value.__exit__ = MagicMock(return_value=False)

        payload = {
            "symbol": "BHP.AX",
            "alert_type": "PRICE_ABOVE",
            "threshold": 45.00,
            "notification_channel": "email",
        }

        response = client.post(
            "/api/alerts", json=payload, headers={"x-api-key": "test"}
        )

        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "ok"
        assert data["alert"]["symbol"] == "BHP.AX"

    @patch("app.features.alerts.routes.alert_routes.require_key")
    def test_rejects_invalid_alert_type(self, mock_key, client):
        payload = {
            "symbol": "BHP.AX",
            "alert_type": "INVALID_TYPE",
            "threshold": 45.00,
        }

        response = client.post(
            "/api/alerts", json=payload, headers={"x-api-key": "test"}
        )

        assert response.status_code == 422  # Pydantic validation error

    @patch("app.features.alerts.routes.alert_routes.db_context")
    @patch("app.features.alerts.routes.alert_routes.require_key")
    def test_handles_duplicate_alert(self, mock_key, mock_db, client):
        from psycopg2 import IntegrityError

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = IntegrityError("unique constraint violated")
        mock_db.return_value.__enter__ = MagicMock(return_value=mock_conn)
        mock_db.return_value.__exit__ = MagicMock(return_value=False)

        payload = {
            "symbol": "BHP.AX",
            "alert_type": "PRICE_ABOVE",
            "threshold": 45.00,
        }

        response = client.post(
            "/api/alerts", json=payload, headers={"x-api-key": "test"}
        )

        assert response.status_code == 409


class TestUpdateAlert:
    """Tests for PUT /api/alerts/{alert_id}."""

    @patch("app.features.alerts.routes.alert_routes.db_context")
    @patch("app.features.alerts.routes.alert_routes.require_key")
    def test_updates_alert(self, mock_key, mock_db, client):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        # First call: SELECT to check ownership; second call: UPDATE RETURNING
        updated_row = {**SAMPLE_ALERT_ROW, "threshold": Decimal("50.0000")}
        mock_cursor.fetchone.side_effect = [SAMPLE_ALERT_ROW, updated_row]
        mock_db.return_value.__enter__ = MagicMock(return_value=mock_conn)
        mock_db.return_value.__exit__ = MagicMock(return_value=False)

        payload = {
            "symbol": "BHP.AX",
            "alert_type": "PRICE_ABOVE",
            "threshold": 50.00,
        }

        response = client.put(
            "/api/alerts/1", json=payload, headers={"x-api-key": "test"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"

    @patch("app.features.alerts.routes.alert_routes.db_context")
    @patch("app.features.alerts.routes.alert_routes.require_key")
    def test_returns_404_when_not_found(self, mock_key, mock_db, client):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchone.return_value = None
        mock_db.return_value.__enter__ = MagicMock(return_value=mock_conn)
        mock_db.return_value.__exit__ = MagicMock(return_value=False)

        payload = {
            "symbol": "BHP.AX",
            "alert_type": "PRICE_ABOVE",
            "threshold": 50.00,
        }

        response = client.put(
            "/api/alerts/999", json=payload, headers={"x-api-key": "test"}
        )

        assert response.status_code == 404


class TestDeleteAlert:
    """Tests for DELETE /api/alerts/{alert_id}."""

    @patch("app.features.alerts.routes.alert_routes.db_context")
    @patch("app.features.alerts.routes.alert_routes.require_key")
    def test_deletes_alert(self, mock_key, mock_db, client):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        # First call: SELECT for ownership check; then DELETE
        mock_cursor.fetchone.return_value = SAMPLE_ALERT_ROW
        mock_cursor.rowcount = 1
        mock_db.return_value.__enter__ = MagicMock(return_value=mock_conn)
        mock_db.return_value.__exit__ = MagicMock(return_value=False)

        response = client.delete(
            "/api/alerts/1", headers={"x-api-key": "test"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["message"] == "Alert deleted"

    @patch("app.features.alerts.routes.alert_routes.db_context")
    @patch("app.features.alerts.routes.alert_routes.require_key")
    def test_returns_404_when_not_found(self, mock_key, mock_db, client):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchone.return_value = None
        mock_db.return_value.__enter__ = MagicMock(return_value=mock_conn)
        mock_db.return_value.__exit__ = MagicMock(return_value=False)

        response = client.delete(
            "/api/alerts/999", headers={"x-api-key": "test"}
        )

        assert response.status_code == 404


class TestGetAlertHistory:
    """Tests for GET /api/alerts/history."""

    @patch("app.features.alerts.routes.alert_routes.db_context")
    @patch("app.features.alerts.routes.alert_routes.require_key")
    def test_returns_history(self, mock_key, mock_db, client):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchall.return_value = [SAMPLE_HISTORY_ROW]
        mock_db.return_value.__enter__ = MagicMock(return_value=mock_conn)
        mock_db.return_value.__exit__ = MagicMock(return_value=False)

        response = client.get(
            "/api/alerts/history", headers={"x-api-key": "test"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["count"] == 1
        assert data["history"][0]["symbol"] == "BHP.AX"

    @patch("app.features.alerts.routes.alert_routes.db_context")
    @patch("app.features.alerts.routes.alert_routes.require_key")
    def test_returns_empty_history(self, mock_key, mock_db, client):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchall.return_value = []
        mock_db.return_value.__enter__ = MagicMock(return_value=mock_conn)
        mock_db.return_value.__exit__ = MagicMock(return_value=False)

        response = client.get(
            "/api/alerts/history", headers={"x-api-key": "test"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 0
        assert data["history"] == []

    @patch("app.features.alerts.routes.alert_routes.require_key")
    def test_requires_api_key(self, mock_key, client):
        from fastapi import HTTPException

        mock_key.side_effect = HTTPException(status_code=401, detail="Unauthorized")

        response = client.get("/api/alerts/history")
        assert response.status_code == 401
