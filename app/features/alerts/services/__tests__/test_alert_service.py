"""
app/features/alerts/services/__tests__/test_alert_service.py
Unit tests for AlertService — thin business logic layer wrapping AlertRepository.
"""

from datetime import datetime
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest

from app.features.alerts.services.alert_service import AlertService


@pytest.fixture
def mock_repo():
    """Create a mock AlertRepository."""
    return MagicMock()


@pytest.fixture
def service(mock_repo):
    """Create AlertService with injected mock repository."""
    return AlertService(repository=mock_repo)


# ---- Sample data used across tests ----

SAMPLE_ALERT = {
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

SAMPLE_ALERT_2 = {
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
}


class TestGetUserAlerts:
    """Tests for AlertService.get_user_alerts."""

    def test_delegates_to_repo(self, service, mock_repo):
        mock_repo.get_alerts_for_user.return_value = [SAMPLE_ALERT, SAMPLE_ALERT_2]

        result = service.get_user_alerts(1)

        mock_repo.get_alerts_for_user.assert_called_once_with(1)
        assert len(result) == 2

    def test_returns_empty_list(self, service, mock_repo):
        mock_repo.get_alerts_for_user.return_value = []

        result = service.get_user_alerts(999)

        assert result == []


class TestCreateAlert:
    """Tests for AlertService.create_alert."""

    def test_creates_alert_and_delegates(self, service, mock_repo):
        mock_repo.create_alert.return_value = SAMPLE_ALERT

        result = service.create_alert(
            user_id=1,
            symbol="BHP.AX",
            alert_type="PRICE_ABOVE",
            threshold=45.00,
            channel="email",
        )

        mock_repo.create_alert.assert_called_once_with(
            user_id=1,
            symbol="BHP.AX",
            alert_type="PRICE_ABOVE",
            threshold=45.00,
            notification_channel="email",
        )
        assert result["id"] == 1

    def test_creates_alert_with_default_channel(self, service, mock_repo):
        mock_repo.create_alert.return_value = SAMPLE_ALERT

        result = service.create_alert(
            user_id=1,
            symbol="BHP.AX",
            alert_type="PRICE_ABOVE",
            threshold=45.00,
        )

        mock_repo.create_alert.assert_called_once_with(
            user_id=1,
            symbol="BHP.AX",
            alert_type="PRICE_ABOVE",
            threshold=45.00,
            notification_channel="email",
        )


class TestUpdateAlert:
    """Tests for AlertService.update_alert."""

    def test_updates_alert_when_owned_by_user(self, service, mock_repo):
        mock_repo.get_alert_by_id.return_value = SAMPLE_ALERT
        updated = {**SAMPLE_ALERT, "threshold": Decimal("50.00")}
        mock_repo.update_alert.return_value = updated

        result = service.update_alert(
            alert_id=1,
            user_id=1,
            updates={"threshold": 50.00},
        )

        mock_repo.update_alert.assert_called_once_with(1, {"threshold": 50.00})
        assert result["threshold"] == Decimal("50.00")

    def test_raises_when_alert_not_found(self, service, mock_repo):
        mock_repo.get_alert_by_id.return_value = None

        with pytest.raises(ValueError, match="Alert not found"):
            service.update_alert(alert_id=999, user_id=1, updates={"threshold": 50.00})

    def test_raises_when_user_does_not_own_alert(self, service, mock_repo):
        other_user_alert = {**SAMPLE_ALERT, "user_id": 2}
        mock_repo.get_alert_by_id.return_value = other_user_alert

        with pytest.raises(PermissionError, match="Not authorized"):
            service.update_alert(alert_id=1, user_id=1, updates={"threshold": 50.00})


class TestDeleteAlert:
    """Tests for AlertService.delete_alert."""

    def test_deletes_alert_when_owned_by_user(self, service, mock_repo):
        mock_repo.get_alert_by_id.return_value = SAMPLE_ALERT
        mock_repo.delete_alert.return_value = True

        result = service.delete_alert(alert_id=1, user_id=1)

        mock_repo.delete_alert.assert_called_once_with(1)
        assert result is True

    def test_raises_when_alert_not_found(self, service, mock_repo):
        mock_repo.get_alert_by_id.return_value = None

        with pytest.raises(ValueError, match="Alert not found"):
            service.delete_alert(alert_id=999, user_id=1)

    def test_raises_when_user_does_not_own_alert(self, service, mock_repo):
        other_user_alert = {**SAMPLE_ALERT, "user_id": 2}
        mock_repo.get_alert_by_id.return_value = other_user_alert

        with pytest.raises(PermissionError, match="Not authorized"):
            service.delete_alert(alert_id=1, user_id=1)


class TestCheckAlerts:
    """Tests for AlertService.check_alerts — core alert matching logic."""

    def test_triggers_price_above_when_exceeded(self, service, mock_repo):
        alert = {**SAMPLE_ALERT, "alert_type": "PRICE_ABOVE", "threshold": Decimal("45.00")}
        mock_repo.get_active_alerts.return_value = [alert]
        triggered = {**alert, "status": "triggered", "current_price": Decimal("47.50")}
        mock_repo.trigger_alert.return_value = triggered

        current_prices = {"BHP.AX": 47.50}
        result = service.check_alerts(current_prices)

        assert len(result) == 1
        mock_repo.trigger_alert.assert_called_once_with(1, 47.50)

    def test_triggers_price_below_when_dropped(self, service, mock_repo):
        alert = {**SAMPLE_ALERT_2, "alert_type": "PRICE_BELOW", "threshold": Decimal("100.00")}
        mock_repo.get_active_alerts.return_value = [alert]
        triggered = {**alert, "status": "triggered", "current_price": Decimal("95.00")}
        mock_repo.trigger_alert.return_value = triggered

        current_prices = {"CBA.AX": 95.00}
        result = service.check_alerts(current_prices)

        assert len(result) == 1
        mock_repo.trigger_alert.assert_called_once_with(2, 95.00)

    def test_skips_non_matching_alerts(self, service, mock_repo):
        alert = {**SAMPLE_ALERT, "alert_type": "PRICE_ABOVE", "threshold": Decimal("45.00")}
        mock_repo.get_active_alerts.return_value = [alert]

        current_prices = {"BHP.AX": 40.00}  # Below threshold
        result = service.check_alerts(current_prices)

        assert len(result) == 0
        mock_repo.trigger_alert.assert_not_called()

    def test_skips_alerts_without_matching_price(self, service, mock_repo):
        alert = {**SAMPLE_ALERT, "symbol": "BHP.AX"}
        mock_repo.get_active_alerts.return_value = [alert]

        current_prices = {"CBA.AX": 100.00}  # Different symbol
        result = service.check_alerts(current_prices)

        assert len(result) == 0
        mock_repo.trigger_alert.assert_not_called()

    def test_handles_empty_alerts_list(self, service, mock_repo):
        mock_repo.get_active_alerts.return_value = []

        result = service.check_alerts({"BHP.AX": 50.00})

        assert result == []

    def test_handles_empty_prices(self, service, mock_repo):
        mock_repo.get_active_alerts.return_value = [SAMPLE_ALERT]

        result = service.check_alerts({})

        assert result == []


class TestGetAlertHistory:
    """Tests for AlertService.get_alert_history."""

    def test_delegates_to_repo(self, service, mock_repo):
        history_record = {
            "id": 1,
            "alert_id": 1,
            "symbol": "BHP.AX",
            "alert_type": "PRICE_ABOVE",
            "threshold": Decimal("45.00"),
            "triggered_at": datetime(2026, 2, 8),
            "price_at_trigger": Decimal("47.50"),
            "notification_sent": True,
        }
        mock_repo.get_alert_history.return_value = [history_record]

        result = service.get_alert_history(1)

        mock_repo.get_alert_history.assert_called_once_with(1)
        assert len(result) == 1
        assert result[0]["symbol"] == "BHP.AX"
