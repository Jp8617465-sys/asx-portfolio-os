"""
jobs/__tests__/test_check_alerts_job.py
Unit tests for the check_alerts cron job.
Tests price fetching, alert condition matching, and error handling.
"""

from datetime import datetime
from decimal import Decimal
from unittest.mock import MagicMock, patch, call

import pytest


# ---- Sample data ----

SAMPLE_ACTIVE_ALERT_ABOVE = {
    "id": 1,
    "user_id": 1,
    "symbol": "BHP.AX",
    "alert_type": "PRICE_ABOVE",
    "threshold": Decimal("45.0000"),
    "status": "active",
    "notification_channel": "email",
    "created_at": datetime(2026, 1, 1),
    "triggered_at": None,
    "current_price": None,
}

SAMPLE_ACTIVE_ALERT_BELOW = {
    "id": 2,
    "user_id": 1,
    "symbol": "CBA.AX",
    "alert_type": "PRICE_BELOW",
    "threshold": Decimal("100.0000"),
    "status": "active",
    "notification_channel": "email",
    "created_at": datetime(2026, 1, 2),
    "triggered_at": None,
    "current_price": None,
}


class TestGetCurrentPrices:
    """Tests for get_current_prices function."""

    @patch("jobs.check_alerts_job.db")
    @patch("jobs.check_alerts_job.return_conn")
    def test_returns_price_dict(self, mock_return_conn, mock_db):
        from jobs.check_alerts_job import get_current_prices

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_db.return_value = mock_conn

        mock_cursor.fetchall.return_value = [
            {"symbol": "BHP.AX", "close": Decimal("47.50")},
            {"symbol": "CBA.AX", "close": Decimal("95.00")},
        ]

        result = get_current_prices(["BHP.AX", "CBA.AX"])

        assert result == {"BHP.AX": 47.50, "CBA.AX": 95.00}
        mock_cursor.execute.assert_called_once()

    @patch("jobs.check_alerts_job.db")
    @patch("jobs.check_alerts_job.return_conn")
    def test_returns_empty_for_no_symbols(self, mock_return_conn, mock_db):
        from jobs.check_alerts_job import get_current_prices

        result = get_current_prices([])

        assert result == {}
        mock_db.assert_not_called()

    @patch("jobs.check_alerts_job.db")
    @patch("jobs.check_alerts_job.return_conn")
    def test_handles_db_error_gracefully(self, mock_return_conn, mock_db):
        from jobs.check_alerts_job import get_current_prices

        mock_db.side_effect = Exception("connection failed")

        result = get_current_prices(["BHP.AX"])

        assert result == {}


class TestCheckAlerts:
    """Tests for the main check_alerts function."""

    @patch("jobs.check_alerts_job.get_current_prices")
    @patch("jobs.check_alerts_job.db")
    @patch("jobs.check_alerts_job.return_conn")
    def test_triggers_price_above(self, mock_return_conn, mock_db, mock_prices):
        from jobs.check_alerts_job import check_alerts

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_db.return_value = mock_conn

        # Active alerts query
        mock_cursor.fetchall.return_value = [SAMPLE_ACTIVE_ALERT_ABOVE]

        # trigger_alert UPDATE RETURNING
        mock_cursor.fetchone.return_value = {
            **SAMPLE_ACTIVE_ALERT_ABOVE,
            "status": "triggered",
            "current_price": Decimal("47.50"),
        }

        mock_prices.return_value = {"BHP.AX": 47.50}

        check_alerts()

        # Verify trigger SQL was executed (UPDATE + INSERT history)
        execute_calls = mock_cursor.execute.call_args_list
        sql_calls = [str(c[0][0]).upper() for c in execute_calls]

        # Should have: SELECT active alerts, UPDATE trigger, INSERT history
        assert any("SELECT" in sql for sql in sql_calls)
        assert any("UPDATE" in sql for sql in sql_calls)

    @patch("jobs.check_alerts_job.get_current_prices")
    @patch("jobs.check_alerts_job.db")
    @patch("jobs.check_alerts_job.return_conn")
    def test_triggers_price_below(self, mock_return_conn, mock_db, mock_prices):
        from jobs.check_alerts_job import check_alerts

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_db.return_value = mock_conn

        mock_cursor.fetchall.return_value = [SAMPLE_ACTIVE_ALERT_BELOW]
        mock_cursor.fetchone.return_value = {
            **SAMPLE_ACTIVE_ALERT_BELOW,
            "status": "triggered",
            "current_price": Decimal("95.00"),
        }

        mock_prices.return_value = {"CBA.AX": 95.00}

        check_alerts()

        execute_calls = mock_cursor.execute.call_args_list
        sql_calls = [str(c[0][0]).upper() for c in execute_calls]
        assert any("UPDATE" in sql for sql in sql_calls)

    @patch("jobs.check_alerts_job.get_current_prices")
    @patch("jobs.check_alerts_job.db")
    @patch("jobs.check_alerts_job.return_conn")
    def test_skips_non_matching_alerts(self, mock_return_conn, mock_db, mock_prices):
        from jobs.check_alerts_job import check_alerts

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_db.return_value = mock_conn

        # PRICE_ABOVE with threshold 45, but price is only 40
        mock_cursor.fetchall.return_value = [SAMPLE_ACTIVE_ALERT_ABOVE]
        mock_prices.return_value = {"BHP.AX": 40.00}

        check_alerts()

        # Should only have the SELECT for active alerts, no UPDATE
        execute_calls = mock_cursor.execute.call_args_list
        sql_calls = [str(c[0][0]).upper() for c in execute_calls]
        assert not any("UPDATE" in sql for sql in sql_calls)

    @patch("jobs.check_alerts_job.get_current_prices")
    @patch("jobs.check_alerts_job.db")
    @patch("jobs.check_alerts_job.return_conn")
    def test_handles_empty_alerts(self, mock_return_conn, mock_db, mock_prices):
        from jobs.check_alerts_job import check_alerts

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_db.return_value = mock_conn

        mock_cursor.fetchall.return_value = []

        check_alerts()

        # get_current_prices should not be called when no alerts
        mock_prices.assert_not_called()

    @patch("jobs.check_alerts_job.logger")
    @patch("jobs.check_alerts_job.db")
    @patch("jobs.check_alerts_job.return_conn")
    def test_handles_db_error_gracefully(self, mock_return_conn, mock_db, mock_logger):
        from jobs.check_alerts_job import check_alerts

        mock_db.side_effect = Exception("connection failed")

        # Should not raise
        check_alerts()

        mock_logger.error.assert_called()
