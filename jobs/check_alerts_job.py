"""
jobs/check_alerts_job.py
Check all active price alerts against current market prices.
Triggers alerts when conditions are met and records history.

Schedule: Every 15 minutes during market hours (10:00-16:00 AEST weekdays)
Cron:     */15 0-6 * * 1-5   (UTC equivalent of 10:00-16:00 AEST)
"""

import logging
import os
import sys

# Ensure project root is on the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from psycopg2.extras import RealDictCursor

from app.core import db, return_conn

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


def get_current_prices(symbols: list) -> dict:
    """
    Fetch latest closing prices for the given symbols from the prices table.

    Args:
        symbols: list of ticker symbols (e.g. ["BHP.AX", "CBA.AX"])

    Returns:
        dict mapping symbol -> price (float). Empty dict on error.
    """
    if not symbols:
        return {}

    try:
        conn = db()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        # Get the latest price per symbol from the prices table using a
        # DISTINCT ON query (PostgreSQL-specific).
        placeholders = ", ".join(["%s"] * len(symbols))
        cur.execute(
            f"""
            SELECT DISTINCT ON (symbol) symbol, close
            FROM prices
            WHERE symbol IN ({placeholders})
            ORDER BY symbol, date DESC
            """,
            symbols,
        )
        rows = cur.fetchall()
        return_conn(conn)

        return {r["symbol"]: float(r["close"]) for r in rows}

    except Exception as e:
        logger.error("Failed to fetch current prices: %s", e)
        return {}


def check_alerts():
    """
    Main job entry point.

    1. Fetch all active price alerts.
    2. Collect the distinct symbols.
    3. Fetch current prices for those symbols.
    4. Evaluate each alert against the current price.
    5. Trigger matching alerts (update status, record history).
    """
    try:
        conn = db()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # 1. Fetch active alerts
        cur.execute(
            """
            SELECT id, user_id, symbol, alert_type, threshold, status,
                   notification_channel, created_at, triggered_at, current_price
            FROM price_alerts
            WHERE status = 'active'
            ORDER BY symbol ASC
            """
        )
        active_alerts = cur.fetchall()

        if not active_alerts:
            logger.info("No active alerts to check")
            return_conn(conn)
            return

        # 2. Collect distinct symbols
        symbols = list({a["symbol"] for a in active_alerts})
        logger.info("Checking %d active alerts across %d symbols", len(active_alerts), len(symbols))

        # 3. Fetch current prices
        prices = get_current_prices(symbols)

        if not prices:
            logger.warning("No prices available for symbols: %s", symbols)
            return_conn(conn)
            return

        # 4 + 5. Evaluate and trigger
        triggered_count = 0

        for alert in active_alerts:
            symbol = alert["symbol"]
            if symbol not in prices:
                continue

            price = prices[symbol]
            threshold = float(alert["threshold"])
            alert_type = alert["alert_type"]
            should_trigger = False

            if alert_type == "PRICE_ABOVE" and price >= threshold:
                should_trigger = True
            elif alert_type == "PRICE_BELOW" and price <= threshold:
                should_trigger = True
            elif alert_type == "VOLUME_SPIKE" and price >= threshold:
                should_trigger = True

            if should_trigger:
                # Update alert
                cur.execute(
                    """
                    UPDATE price_alerts
                    SET status = 'triggered',
                        triggered_at = NOW(),
                        current_price = %s
                    WHERE id = %s
                    RETURNING id, symbol, alert_type, threshold
                    """,
                    (price, alert["id"]),
                )
                result = cur.fetchone()

                if result:
                    # Insert history
                    cur.execute(
                        """
                        INSERT INTO alert_history
                            (alert_id, symbol, alert_type, threshold, price_at_trigger)
                        VALUES (%s, %s, %s, %s, %s)
                        """,
                        (alert["id"], symbol, alert_type, alert["threshold"], price),
                    )
                    triggered_count += 1
                    logger.info(
                        "Triggered alert id=%s: %s %s threshold=%s price=%s",
                        alert["id"], symbol, alert_type, threshold, price,
                    )

        conn.commit()
        return_conn(conn)

        logger.info(
            "Alert check complete: %d checked, %d triggered",
            len(active_alerts), triggered_count,
        )

    except Exception as e:
        logger.error("Alert check job failed: %s", e)


if __name__ == "__main__":
    check_alerts()
