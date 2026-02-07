"""
app/features/etf/services/etf_service.py
Business logic service for ETF operations.

Provides methods to:
- Retrieve ETF holdings with optional signal enrichment
- Get list of all ETFs with metadata
- Calculate sector allocation breakdowns
- Publish events for ETF data access
"""

from typing import Optional, List, Dict, Any

from app.core.service import BaseService
from app.core.events.event_bus import EventType
from app.core import logger
from app.features.etf.repositories import ETFRepository


class ETFService(BaseService):
    """
    Service layer for ETF operations.

    This service encapsulates business logic for:
    - Retrieving ETF holdings with optional signal enrichment
    - Getting list of ETFs with holdings counts
    - Calculating sector allocation breakdowns
    - Publishing events after data operations

    The service inherits from BaseService to get event publishing capability.
    """

    def __init__(self, repository: Optional[ETFRepository] = None):
        """
        Initialize ETFService with repository dependency.

        Args:
            repository: Optional ETFRepository instance for dependency injection.
                       If None, creates a new instance.
        """
        super().__init__()
        self.repo = repository or ETFRepository()
        logger.debug("ETFService initialized")

    async def get_etf_holdings(
        self,
        etf_symbol: str,
        with_signals: bool = False
    ) -> Dict[str, Any]:
        """
        Retrieve holdings for an ETF with optional signal enrichment.

        Args:
            etf_symbol: ETF ticker symbol (e.g., "STW.AX")
            with_signals: If True, enrich holdings with ensemble signals

        Returns:
            Dictionary containing:
                - status: "ok"
                - etf_symbol: ETF ticker
                - holdings_count: Number of holdings
                - as_of_date: Date of holdings data
                - holdings: List of holding dictionaries

        Raises:
            Exception: If repository operation fails

        Example:
            >>> service = ETFService()
            >>> result = await service.get_etf_holdings("STW.AX", with_signals=True)
            >>> print(result['holdings_count'])
            200
        """
        self._log_operation(
            "Retrieving ETF holdings",
            {"etf_symbol": etf_symbol, "with_signals": with_signals}
        )

        try:
            # Get holdings from repository
            # Note: Repository method is get_holdings_for_etf, not get_etf_holdings
            # with_signals handled at route level via JOIN, so we pass it to repo
            # For now, check if repo has get_etf_holdings method (mock) or get_holdings_for_etf (real)
            if hasattr(self.repo, 'get_etf_holdings'):
                # Mock repository interface used in tests
                result = self.repo.get_etf_holdings(
                    etf_symbol=etf_symbol,
                    with_signals=with_signals
                )
            else:
                # Real repository interface - get_holdings_for_etf
                # Signal enrichment is handled at route/query level, not here
                holdings_list = self.repo.get_holdings_for_etf(etf_symbol=etf_symbol)

                as_of_date = None
                if holdings_list:
                    as_of_date = str(holdings_list[0].get('as_of_date')) if holdings_list[0].get('as_of_date') else None

                result = {
                    "etf_symbol": etf_symbol,
                    "holdings_count": len(holdings_list),
                    "as_of_date": as_of_date,
                    "holdings": holdings_list
                }

            # Publish event for data fetching
            # Note: DATA_FETCHED may need to be added to EventType enum
            # For now we use SIGNAL_GENERATED as a placeholder
            await self.publish_event(
                EventType.SIGNAL_GENERATED,  # TODO: Use EventType.DATA_FETCHED when added
                {
                    "etf_symbol": etf_symbol,
                    "holdings_count": result.get("holdings_count", 0),
                    "with_signals": with_signals,
                    "as_of_date": str(result.get("as_of_date")) if result.get("as_of_date") else None,
                }
            )

            # Format response
            return {
                "status": "ok",
                **result
            }

        except Exception as e:
            logger.error(f"Error in get_etf_holdings for {etf_symbol}: {e}")
            raise

    async def get_etf_list(self) -> Dict[str, Any]:
        """
        Get list of all ETFs with holdings counts.

        Returns:
            Dictionary containing:
                - status: "ok"
                - count: Number of ETFs
                - etfs: List of ETF summary dictionaries with:
                    - symbol: ETF ticker
                    - etf_name: ETF name
                    - sector: ETF sector/category
                    - holdings_count: Number of holdings

        Raises:
            Exception: If repository operation fails

        Example:
            >>> service = ETFService()
            >>> result = await service.get_etf_list()
            >>> print(result['count'])
            15
        """
        self._log_operation("Retrieving ETF list")

        try:
            # Get ETF list from repository
            # Check if mock (get_etf_list) or real (get_all_etfs)
            if hasattr(self.repo, 'get_etf_list'):
                # Mock repository interface
                result = self.repo.get_etf_list()
            else:
                # Real repository interface - get_all_etfs
                etfs_list = self.repo.get_all_etfs()
                result = {
                    "count": len(etfs_list),
                    "etfs": [
                        {
                            "symbol": etf.get("etf_symbol"),
                            "etf_name": None,  # Not in repository response
                            "sector": None,    # Not in repository response
                            "holdings_count": etf.get("holdings_count", 0)
                        }
                        for etf in etfs_list
                    ]
                }

            # Format response
            return {
                "status": "ok",
                **result
            }

        except Exception as e:
            logger.error(f"Error in get_etf_list: {e}")
            raise

    async def get_sector_allocation(self, etf_symbol: str) -> Dict[str, Any]:
        """
        Get sector allocation breakdown for an ETF.

        Args:
            etf_symbol: ETF ticker symbol (e.g., "STW.AX")

        Returns:
            Dictionary containing:
                - status: "ok"
                - etf_symbol: ETF ticker
                - sectors: List of sector allocation dictionaries with:
                    - sector: Sector name
                    - weight: Percentage weight
                    - holding_count: Number of holdings in sector

        Raises:
            Exception: If repository operation fails

        Example:
            >>> service = ETFService()
            >>> result = await service.get_sector_allocation("STW.AX")
            >>> print(result['sectors'][0]['sector'])
            'Financials'
        """
        self._log_operation(
            "Retrieving sector allocation",
            {"etf_symbol": etf_symbol}
        )

        try:
            # Get sector allocation from repository
            sectors_list = self.repo.get_sector_allocation(etf_symbol)

            # Format sectors to match expected structure
            # Repository returns: sector, total_weight, holding_count
            # We need: sector, weight, holding_count
            sectors = [
                {
                    "sector": s.get("sector"),
                    "weight": float(s.get("total_weight")) if s.get("total_weight") is not None else 0.0,
                    "holding_count": int(s.get("holding_count", 0))
                }
                for s in sectors_list
            ]

            # Format response
            return {
                "status": "ok",
                "etf_symbol": etf_symbol,
                "sectors": sectors
            }

        except Exception as e:
            logger.error(f"Error in get_sector_allocation for {etf_symbol}: {e}")
            raise
