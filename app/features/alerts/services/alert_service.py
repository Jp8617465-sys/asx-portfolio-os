"""
app/features/alerts/services/alert_service.py
Business logic layer for price alerts.

Thin service wrapping AlertRepository.  Handles ownership checks,
alert condition matching, and delegates persistence to the repository.
"""

from app.core import logger
from app.features.alerts.repositories.alert_repository import AlertRepository


class AlertService:
    """Service layer for price alert operations."""

    def __init__(self, repository=None):
        self.repo = repository or AlertRepository()

    # ------------------------------------------------------------------
    # CRUD
    # ------------------------------------------------------------------

    def get_user_alerts(self, user_id: int) -> list:
        """Return all alerts for the given user."""
        return self.repo.get_alerts_for_user(user_id)

    def create_alert(
        self,
        user_id: int,
        symbol: str,
        alert_type: str,
        threshold: float,
        channel: str = "email",
    ) -> dict:
        """Create a new price alert."""
        logger.info(
            "Creating alert: user=%s symbol=%s type=%s threshold=%s",
            user_id, symbol, alert_type, threshold,
        )
        return self.repo.create_alert(
            user_id=user_id,
            symbol=symbol,
            alert_type=alert_type,
            threshold=threshold,
            notification_channel=channel,
        )

    def update_alert(self, alert_id: int, user_id: int, updates: dict) -> dict:
        """Update an alert after verifying ownership."""
        alert = self.repo.get_alert_by_id(alert_id)
        if alert is None:
            raise ValueError("Alert not found")
        if alert["user_id"] != user_id:
            raise PermissionError("Not authorized to modify this alert")

        return self.repo.update_alert(alert_id, updates)

    def delete_alert(self, alert_id: int, user_id: int) -> bool:
        """Delete an alert after verifying ownership."""
        alert = self.repo.get_alert_by_id(alert_id)
        if alert is None:
            raise ValueError("Alert not found")
        if alert["user_id"] != user_id:
            raise PermissionError("Not authorized to delete this alert")

        return self.repo.delete_alert(alert_id)

    # ------------------------------------------------------------------
    # Alert checking
    # ------------------------------------------------------------------

    def check_alerts(self, current_prices: dict) -> list:
        """
        Check all active alerts against current market prices.

        Args:
            current_prices: dict mapping symbol -> current price (float)

        Returns:
            List of triggered alert dicts.
        """
        active = self.repo.get_active_alerts()
        triggered = []

        for alert in active:
            symbol = alert["symbol"]
            if symbol not in current_prices:
                continue

            price = current_prices[symbol]
            threshold = float(alert["threshold"])
            alert_type = alert["alert_type"]

            should_trigger = False

            if alert_type == "PRICE_ABOVE" and price >= threshold:
                should_trigger = True
            elif alert_type == "PRICE_BELOW" and price <= threshold:
                should_trigger = True
            elif alert_type == "VOLUME_SPIKE":
                # Volume spike uses threshold as a multiplier — handled in job
                should_trigger = price >= threshold
            elif alert_type == "SIGNAL_CHANGE":
                # Signal change is handled differently (not price-based)
                pass

            if should_trigger:
                result = self.repo.trigger_alert(alert["id"], price)
                if result:
                    triggered.append(result)
                    logger.info(
                        "Alert triggered: id=%s symbol=%s type=%s price=%s threshold=%s",
                        alert["id"], symbol, alert_type, price, threshold,
                    )

        return triggered

    # ------------------------------------------------------------------
    # History
    # ------------------------------------------------------------------

    def get_alert_history(self, user_id: int) -> list:
        """Return trigger history for the given user."""
        return self.repo.get_alert_history(user_id)
