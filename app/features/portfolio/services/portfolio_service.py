"""
app/features/portfolio/services/portfolio_service.py
Business logic for portfolio management operations.

Extracted from /app/routes/portfolio_management.py (28KB monolithic file).
This service follows the service pattern and Test-Driven Development (TDD).
"""

import csv
import io
from typing import Dict, Any, List, Optional
from datetime import datetime

from app.core.service import BaseService
from app.core.events.event_bus import EventType, event_bus
from app.core import logger
from app.features.portfolio.repositories.portfolio_repository import PortfolioRepository


class PortfolioService(BaseService):
    """
    Service for portfolio management business logic.

    This service handles:
    - CSV parsing and validation
    - Portfolio upload and analysis
    - Holdings management
    - Price and signal synchronization
    - Event publishing for portfolio changes

    Follows TDD approach with comprehensive test coverage.
    """

    def __init__(self, repository: Optional[PortfolioRepository] = None):
        """
        Initialize PortfolioService.

        Args:
            repository: PortfolioRepository instance (injected for testing)
        """
        super().__init__()
        self.repository = repository or PortfolioRepository()
        logger.debug("PortfolioService initialized")

    def _parse_csv(self, csv_content: str) -> List[Dict[str, Any]]:
        """
        Parse CSV content into holdings data.

        Expected CSV format:
        ticker,shares,avg_cost,date_acquired
        BHP.AX,100,95.50,2023-06-15
        CBA,250,42.30,2023-08-20  (will add .AX suffix)

        Args:
            csv_content: CSV content as string

        Returns:
            List of holding dictionaries with:
                - ticker: Stock ticker (uppercase with .AX suffix)
                - shares: Number of shares (float)
                - avg_cost: Average cost per share (float)
                - date_acquired: Acquisition date or None (str or None)

        Raises:
            ValueError: If CSV is invalid or missing required columns

        Example:
            >>> service = PortfolioService()
            >>> holdings = service._parse_csv("ticker,shares,avg_cost\\nBHP,100,45.50")
            >>> print(holdings[0])
            {'ticker': 'BHP.AX', 'shares': 100.0, 'avg_cost': 45.50, 'date_acquired': None}
        """
        try:
            csv_reader = csv.DictReader(io.StringIO(csv_content))
            holdings_data = []

            for row_num, row in enumerate(csv_reader, start=1):
                # Validate required fields
                if not all(k in row for k in ['ticker', 'shares', 'avg_cost']):
                    raise ValueError(
                        "CSV must have columns: ticker, shares, avg_cost, date_acquired (optional)"
                    )

                # Parse and convert data
                try:
                    ticker = row['ticker'].strip().upper()
                    shares = float(row['shares'])
                    avg_cost = float(row['avg_cost'])
                    date_acquired = row.get('date_acquired', None)

                    # Strip whitespace from date_acquired if present
                    if date_acquired:
                        date_acquired = date_acquired.strip()
                        if not date_acquired:  # Empty string after strip
                            date_acquired = None

                    # Ensure ticker has .AX suffix if not present
                    if not ticker.endswith('.AX'):
                        ticker = f"{ticker}.AX"

                    holdings_data.append({
                        'ticker': ticker,
                        'shares': shares,
                        'avg_cost': avg_cost,
                        'date_acquired': date_acquired
                    })

                except (ValueError, KeyError) as e:
                    raise ValueError(
                        f"Invalid data in CSV row {row_num}: {str(e)}"
                    )

            if not holdings_data:
                raise ValueError("No valid holdings found in CSV")

            logger.debug(f"Parsed {len(holdings_data)} holdings from CSV")
            return holdings_data

        except csv.Error as e:
            raise ValueError(f"CSV parsing error: {str(e)}")

    def _validate_holdings(self, holdings: List[Dict[str, Any]]) -> None:
        """
        Validate holdings data for business rules.

        Validation rules:
        - Ticker must not be empty
        - Shares must be positive (> 0)
        - Average cost must be non-negative (>= 0)

        Args:
            holdings: List of holding dictionaries to validate

        Raises:
            ValueError: If any validation rule is violated

        Example:
            >>> service = PortfolioService()
            >>> holdings = [{'ticker': 'BHP.AX', 'shares': -100, 'avg_cost': 45.50}]
            >>> service._validate_holdings(holdings)
            ValueError: Shares must be positive for BHP.AX
        """
        for holding in holdings:
            ticker = holding.get('ticker', '')
            shares = holding.get('shares', 0)
            avg_cost = holding.get('avg_cost', 0)

            # Validate ticker
            if not ticker or ticker.strip() == '':
                raise ValueError("Ticker cannot be empty")

            # Validate shares
            if shares <= 0:
                raise ValueError(f"Shares must be positive for {ticker}")

            # Validate cost
            if avg_cost < 0:
                raise ValueError(f"Average cost must be non-negative for {ticker}")

        logger.debug(f"Validated {len(holdings)} holdings")

    def upload_and_analyze_portfolio(
        self,
        user_id: int,
        csv_content: str,
        portfolio_name: str = "My Portfolio"
    ) -> Dict[str, Any]:
        """
        Upload portfolio from CSV and analyze (sync prices/signals).

        This is the main workflow that:
        1. Parses CSV content
        2. Validates holdings data
        3. Creates or updates portfolio
        4. Creates holdings
        5. Syncs prices and signals for each holding
        6. Updates portfolio totals
        7. Publishes PORTFOLIO_CHANGED event

        Args:
            user_id: User ID
            csv_content: CSV content as string
            portfolio_name: Name for the portfolio (default: "My Portfolio")

        Returns:
            Dictionary with:
                - status: 'success'
                - portfolio_id: Portfolio ID
                - holdings_count: Number of holdings uploaded
                - message: Success message

        Raises:
            ValueError: If CSV is invalid or validation fails
            Exception: If database operations fail

        Example:
            >>> service = PortfolioService()
            >>> csv = "ticker,shares,avg_cost\\nBHP,100,45.50\\nCBA,50,95.00"
            >>> result = service.upload_and_analyze_portfolio(
            ...     user_id=123,
            ...     csv_content=csv,
            ...     portfolio_name="Test Portfolio"
            ... )
            >>> print(result['status'])
            'success'
        """
        self._log_operation(
            "Uploading and analyzing portfolio",
            {"user_id": user_id, "portfolio_name": portfolio_name}
        )

        # Step 1: Parse CSV
        holdings_data = self._parse_csv(csv_content)
        logger.info(f"Parsed {len(holdings_data)} holdings from CSV for user_id={user_id}")

        # Step 2: Validate holdings
        self._validate_holdings(holdings_data)
        logger.info(f"Validated {len(holdings_data)} holdings for user_id={user_id}")

        # Step 3: Get or create portfolio
        existing_portfolio = self.repository.get_portfolio_by_user_id(user_id)

        if existing_portfolio:
            portfolio_id = existing_portfolio['id']
            logger.info(f"Using existing portfolio {portfolio_id} for user {user_id}")

            # Delete existing holdings
            deleted_count = self.repository.delete_holdings_by_portfolio(portfolio_id)
            logger.info(f"Deleted {deleted_count} existing holdings from portfolio {portfolio_id}")
        else:
            # Create new portfolio
            portfolio_id = self.repository.create_portfolio(
                user_id=user_id,
                name=portfolio_name,
                cash_balance=0
            )
            logger.info(f"Created new portfolio {portfolio_id} for user {user_id}")

        # Step 4: Create holdings and sync prices
        holdings_count = 0
        for holding in holdings_data:
            # Create holding
            holding_id = self.repository.create_holding(
                portfolio_id=portfolio_id,
                ticker=holding['ticker'],
                shares=holding['shares'],
                avg_cost=holding['avg_cost'],
                date_acquired=holding['date_acquired']
            )

            # Sync prices and signals
            self.repository.sync_holding_prices(holding_id)
            holdings_count += 1

        logger.info(f"Created {holdings_count} holdings for portfolio {portfolio_id}")

        # Step 5: Update portfolio totals
        self.repository.update_portfolio_totals(portfolio_id)
        logger.info(f"Updated totals for portfolio {portfolio_id}")

        # Step 6: Publish event
        self.publish_event(
            EventType.PORTFOLIO_CHANGED,
            {
                "portfolio_id": portfolio_id,
                "user_id": user_id,
                "action": "upload",
                "holdings_count": holdings_count,
                "portfolio_name": portfolio_name
            },
            user_id=str(user_id)
        )

        return {
            "status": "success",
            "portfolio_id": portfolio_id,
            "holdings_count": holdings_count,
            "message": f"Successfully uploaded {holdings_count} holdings"
        }

    def get_portfolio_with_holdings(
        self,
        user_id: int,
        portfolio_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get portfolio with all holdings and enriched data.

        Args:
            user_id: User ID
            portfolio_id: Optional portfolio ID (if None, uses user's active portfolio)

        Returns:
            Dictionary with:
                - portfolio_id: Portfolio ID
                - user_id: User ID
                - name: Portfolio name
                - total_value: Total portfolio value
                - total_cost_basis: Total cost basis
                - total_pl: Total P&L
                - total_pl_pct: Total P&L percentage
                - cash_balance: Cash balance
                - num_holdings: Number of holdings
                - holdings: List of holding dictionaries
                - last_synced_at: Last sync timestamp

        Raises:
            ValueError: If portfolio not found

        Example:
            >>> service = PortfolioService()
            >>> portfolio = service.get_portfolio_with_holdings(user_id=123)
            >>> print(portfolio['num_holdings'])
            10
        """
        self._log_operation(
            "Retrieving portfolio with holdings",
            {"user_id": user_id, "portfolio_id": portfolio_id}
        )

        # Get portfolio
        if portfolio_id:
            # If portfolio_id provided, verify it belongs to user
            portfolio = self.repository.get_portfolio_by_user_id(user_id)
            if not portfolio or portfolio['id'] != portfolio_id:
                raise ValueError(f"Portfolio {portfolio_id} not found for user {user_id}")
        else:
            portfolio = self.repository.get_portfolio_by_user_id(user_id)

        if not portfolio:
            raise ValueError(f"Portfolio not found for user_id={user_id}")

        portfolio_id = portfolio['id']

        # Get holdings
        holdings = self.repository.get_holdings(portfolio_id)

        # Enrich holdings - convert dates to strings
        enriched_holdings = []
        for holding in holdings:
            enriched = dict(holding)
            # Convert date objects to ISO format strings
            if enriched.get('date_acquired'):
                enriched['date_acquired'] = enriched['date_acquired'].isoformat()
            if enriched.get('created_at'):
                enriched['created_at'] = enriched['created_at'].isoformat()
            if enriched.get('updated_at'):
                enriched['updated_at'] = enriched['updated_at'].isoformat()
            enriched_holdings.append(enriched)

        # Build response
        result = {
            "portfolio_id": portfolio['id'],
            "user_id": portfolio['user_id'],
            "name": portfolio['name'],
            "total_value": float(portfolio['total_value']) if portfolio.get('total_value') else None,
            "total_cost_basis": float(portfolio['total_cost_basis']) if portfolio.get('total_cost_basis') else None,
            "total_pl": float(portfolio['total_pl']) if portfolio.get('total_pl') else None,
            "total_pl_pct": float(portfolio['total_pl_pct']) if portfolio.get('total_pl_pct') else None,
            "cash_balance": float(portfolio.get('cash_balance', 0)),
            "num_holdings": len(enriched_holdings),
            "holdings": enriched_holdings,
            "last_synced_at": portfolio['last_synced_at'].isoformat() if portfolio.get('last_synced_at') else None,
        }

        logger.info(
            f"Retrieved portfolio {portfolio_id} with {len(enriched_holdings)} holdings "
            f"for user_id={user_id}"
        )

        return result

    def analyze_portfolio(self, user_id: int, portfolio_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Analyze portfolio by syncing latest prices and signals.

        This method:
        1. Syncs current prices for all holdings
        2. Updates signals from Model A and Model B
        3. Calculates P&L and valuations
        4. Updates portfolio totals
        5. Publishes PORTFOLIO_CHANGED event
        6. Returns refreshed portfolio data

        Args:
            user_id: User ID
            portfolio_id: Optional portfolio ID (if None, uses user's active portfolio)

        Returns:
            Dictionary with refreshed portfolio and holdings data

        Raises:
            ValueError: If portfolio not found

        Example:
            >>> service = PortfolioService()
            >>> result = service.analyze_portfolio(user_id=123)
            >>> print(result['num_holdings'])
            10
        """
        self._log_operation(
            "Analyzing portfolio",
            {"user_id": user_id, "portfolio_id": portfolio_id}
        )

        # Get portfolio
        portfolio = self.repository.get_portfolio_by_user_id(user_id)

        if not portfolio:
            raise ValueError(f"Portfolio not found for user_id={user_id}")

        portfolio_id = portfolio['id']

        # Sync all holdings (prices and signals)
        synced_count = self.repository.sync_portfolio_prices(portfolio_id)
        logger.info(f"Synced {synced_count} holdings for portfolio {portfolio_id}")

        # Publish event
        self.publish_event(
            EventType.PORTFOLIO_CHANGED,
            {
                "portfolio_id": portfolio_id,
                "user_id": user_id,
                "action": "analyze",
                "synced_count": synced_count
            },
            user_id=str(user_id)
        )

        # Return updated portfolio with holdings
        return self.get_portfolio_with_holdings(user_id=user_id, portfolio_id=portfolio_id)
