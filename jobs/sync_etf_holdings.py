"""
jobs/sync_etf_holdings.py
ETF Holdings Sync Job - Fetches and syncs ETF holdings from EODHD API.

This job:
1. Fetches holdings data from EODHD API for tracked ETFs
2. Parses the holdings response
3. Bulk upserts holdings into the etf_holdings table
4. Handles errors gracefully per-ETF
5. Logs progress and summary statistics

Usage:
    python -m jobs.sync_etf_holdings
"""

import os
import sys
from datetime import date
from typing import Dict, List, Optional

import requests
from psycopg2.extras import execute_values

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core import db, return_conn, logger

# List of ETFs to sync holdings for
TRACKED_ETFS = ["IOZ.AX", "VAS.AX", "IVV.AX", "VGS.AX", "A200.AX"]

# EODHD API configuration
API_BASE = "https://eodhd.com/api"
DEFAULT_TIMEOUT = 30


def fetch_etf_holdings(etf_symbol: str, api_key: str) -> List[Dict]:
    """
    Fetch holdings from EODHD API for a specific ETF.

    Args:
        etf_symbol: ETF symbol (e.g., 'IOZ.AX')
        api_key: EODHD API key

    Returns:
        List of holdings dicts with keys: holding_symbol, holding_name, weight, shares, market_value, sector

    Example response from EODHD:
        {
            "Holdings": {
                "BHP.AX": {
                    "Code": "BHP.AX",
                    "Name": "BHP Group Limited",
                    "Assets_%": 5.23,
                    "Number of Shares": 1000000,
                    "Market Value": 45000000.0,
                    "Sector": "Materials"
                }
            }
        }
    """
    url = f"{API_BASE}/fundamentals/{etf_symbol}"
    params = {
        "api_token": api_key,
        "filter": "Holdings"
    }

    try:
        response = requests.get(url, params=params, timeout=DEFAULT_TIMEOUT)
        response.raise_for_status()
        data = response.json()

        # Extract holdings from response
        holdings_data = data.get('Holdings', {})

        if not holdings_data:
            return []

        # Parse holdings into standardized format
        holdings = []
        for holding_key, holding_info in holdings_data.items():
            # Handle different possible field names from EODHD
            holding = {
                'holding_symbol': holding_info.get('Code', holding_key),
                'holding_name': holding_info.get('Name'),
                'weight': holding_info.get('Assets_%') or holding_info.get('Weight'),
                'shares': holding_info.get('Number of Shares') or holding_info.get('Shares'),
                'market_value': holding_info.get('Market Value') or holding_info.get('Value'),
                'sector': holding_info.get('Sector')
            }
            holdings.append(holding)

        logger.info(f"Fetched {len(holdings)} holdings for {etf_symbol}")
        return holdings

    except requests.exceptions.HTTPError as e:
        logger.error(f"EODHD API HTTP error for {etf_symbol}: {e}")
        return []
    except requests.exceptions.Timeout:
        logger.error(f"EODHD API timeout for {etf_symbol}")
        return []
    except requests.exceptions.RequestException as e:
        logger.error(f"EODHD API request error for {etf_symbol}: {e}")
        return []
    except (ValueError, KeyError, TypeError) as e:
        logger.error(f"Error parsing EODHD response for {etf_symbol}: {e}")
        return []


def upsert_holdings(conn, etf_symbol: str, holdings: List[Dict], as_of: date) -> int:
    """
    Bulk upsert holdings into etf_holdings table.

    Args:
        conn: Database connection
        etf_symbol: ETF symbol
        holdings: List of holding dicts
        as_of: Date of the holdings data

    Returns:
        Number of holdings upserted

    The function uses ON CONFLICT to update existing records or insert new ones.
    """
    if not holdings:
        return 0

    # Prepare data rows for bulk insert
    data_rows = []
    for holding in holdings:
        data_rows.append((
            etf_symbol,
            holding['holding_symbol'],
            holding.get('holding_name'),
            holding.get('weight'),
            holding.get('shares'),
            holding.get('market_value'),
            holding.get('sector'),
            as_of
        ))

    sql = """
        INSERT INTO etf_holdings (
            etf_symbol, holding_symbol, holding_name, weight,
            shares_held, market_value, sector, as_of_date
        )
        VALUES %s
        ON CONFLICT (etf_symbol, holding_symbol, as_of_date)
        DO UPDATE SET
            holding_name = EXCLUDED.holding_name,
            weight = EXCLUDED.weight,
            shares_held = EXCLUDED.shares_held,
            market_value = EXCLUDED.market_value,
            sector = EXCLUDED.sector,
            created_at = NOW()
    """

    with conn.cursor() as cur:
        execute_values(cur, sql, data_rows)

    return len(data_rows)


def run():
    """
    Main entry point for the ETF holdings sync job.

    Process:
    1. Get database connection
    2. Loop through tracked ETFs
    3. Fetch holdings from EODHD API
    4. Upsert holdings into database
    5. Log summary statistics

    The job is designed to be resilient:
    - Individual ETF failures don't stop the entire job
    - Empty responses are logged but not treated as fatal errors
    - Database transactions are handled per-ETF
    """
    api_key = os.environ.get("EODHD_API_KEY")
    if not api_key:
        logger.error("EODHD_API_KEY environment variable not set")
        sys.exit(1)

    logger.info(f"Starting ETF holdings sync job for {len(TRACKED_ETFS)} ETFs")

    # Use today's date for all holdings
    as_of = date.today()

    conn = None
    total_holdings_synced = 0
    successful_etfs = 0
    failed_etfs = 0

    try:
        conn = db()

        for etf_symbol in TRACKED_ETFS:
            logger.info(f"Processing {etf_symbol}...")

            try:
                # Fetch holdings from EODHD API
                holdings = fetch_etf_holdings(etf_symbol, api_key)

                if not holdings:
                    logger.warning(f"No holdings returned for {etf_symbol} - skipping")
                    failed_etfs += 1
                    continue

                # Upsert holdings into database
                count = upsert_holdings(conn, etf_symbol, holdings, as_of)
                conn.commit()

                logger.info(f"Synced {count} holdings for {etf_symbol}")
                total_holdings_synced += count
                successful_etfs += 1

            except Exception as e:
                logger.error(f"Error processing {etf_symbol}: {e}", exc_info=True)
                conn.rollback()
                failed_etfs += 1
                continue

        # Log summary
        logger.info(
            f"ETF holdings sync complete: "
            f"{successful_etfs} ETFs successful, "
            f"{failed_etfs} ETFs failed, "
            f"{total_holdings_synced} total holdings synced for {as_of}"
        )

    except Exception as e:
        logger.error(f"Fatal error in ETF holdings sync job: {e}", exc_info=True)
        sys.exit(1)

    finally:
        if conn:
            return_conn(conn)


if __name__ == "__main__":
    run()
