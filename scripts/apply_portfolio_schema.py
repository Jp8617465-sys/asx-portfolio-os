#!/usr/bin/env python3
"""
Apply user_portfolios schema to the database.
Run this once to create the portfolio management tables.
"""

import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core import db, logger


def apply_schema():
    """Apply the user_portfolios schema to the database."""
    schema_file = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        'schemas',
        'user_portfolios.sql'
    )

    if not os.path.exists(schema_file):
        logger.error(f"Schema file not found: {schema_file}")
        return False

    logger.info(f"Reading schema from: {schema_file}")

    with open(schema_file, 'r') as f:
        schema_sql = f.read()

    logger.info("Applying schema to database...")

    try:
        with db() as con, con.cursor() as cur:
            # Execute the schema SQL
            cur.execute(schema_sql)
            con.commit()

        logger.info("✅ Successfully applied user_portfolios schema!")
        logger.info("Created tables:")
        logger.info("  - user_portfolios")
        logger.info("  - user_holdings")
        logger.info("  - portfolio_rebalancing_suggestions")
        logger.info("  - portfolio_risk_metrics")
        logger.info("Created view:")
        logger.info("  - vw_portfolio_summary")
        logger.info("Created functions:")
        logger.info("  - update_portfolio_totals()")
        logger.info("  - sync_holding_prices()")
        logger.info("  - trigger_update_portfolio_totals()")

        return True

    except Exception as e:
        logger.exception(f"❌ Failed to apply schema: {e}")
        return False


if __name__ == "__main__":
    success = apply_schema()
    sys.exit(0 if success else 1)
