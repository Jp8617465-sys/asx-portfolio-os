"""
app/features/portfolio/repositories/portfolio_repository.py
Repository for portfolio data access and persistence.
"""

from typing import Optional, List, Dict, Any
from datetime import date, datetime, timedelta
from decimal import Decimal

from psycopg2.extras import RealDictCursor, execute_values
import numpy as np

from app.core.repository import BaseRepository
from app.core import db_context, logger


class PortfolioRepository(BaseRepository):
    """
    Repository for managing portfolio and holdings data persistence and retrieval.

    This repository handles all database operations for:
    - User portfolios (user_portfolios)
    - Holdings (user_holdings)
    - Portfolio totals and calculations
    """

    def __init__(self):
        """Initialize PortfolioRepository with the user_portfolios table."""
        super().__init__('user_portfolios')
        logger.debug("PortfolioRepository initialized")

    def get_portfolio_by_user_id(
        self,
        user_id: int
    ) -> Optional[Dict[str, Any]]:
        """
        Get the active portfolio for a user.

        Args:
            user_id: User ID to retrieve portfolio for

        Returns:
            Dictionary with portfolio data or None if not found:
                - id: Portfolio ID
                - user_id: User ID
                - name: Portfolio name
                - total_value: Total portfolio value
                - total_cost_basis: Total cost basis
                - total_pl: Total P&L
                - total_pl_pct: Total P&L percentage
                - cash_balance: Cash balance
                - last_synced_at: Last sync timestamp

        Example:
            >>> repo = PortfolioRepository()
            >>> portfolio = repo.get_portfolio_by_user_id(123)
            >>> print(portfolio['name'])
            'My Portfolio'
        """
        try:
            with db_context() as conn:
                cur = conn.cursor(cursor_factory=RealDictCursor)

                cur.execute(
                    """
                    SELECT
                        id, user_id, name, total_value, total_cost_basis,
                        total_pl, total_pl_pct, cash_balance, last_synced_at,
                        is_active, created_at, updated_at
                    FROM user_portfolios
                    WHERE user_id = %s AND is_active = true
                    LIMIT 1
                    """,
                    (user_id,)
                )
                row = cur.fetchone()

                if not row:
                    logger.debug(f"No active portfolio found for user_id={user_id}")
                    return None

                portfolio = dict(row)
                logger.debug(f"Retrieved portfolio {portfolio['id']} for user_id={user_id}")
                return portfolio

        except Exception as e:
            logger.error(f"Error retrieving portfolio for user_id={user_id}: {e}")
            raise

    def create_portfolio(
        self,
        user_id: int,
        name: str,
        cash_balance: float = 0.0
    ) -> int:
        """
        Create a new portfolio for a user.

        Args:
            user_id: User ID
            name: Portfolio name
            cash_balance: Initial cash balance (default: 0.0)

        Returns:
            The ID of the newly created portfolio

        Example:
            >>> repo = PortfolioRepository()
            >>> portfolio_id = repo.create_portfolio(123, "My Portfolio")
            >>> print(portfolio_id)
            456
        """
        try:
            with db_context() as conn:
                cur = conn.cursor()
                cur.execute(
                    """
                    INSERT INTO user_portfolios (user_id, name, cash_balance)
                    VALUES (%s, %s, %s)
                    RETURNING id
                    """,
                    (user_id, name, cash_balance)
                )
                portfolio_id = cur.fetchone()[0]
                logger.info(f"Created portfolio {portfolio_id} for user_id={user_id}")
                return portfolio_id

        except Exception as e:
            logger.error(f"Error creating portfolio for user_id={user_id}: {e}")
            raise

    def get_holdings(
        self,
        portfolio_id: int
    ) -> List[Dict[str, Any]]:
        """
        Get all holdings for a portfolio.

        Args:
            portfolio_id: Portfolio ID

        Returns:
            List of holding dictionaries with:
                - id: Holding ID
                - portfolio_id: Portfolio ID
                - ticker: Stock ticker
                - shares: Number of shares
                - avg_cost: Average cost per share
                - date_acquired: Acquisition date
                - current_price: Current price
                - current_value: Current value
                - cost_basis: Cost basis
                - unrealized_pl: Unrealized P&L
                - unrealized_pl_pct: Unrealized P&L percentage
                - current_signal: Current signal
                - signal_confidence: Signal confidence

        Example:
            >>> repo = PortfolioRepository()
            >>> holdings = repo.get_holdings(456)
            >>> print(len(holdings))
            10
        """
        try:
            with db_context() as conn:
                cur = conn.cursor(cursor_factory=RealDictCursor)

                cur.execute(
                    """
                    SELECT
                        id, portfolio_id, ticker, shares, avg_cost, date_acquired,
                        current_price, current_value, cost_basis,
                        unrealized_pl, unrealized_pl_pct,
                        current_signal, signal_confidence,
                        created_at, updated_at
                    FROM user_holdings
                    WHERE portfolio_id = %s
                    ORDER BY current_value DESC NULLS LAST
                    """,
                    (portfolio_id,)
                )
                rows = cur.fetchall()

                holdings = [dict(row) for row in rows]
                logger.debug(f"Retrieved {len(holdings)} holdings for portfolio_id={portfolio_id}")
                return holdings

        except Exception as e:
            logger.error(f"Error retrieving holdings for portfolio_id={portfolio_id}: {e}")
            raise

    def create_holding(
        self,
        portfolio_id: int,
        ticker: str,
        shares: float,
        avg_cost: float,
        date_acquired: Optional[date] = None
    ) -> int:
        """
        Create a new holding in a portfolio.

        Args:
            portfolio_id: Portfolio ID
            ticker: Stock ticker
            shares: Number of shares
            avg_cost: Average cost per share
            date_acquired: Acquisition date (optional)

        Returns:
            The ID of the newly created holding

        Example:
            >>> repo = PortfolioRepository()
            >>> holding_id = repo.create_holding(456, "BHP.AX", 100, 45.50)
            >>> print(holding_id)
            789
        """
        try:
            with db_context() as conn:
                cur = conn.cursor()
                cur.execute(
                    """
                    INSERT INTO user_holdings (
                        portfolio_id, ticker, shares, avg_cost, date_acquired
                    )
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (portfolio_id, ticker, shares, avg_cost, date_acquired)
                )
                holding_id = cur.fetchone()[0]
                logger.info(
                    f"Created holding {holding_id} for portfolio_id={portfolio_id}, "
                    f"ticker={ticker}"
                )
                return holding_id

        except Exception as e:
            logger.error(
                f"Error creating holding for portfolio_id={portfolio_id}, ticker={ticker}: {e}"
            )
            raise

    def delete_holdings_by_portfolio(self, portfolio_id: int) -> int:
        """
        Delete all holdings for a portfolio.

        Args:
            portfolio_id: Portfolio ID

        Returns:
            Number of holdings deleted

        Example:
            >>> repo = PortfolioRepository()
            >>> deleted_count = repo.delete_holdings_by_portfolio(456)
            >>> print(deleted_count)
            10
        """
        try:
            with db_context() as conn:
                cur = conn.cursor()
                cur.execute(
                    "DELETE FROM user_holdings WHERE portfolio_id = %s",
                    (portfolio_id,)
                )
                deleted_count = cur.rowcount
                logger.info(
                    f"Deleted {deleted_count} holdings for portfolio_id={portfolio_id}"
                )
                return deleted_count

        except Exception as e:
            logger.error(f"Error deleting holdings for portfolio_id={portfolio_id}: {e}")
            raise

    def sync_holding_prices(self, holding_id: int) -> None:
        """
        Sync prices and signals for a holding by calling database function.

        Args:
            holding_id: Holding ID

        Example:
            >>> repo = PortfolioRepository()
            >>> repo.sync_holding_prices(789)
        """
        try:
            with db_context() as conn:
                cur = conn.cursor()
                cur.execute("SELECT sync_holding_prices(%s)", (holding_id,))
                logger.debug(f"Synced prices for holding_id={holding_id}")

        except Exception as e:
            logger.error(f"Error syncing prices for holding_id={holding_id}: {e}")
            raise

    def sync_portfolio_prices(self, portfolio_id: int) -> int:
        """
        Sync prices and signals for all holdings in a portfolio.

        Args:
            portfolio_id: Portfolio ID

        Returns:
            Number of holdings synced

        Example:
            >>> repo = PortfolioRepository()
            >>> synced_count = repo.sync_portfolio_prices(456)
            >>> print(synced_count)
            10
        """
        try:
            with db_context() as conn:
                cur = conn.cursor()
                cur.execute("SELECT sync_portfolio_prices(%s)", (portfolio_id,))
                synced_count = cur.fetchone()[0]
                logger.info(
                    f"Synced prices for {synced_count} holdings in portfolio_id={portfolio_id}"
                )
                return synced_count

        except Exception as e:
            logger.error(f"Error syncing portfolio prices for portfolio_id={portfolio_id}: {e}")
            raise

    def update_portfolio_totals(self, portfolio_id: int) -> bool:
        """
        Update portfolio totals by calling database function.

        Args:
            portfolio_id: Portfolio ID

        Returns:
            True if successful

        Example:
            >>> repo = PortfolioRepository()
            >>> repo.update_portfolio_totals(456)
        """
        try:
            with db_context() as conn:
                cur = conn.cursor()
                cur.execute("SELECT update_portfolio_totals(%s)", (portfolio_id,))
                logger.debug(f"Updated totals for portfolio_id={portfolio_id}")
                return True

        except Exception as e:
            logger.error(f"Error updating portfolio totals for portfolio_id={portfolio_id}: {e}")
            raise

    def get_user_portfolio(
        self,
        user_id: int,
        portfolio_id: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Get user's portfolio with all holdings, current prices, P&L, and signals.

        Args:
            user_id: User ID from JWT token
            portfolio_id: Optional specific portfolio ID. If None, gets active portfolio.

        Returns:
            Dictionary with portfolio data and holdings list, or None if not found.

        Example:
            >>> repo = PortfolioRepository()
            >>> portfolio = repo.get_user_portfolio(user_id=123)
            >>> print(portfolio['total_value'])
        """
        try:
            # Get portfolio
            if portfolio_id:
                portfolio = self.find_by_id(portfolio_id)
                if not portfolio or portfolio.get('user_id') != user_id:
                    return None
            else:
                portfolio = self.get_portfolio_by_user_id(user_id)
                if not portfolio:
                    return None
                portfolio_id = portfolio['id']

            # Get holdings
            holdings = self.get_holdings(portfolio_id)

            # Format holdings
            formatted_holdings = []
            for h in holdings:
                formatted_holdings.append({
                    'id': h['id'],
                    'ticker': h['ticker'],
                    'shares': h['shares'],
                    'avg_cost': h['avg_cost'],
                    'date_acquired': h['date_acquired'].isoformat() if h['date_acquired'] else None,
                    'current_price': h['current_price'],
                    'current_value': h['current_value'],
                    'cost_basis': h['cost_basis'],
                    'unrealized_pl': h['unrealized_pl'],
                    'unrealized_pl_pct': h['unrealized_pl_pct'],
                    'current_signal': h['current_signal'],
                    'signal_confidence': h['signal_confidence'],
                })

            return {
                'portfolio_id': portfolio['id'],
                'user_id': portfolio['user_id'],
                'name': portfolio['name'],
                'total_value': portfolio.get('total_value'),
                'total_cost_basis': portfolio.get('total_cost_basis'),
                'total_pl': portfolio.get('total_pl'),
                'total_pl_pct': portfolio.get('total_pl_pct'),
                'cash_balance': portfolio['cash_balance'],
                'num_holdings': len(formatted_holdings),
                'holdings': formatted_holdings,
                'last_synced_at': portfolio['last_synced_at'].isoformat() if portfolio.get('last_synced_at') else None,
            }

        except Exception as e:
            logger.error(f"Error getting user portfolio for user_id={user_id}: {e}")
            raise

    def bulk_upsert_holdings(
        self,
        portfolio_id: int,
        holdings: List[Dict[str, Any]]
    ) -> int:
        """
        Bulk insert or update holdings for a portfolio.

        Args:
            portfolio_id: Portfolio ID
            holdings: List of holding dictionaries

        Returns:
            Number of holdings inserted/updated

        Example:
            >>> repo = PortfolioRepository()
            >>> count = repo.bulk_upsert_holdings(portfolio_id=1, holdings=[...])
        """
        if not holdings:
            logger.debug(f"No holdings to insert for portfolio {portfolio_id}")
            return 0

        # Validate holdings
        for holding in holdings:
            if 'ticker' not in holding or 'shares' not in holding or 'avg_cost' not in holding:
                raise ValueError("Each holding must have 'ticker', 'shares', and 'avg_cost'")

            if float(holding['shares']) <= 0:
                raise ValueError(f"Shares must be positive for {holding['ticker']}")

            if float(holding['avg_cost']) < 0:
                raise ValueError(f"Average cost must be non-negative for {holding['ticker']}")

        try:
            with db_context() as conn:
                cur = conn.cursor()

                # Delete existing holdings
                self.delete_holdings_by_portfolio(portfolio_id)

                # Prepare data for bulk insert
                values = []
                for holding in holdings:
                    values.append((
                        portfolio_id,
                        holding['ticker'],
                        holding['shares'],
                        holding['avg_cost'],
                        holding.get('date_acquired')
                    ))

                # Bulk insert
                execute_values(
                    cur,
                    """
                    INSERT INTO user_holdings (
                        portfolio_id, ticker, shares, avg_cost, date_acquired
                    ) VALUES %s
                    """,
                    values
                )

                # Sync prices for each holding
                cur.execute(
                    "SELECT id FROM user_holdings WHERE portfolio_id = %s",
                    (portfolio_id,)
                )
                holding_ids = cur.fetchall()

                for (holding_id,) in holding_ids:
                    cur.execute("SELECT sync_holding_prices(%s)", (holding_id,))

                logger.info(f"Bulk inserted {len(holdings)} holdings for portfolio {portfolio_id}")
                return len(holdings)

        except Exception as e:
            logger.error(f"Error bulk upserting holdings for portfolio {portfolio_id}: {e}")
            raise

    def get_rebalancing_suggestions(
        self,
        portfolio_id: int,
        regenerate: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Get AI-driven rebalancing suggestions for a portfolio.

        Args:
            portfolio_id: Portfolio ID
            regenerate: If True, regenerate suggestions

        Returns:
            List of rebalancing suggestion dictionaries

        Example:
            >>> repo = PortfolioRepository()
            >>> suggestions = repo.get_rebalancing_suggestions(portfolio_id=1)
        """
        try:
            with db_context() as conn:
                cur = conn.cursor(cursor_factory=RealDictCursor)

                # Get portfolio total value
                cur.execute(
                    "SELECT total_value FROM user_portfolios WHERE id = %s",
                    (portfolio_id,)
                )
                portfolio_row = cur.fetchone()

                if not portfolio_row or not portfolio_row['total_value']:
                    logger.debug(f"Portfolio {portfolio_id} has no value")
                    return []

                total_value = float(portfolio_row['total_value'])

                # Check for existing suggestions (generated in last 24 hours)
                if not regenerate:
                    cur.execute(
                        """
                        SELECT
                            ticker, action, suggested_quantity, suggested_value,
                            reason, current_signal, signal_confidence,
                            current_shares, current_weight_pct, target_weight_pct,
                            priority, confidence_score
                        FROM portfolio_rebalancing_suggestions
                        WHERE portfolio_id = %s
                          AND status = 'pending'
                          AND generated_at > now() - interval '24 hours'
                        ORDER BY priority ASC
                        """,
                        (portfolio_id,)
                    )
                    existing = cur.fetchall()

                    if existing:
                        logger.info(f"Returning {len(existing)} cached suggestions for portfolio {portfolio_id}")
                        return [dict(row) for row in existing]

                # Generate new suggestions
                cur.execute(
                    """
                    SELECT
                        ticker, shares, current_price, current_value,
                        current_signal, signal_confidence
                    FROM user_holdings
                    WHERE portfolio_id = %s
                      AND current_price IS NOT NULL
                    ORDER BY current_value DESC NULLS LAST
                    """,
                    (portfolio_id,)
                )
                holdings = cur.fetchall()

                if not holdings:
                    logger.debug(f"No holdings with prices for portfolio {portfolio_id}")
                    return []

                # Clear old suggestions
                cur.execute(
                    "DELETE FROM portfolio_rebalancing_suggestions WHERE portfolio_id = %s",
                    (portfolio_id,)
                )

                suggestions = []
                priority = 1

                for holding in holdings:
                    ticker = holding['ticker']
                    shares = float(holding['shares'])
                    current_price = float(holding['current_price'])
                    current_value = float(holding['current_value'])
                    signal = holding['current_signal']
                    confidence = float(holding['signal_confidence']) if holding['signal_confidence'] else 0

                    if not signal:
                        continue

                    current_weight = (current_value / total_value) * 100 if total_value else 0

                    action = None
                    suggested_qty = None
                    suggested_value = None
                    target_weight = None
                    conf_score = None
                    reason = None

                    # Rule 1: Strong signals with high confidence
                    if signal == 'STRONG_SELL' and confidence >= 70:
                        action = 'SELL'
                        suggested_qty = shares
                        suggested_value = shares * current_price
                        target_weight = 0
                        conf_score = confidence
                        reason = f"Strong sell signal (confidence: {confidence:.1f}%). Returns don't justify risk."

                    elif signal == 'SELL' and confidence >= 60:
                        action = 'TRIM'
                        suggested_qty = shares * 0.5
                        suggested_value = suggested_qty * current_price
                        target_weight = current_weight * 0.5
                        conf_score = confidence * 0.8
                        reason = f"Sell signal (confidence: {confidence:.1f}%). Consider reducing exposure."

                    elif signal == 'STRONG_BUY' and confidence >= 80:
                        action = 'ADD'
                        suggested_qty = shares * 0.2
                        suggested_value = suggested_qty * current_price
                        target_weight = current_weight * 1.2
                        conf_score = confidence
                        reason = f"Strong buy signal (confidence: {confidence:.1f}%). Attractive entry point."

                    elif signal == 'BUY' and confidence >= 70:
                        action = 'ADD'
                        suggested_qty = shares * 0.1
                        suggested_value = suggested_qty * current_price
                        target_weight = current_weight * 1.1
                        conf_score = confidence * 0.9
                        reason = f"Buy signal (confidence: {confidence:.1f}%). Good value opportunity."

                    # Rule 2: Overweight positions (> 15% of portfolio)
                    elif current_weight > 15:
                        action = 'TRIM'
                        target_value = total_value * 0.12
                        target_shares = target_value / current_price
                        suggested_qty = shares - target_shares
                        suggested_value = suggested_qty * current_price
                        target_weight = 12.0
                        conf_score = 70.0
                        reason = f"Position is {current_weight:.1f}% of portfolio (overweight). Reduce concentration risk."

                    else:
                        continue

                    # Insert suggestion
                    cur.execute(
                        """
                        INSERT INTO portfolio_rebalancing_suggestions (
                            portfolio_id, ticker, action, suggested_quantity, suggested_value,
                            reason, current_signal, signal_confidence,
                            current_shares, current_weight_pct, target_weight_pct,
                            priority, confidence_score, expires_at
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            portfolio_id, ticker, action, suggested_qty, suggested_value,
                            reason, signal, confidence,
                            shares, current_weight, target_weight,
                            priority, conf_score, datetime.now() + timedelta(days=7)
                        )
                    )

                    suggestions.append({
                        'ticker': ticker,
                        'action': action,
                        'suggested_quantity': Decimal(str(suggested_qty)),
                        'suggested_value': Decimal(str(suggested_value)),
                        'reason': reason,
                        'current_signal': signal,
                        'signal_confidence': Decimal(str(confidence)),
                        'current_shares': Decimal(str(shares)),
                        'current_weight_pct': Decimal(str(current_weight)),
                        'target_weight_pct': Decimal(str(target_weight)),
                        'priority': priority,
                        'confidence_score': Decimal(str(conf_score)),
                    })

                    priority += 1

                logger.info(f"Generated {len(suggestions)} rebalancing suggestions for portfolio {portfolio_id}")
                return suggestions

        except Exception as e:
            logger.error(f"Error getting rebalancing suggestions for portfolio {portfolio_id}: {e}")
            raise

    def get_risk_metrics(
        self,
        portfolio_id: int,
        recalculate: bool = False
    ) -> Optional[Dict[str, Any]]:
        """
        Get calculated risk metrics for a portfolio.

        Args:
            portfolio_id: Portfolio ID
            recalculate: If True, recalculate metrics

        Returns:
            Dictionary with risk metrics

        Example:
            >>> repo = PortfolioRepository()
            >>> metrics = repo.get_risk_metrics(portfolio_id=1)
        """
        try:
            with db_context() as conn:
                cur = conn.cursor(cursor_factory=RealDictCursor)

                # Check for existing metrics (calculated today)
                if not recalculate:
                    cur.execute(
                        """
                        SELECT
                            as_of, total_return_pct, volatility, sharpe_ratio, beta,
                            max_drawdown_pct, top_holding_weight_pct,
                            sector_weights, signal_distribution
                        FROM portfolio_risk_metrics
                        WHERE portfolio_id = %s
                          AND as_of = current_date
                        LIMIT 1
                        """,
                        (portfolio_id,)
                    )
                    existing = cur.fetchone()

                    if existing:
                        logger.info(f"Returning cached risk metrics for portfolio {portfolio_id}")
                        return dict(existing)

                # Calculate metrics
                cur.execute(
                    """
                    SELECT
                        h.ticker, h.current_value, h.unrealized_pl_pct, h.current_signal,
                        p.total_value
                    FROM user_holdings h
                    JOIN user_portfolios p ON p.id = h.portfolio_id
                    WHERE h.portfolio_id = %s
                      AND h.current_value IS NOT NULL
                    ORDER BY h.current_value DESC
                    """,
                    (portfolio_id,)
                )
                holdings = cur.fetchall()

                if not holdings:
                    raise ValueError(
                        f"Portfolio {portfolio_id} has no holdings with current prices. Cannot calculate metrics."
                    )

                total_value = float(holdings[0]['total_value'])

                # Calculate concentration metrics
                values = [float(h['current_value']) for h in holdings]
                weights = [v / total_value * 100 for v in values]

                top_holding_weight = weights[0] if weights else 0
                top_5_weight = sum(weights[:5]) if len(weights) >= 5 else sum(weights)

                # Herfindahl index
                herfindahl = sum([(w/100)**2 for w in weights]) if weights else 0

                # Signal distribution
                signal_dist = {}
                for h in holdings:
                    signal = h['current_signal'] or 'UNKNOWN'
                    signal_dist[signal] = signal_dist.get(signal, 0) + 1

                # Simple volatility estimate
                returns = [float(h['unrealized_pl_pct']) for h in holdings if h['unrealized_pl_pct'] is not None]
                volatility = float(np.std(returns)) if returns else None

                # Simplified Sharpe
                avg_return = float(np.mean(returns)) if returns else 0
                sharpe = (avg_return - 2.0) / volatility if volatility and volatility > 0 else None

                # Simplified beta
                beta = 1.0

                # Max drawdown
                max_drawdown = min(returns) if returns else 0

                # Insert metrics
                cur.execute(
                    """
                    INSERT INTO portfolio_risk_metrics (
                        portfolio_id, as_of, total_return_pct, volatility,
                        sharpe_ratio, beta, max_drawdown_pct,
                        top_holding_weight_pct, top_5_weight_pct, herfindahl_index,
                        sector_weights, signal_distribution
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (portfolio_id, as_of)
                    DO UPDATE SET
                        total_return_pct = EXCLUDED.total_return_pct,
                        volatility = EXCLUDED.volatility,
                        sharpe_ratio = EXCLUDED.sharpe_ratio,
                        beta = EXCLUDED.beta,
                        max_drawdown_pct = EXCLUDED.max_drawdown_pct,
                        top_holding_weight_pct = EXCLUDED.top_holding_weight_pct,
                        calculation_timestamp = now()
                    """,
                    (
                        portfolio_id, date.today(), avg_return, volatility,
                        sharpe, beta, max_drawdown,
                        top_holding_weight, top_5_weight, herfindahl,
                        {},  # Sector weights placeholder
                        signal_dist
                    )
                )

                logger.info(f"Calculated risk metrics for portfolio {portfolio_id}")

                return {
                    'as_of': date.today(),
                    'total_return_pct': Decimal(str(avg_return)) if avg_return else None,
                    'volatility': Decimal(str(volatility)) if volatility else None,
                    'sharpe_ratio': Decimal(str(sharpe)) if sharpe else None,
                    'beta': Decimal(str(beta)),
                    'max_drawdown_pct': Decimal(str(max_drawdown)) if max_drawdown else None,
                    'top_holding_weight_pct': Decimal(str(top_holding_weight)),
                    'sector_weights': {},
                    'signal_distribution': signal_dist,
                }

        except Exception as e:
            logger.error(f"Error calculating risk metrics for portfolio {portfolio_id}: {e}")
            raise
