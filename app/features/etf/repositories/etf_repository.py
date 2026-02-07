"""
app/features/etf/repositories/etf_repository.py
Repository for ETF holdings data access and persistence.
"""

from typing import Optional, List, Dict, Any
from datetime import date

from psycopg2.extras import RealDictCursor, execute_values

from app.core.repository import BaseRepository
from app.core import db_context, logger


class ETFRepository(BaseRepository):
    """
    Repository for managing ETF holdings data persistence and retrieval.

    This repository handles all database operations for:
    - ETF holdings (etf_holdings)
    - Holdings retrieval by ETF symbol and date
    - Sector allocation analysis
    - Bulk upsert operations for holdings updates

    All methods use RealDictCursor for dictionary-style result access
    and execute_values for efficient bulk inserts.
    """

    def __init__(self):
        """Initialize ETFRepository with the etf_holdings table."""
        super().__init__('etf_holdings')
        logger.debug("ETFRepository initialized")

    def get_holdings_for_etf(
        self,
        etf_symbol: str,
        as_of_date: Optional[date] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieve holdings for a specific ETF.

        Args:
            etf_symbol: ETF ticker symbol (e.g., "VAS.AX")
            as_of_date: Specific date to retrieve holdings for. If None, gets latest available.

        Returns:
            List of holding dictionaries with:
                - id: Record ID
                - etf_symbol: ETF ticker
                - holding_symbol: Holding ticker
                - holding_name: Holding company name
                - weight: Portfolio weight (decimal)
                - shares_held: Number of shares
                - market_value: Market value in dollars
                - sector: Sector classification
                - as_of_date: Date of holdings data

        Example:
            >>> repo = ETFRepository()
            >>> holdings = repo.get_holdings_for_etf("VAS.AX")
            >>> print(len(holdings))
            200
            >>> print(holdings[0]['holding_symbol'])
            'BHP.AX'
        """
        try:
            with db_context() as conn:
                cur = conn.cursor(cursor_factory=RealDictCursor)

                if as_of_date:
                    # Get holdings for specific date
                    cur.execute(
                        """
                        SELECT
                            id,
                            etf_symbol,
                            holding_symbol,
                            holding_name,
                            weight,
                            shares_held,
                            market_value,
                            sector,
                            as_of_date
                        FROM etf_holdings
                        WHERE etf_symbol = %s AND as_of_date = %s
                        ORDER BY weight DESC
                        """,
                        (etf_symbol, as_of_date)
                    )
                else:
                    # Get holdings for latest available date
                    cur.execute(
                        """
                        SELECT
                            id,
                            etf_symbol,
                            holding_symbol,
                            holding_name,
                            weight,
                            shares_held,
                            market_value,
                            sector,
                            as_of_date
                        FROM etf_holdings
                        WHERE etf_symbol = %s
                        AND as_of_date = (
                            SELECT MAX(as_of_date)
                            FROM etf_holdings
                            WHERE etf_symbol = %s
                        )
                        ORDER BY weight DESC
                        """,
                        (etf_symbol, etf_symbol)
                    )

                holdings = cur.fetchall()
                logger.info(
                    f"Retrieved {len(holdings)} holdings for ETF={etf_symbol}, "
                    f"as_of_date={as_of_date or 'latest'}"
                )
                return holdings

        except Exception as e:
            logger.error(f"Error retrieving holdings for ETF={etf_symbol}: {e}")
            raise

    def get_holdings_by_date(
        self,
        as_of_date: date
    ) -> List[Dict[str, Any]]:
        """
        Retrieve all holdings across all ETFs for a specific date.

        Args:
            as_of_date: Date to retrieve holdings for

        Returns:
            List of holding dictionaries

        Example:
            >>> repo = ETFRepository()
            >>> holdings = repo.get_holdings_by_date(date(2024, 1, 15))
            >>> print(len(holdings))
            5000
        """
        try:
            with db_context() as conn:
                cur = conn.cursor(cursor_factory=RealDictCursor)

                cur.execute(
                    """
                    SELECT
                        id,
                        etf_symbol,
                        holding_symbol,
                        holding_name,
                        weight,
                        shares_held,
                        market_value,
                        sector,
                        as_of_date
                    FROM etf_holdings
                    WHERE as_of_date = %s
                    ORDER BY etf_symbol, weight DESC
                    """,
                    (as_of_date,)
                )

                holdings = cur.fetchall()
                logger.info(f"Retrieved {len(holdings)} holdings for date={as_of_date}")
                return holdings

        except Exception as e:
            logger.error(f"Error retrieving holdings for date={as_of_date}: {e}")
            raise

    def bulk_upsert_holdings(
        self,
        holdings: List[Dict[str, Any]]
    ) -> int:
        """
        Bulk upsert ETF holdings data.

        Uses execute_values for efficient bulk insertion with ON CONFLICT handling
        to update existing records.

        Args:
            holdings: List of holding dictionaries, each containing:
                - etf_symbol: ETF ticker
                - holding_symbol: Holding ticker
                - holding_name: Holding company name (optional)
                - weight: Portfolio weight (optional)
                - shares_held: Number of shares (optional)
                - market_value: Market value (optional)
                - sector: Sector classification (optional)
                - as_of_date: Date of holdings data

        Returns:
            Number of holdings persisted

        Example:
            >>> repo = ETFRepository()
            >>> holdings = [
            ...     {
            ...         "etf_symbol": "VAS.AX",
            ...         "holding_symbol": "BHP.AX",
            ...         "holding_name": "BHP Group Ltd",
            ...         "weight": 0.0725,
            ...         "shares_held": 1000000,
            ...         "market_value": 42500000.00,
            ...         "sector": "Materials",
            ...         "as_of_date": date(2024, 1, 15)
            ...     }
            ... ]
            >>> count = repo.bulk_upsert_holdings(holdings)
            >>> print(count)
            1
        """
        if not holdings:
            logger.debug("No holdings to persist")
            return 0

        try:
            # Prepare rows for bulk insert
            rows = []
            for h in holdings:
                rows.append((
                    h.get("etf_symbol"),
                    h.get("holding_symbol"),
                    h.get("holding_name"),
                    float(h.get("weight")) if h.get("weight") is not None else None,
                    int(h.get("shares_held")) if h.get("shares_held") is not None else None,
                    float(h.get("market_value")) if h.get("market_value") is not None else None,
                    h.get("sector"),
                    h.get("as_of_date"),
                ))

            with db_context() as conn:
                cur = conn.cursor()
                execute_values(
                    cur,
                    """
                    INSERT INTO etf_holdings (
                        etf_symbol,
                        holding_symbol,
                        holding_name,
                        weight,
                        shares_held,
                        market_value,
                        sector,
                        as_of_date
                    )
                    VALUES %s
                    ON CONFLICT (etf_symbol, holding_symbol, as_of_date) DO UPDATE SET
                        holding_name = EXCLUDED.holding_name,
                        weight = EXCLUDED.weight,
                        shares_held = EXCLUDED.shares_held,
                        market_value = EXCLUDED.market_value,
                        sector = EXCLUDED.sector
                    """,
                    rows
                )

            logger.info(f"Bulk upserted {len(rows)} holdings")
            return len(rows)

        except Exception as e:
            logger.error(f"Error bulk upserting holdings: {e}")
            raise

    def get_all_etfs(self) -> List[Dict[str, Any]]:
        """
        Get list of all ETFs with holdings count.

        Returns:
            List of dictionaries containing:
                - etf_symbol: ETF ticker
                - holdings_count: Number of holdings
                - latest_date: Most recent holdings date

        Example:
            >>> repo = ETFRepository()
            >>> etfs = repo.get_all_etfs()
            >>> print(etfs[0]['etf_symbol'])
            'VAS.AX'
            >>> print(etfs[0]['holdings_count'])
            200
        """
        try:
            with db_context() as conn:
                cur = conn.cursor(cursor_factory=RealDictCursor)

                cur.execute(
                    """
                    SELECT
                        etf_symbol,
                        COUNT(*) as holdings_count,
                        MAX(as_of_date) as latest_date
                    FROM etf_holdings
                    GROUP BY etf_symbol
                    ORDER BY etf_symbol
                    """
                )

                etfs = cur.fetchall()
                logger.info(f"Retrieved {len(etfs)} ETFs")
                return etfs

        except Exception as e:
            logger.error(f"Error retrieving ETF list: {e}")
            raise

    def get_sector_allocation(
        self,
        etf_symbol: str,
        as_of_date: Optional[date] = None
    ) -> List[Dict[str, Any]]:
        """
        Get sector allocation breakdown for an ETF.

        Args:
            etf_symbol: ETF ticker symbol
            as_of_date: Specific date to retrieve allocation for. If None, gets latest.

        Returns:
            List of dictionaries containing:
                - sector: Sector name
                - total_weight: Sum of weights for the sector
                - holding_count: Number of holdings in the sector

        Example:
            >>> repo = ETFRepository()
            >>> allocations = repo.get_sector_allocation("VAS.AX")
            >>> print(allocations[0]['sector'])
            'Financials'
            >>> print(allocations[0]['total_weight'])
            0.35
        """
        try:
            with db_context() as conn:
                cur = conn.cursor(cursor_factory=RealDictCursor)

                if as_of_date:
                    cur.execute(
                        """
                        SELECT
                            sector,
                            SUM(weight) as total_weight,
                            COUNT(*) as holding_count
                        FROM etf_holdings
                        WHERE etf_symbol = %s AND as_of_date = %s
                        GROUP BY sector
                        ORDER BY total_weight DESC
                        """,
                        (etf_symbol, as_of_date)
                    )
                else:
                    cur.execute(
                        """
                        SELECT
                            sector,
                            SUM(weight) as total_weight,
                            COUNT(*) as holding_count
                        FROM etf_holdings
                        WHERE etf_symbol = %s
                        AND as_of_date = (
                            SELECT MAX(as_of_date)
                            FROM etf_holdings
                            WHERE etf_symbol = %s
                        )
                        GROUP BY sector
                        ORDER BY total_weight DESC
                        """,
                        (etf_symbol, etf_symbol)
                    )

                allocations = cur.fetchall()
                logger.info(
                    f"Retrieved sector allocation for ETF={etf_symbol}, "
                    f"{len(allocations)} sectors"
                )
                return allocations

        except Exception as e:
            logger.error(f"Error retrieving sector allocation for ETF={etf_symbol}: {e}")
            raise

    def get_latest_holdings_date(
        self,
        etf_symbol: str
    ) -> Optional[date]:
        """
        Get the latest as_of_date for a specific ETF's holdings.

        Args:
            etf_symbol: ETF ticker symbol

        Returns:
            Latest date or None if no holdings exist

        Example:
            >>> repo = ETFRepository()
            >>> latest = repo.get_latest_holdings_date("VAS.AX")
            >>> print(latest)
            2024-01-15
        """
        try:
            with db_context() as conn:
                cur = conn.cursor(cursor_factory=RealDictCursor)

                cur.execute(
                    """
                    SELECT MAX(as_of_date) as max_date
                    FROM etf_holdings
                    WHERE etf_symbol = %s
                    """,
                    (etf_symbol,)
                )

                row = cur.fetchone()
                latest_date = row['max_date'] if row else None

                if latest_date:
                    logger.debug(f"Latest holdings date for ETF={etf_symbol}: {latest_date}")
                else:
                    logger.debug(f"No holdings found for ETF={etf_symbol}")

                return latest_date

        except Exception as e:
            logger.error(f"Error retrieving latest holdings date for ETF={etf_symbol}: {e}")
            raise
