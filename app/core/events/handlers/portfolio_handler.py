"""
Portfolio Change Event Handler

This handler reacts to PORTFOLIO_CHANGED events and performs:
1. Risk metrics recalculation
2. Rebalancing suggestions generation
3. Alert condition checking (stop loss, target prices)
4. Notification creation for users

Phase 3 Week 5 - Event-driven architecture implementation
"""

from typing import Dict, Any, Optional
from datetime import datetime

from app.core.events import Event, EventType
from app.core import logger, db_context
from app.features.portfolio.services import (
    RiskMetricsService,
    RebalancingService,
    PortfolioService
)
from app.features.portfolio.repositories.portfolio_repository import PortfolioRepository


# Alert thresholds
STOP_LOSS_THRESHOLD = -10.0  # Alert when loss exceeds 10%
TARGET_PRICE_THRESHOLD = 15.0  # Alert when gain exceeds 15%


async def handle_portfolio_changed(event: Event) -> None:
    """
    Handle PORTFOLIO_CHANGED events by recalculating metrics and checking alerts.

    This handler is triggered when:
    - Portfolio is uploaded
    - Portfolio is analyzed
    - Holdings are updated
    - Prices are synced

    Args:
        event: Event with payload containing portfolio_id and user_id

    Returns:
        None (side effects: updates database, creates notifications)
    """
    try:
        payload = event.payload
        portfolio_id = payload.get("portfolio_id")
        user_id = payload.get("user_id")
        action = payload.get("action", "unknown")

        # Validate required fields
        if not portfolio_id:
            logger.warning("Portfolio handler received event without portfolio_id")
            return

        logger.info(
            f"Handling portfolio changed event: portfolio_id={portfolio_id}, "
            f"user_id={user_id}, action={action}"
        )

        # Initialize services with repository
        repository = PortfolioRepository()
        risk_service = RiskMetricsService(repository=repository)
        rebalancing_service = RebalancingService(repository=repository)

        # Step 1: Recalculate risk metrics
        try:
            logger.info(f"Calculating risk metrics for portfolio {portfolio_id}")
            risk_metrics = await risk_service.calculate_risk_metrics(
                portfolio_id=portfolio_id,
                recalculate=True
            )
            logger.info(
                f"Risk metrics calculated: volatility={risk_metrics.get('volatility')}, "
                f"sharpe_ratio={risk_metrics.get('sharpe_ratio')}"
            )
        except Exception as e:
            logger.error(f"Error calculating risk metrics for portfolio {portfolio_id}: {e}")
            # Continue processing even if risk calculation fails

        # Step 2: Generate rebalancing suggestions
        try:
            logger.info(f"Generating rebalancing suggestions for portfolio {portfolio_id}")
            rebalancing_result = await rebalancing_service.generate_rebalancing_suggestions(
                portfolio_id=portfolio_id,
                regenerate=True
            )
            suggestions = rebalancing_result.get('suggestions', [])
            logger.info(
                f"Generated {len(suggestions)} rebalancing suggestions "
                f"for portfolio {portfolio_id}"
            )

            # Create notification for rebalancing suggestions if any
            if suggestions and user_id:
                create_notification(
                    user_id=user_id,
                    notification_type='portfolio_alert',
                    title='Portfolio Rebalancing Suggested',
                    message=f"Review {len(suggestions)} rebalancing suggestion(s) for your portfolio.",
                    data={
                        'portfolio_id': portfolio_id,
                        'suggestions_count': len(suggestions),
                        'action': 'view_rebalancing'
                    },
                    priority='normal'
                )
        except Exception as e:
            logger.error(f"Error generating rebalancing suggestions for portfolio {portfolio_id}: {e}")
            # Continue processing

        # Step 3: Check alert conditions (stop loss, target prices)
        try:
            holdings = repository.get_holdings(portfolio_id=portfolio_id)
            await check_alert_conditions(holdings, user_id, portfolio_id)
        except Exception as e:
            logger.error(f"Error checking alert conditions for portfolio {portfolio_id}: {e}")
            # Continue processing

        # Step 4: Create notification for portfolio action completion
        if user_id and action in ['upload', 'analyze']:
            holdings_count = payload.get('holdings_count', 0)
            if action == 'upload':
                create_notification(
                    user_id=user_id,
                    notification_type='portfolio_alert',
                    title='Portfolio Upload Complete',
                    message=f"Successfully uploaded portfolio with {holdings_count} holdings.",
                    data={
                        'portfolio_id': portfolio_id,
                        'holdings_count': holdings_count,
                        'action': 'view_portfolio'
                    },
                    priority='normal'
                )
            elif action == 'analyze':
                create_notification(
                    user_id=user_id,
                    notification_type='portfolio_alert',
                    title='Portfolio Analysis Complete',
                    message='Your portfolio has been analyzed with updated prices and signals.',
                    data={
                        'portfolio_id': portfolio_id,
                        'action': 'view_portfolio'
                    },
                    priority='low'
                )

        logger.info(f"Portfolio handler completed for portfolio {portfolio_id}")

    except Exception as e:
        logger.error(f"Error in portfolio change handler: {e}")
        # Don't raise - event handlers should be resilient


async def check_alert_conditions(
    holdings: list,
    user_id: Optional[int],
    portfolio_id: int
) -> None:
    """
    Check holdings for alert conditions and create notifications.

    Alert conditions:
    - Stop loss: Unrealized loss exceeds 10%
    - Target price: Unrealized gain exceeds 15%

    Args:
        holdings: List of holdings with current prices and P&L
        user_id: User ID for notification
        portfolio_id: Portfolio ID

    Returns:
        None (side effect: creates notifications)
    """
    if not holdings or not user_id:
        return

    for holding in holdings:
        ticker = holding.get('ticker')
        unrealized_pl_pct = holding.get('unrealized_pl_pct', 0)
        current_signal = holding.get('current_signal', 'UNKNOWN')

        # Check stop loss condition
        if unrealized_pl_pct <= STOP_LOSS_THRESHOLD:
            logger.info(
                f"Stop loss alert for {ticker}: {unrealized_pl_pct:.2f}% loss "
                f"(signal: {current_signal})"
            )
            create_notification(
                user_id=user_id,
                notification_type='portfolio_alert',
                title=f'Stop Loss Alert - {ticker}',
                message=(
                    f"{ticker} has lost {abs(unrealized_pl_pct):.1f}% from your cost basis. "
                    f"Current signal: {current_signal}. Consider reviewing this position."
                ),
                data={
                    'ticker': ticker,
                    'portfolio_id': portfolio_id,
                    'unrealized_pl_pct': unrealized_pl_pct,
                    'current_signal': current_signal,
                    'alert_type': 'stop_loss',
                    'action': 'view_holding'
                },
                priority='high'
            )

        # Check target price condition
        elif unrealized_pl_pct >= TARGET_PRICE_THRESHOLD:
            logger.info(
                f"Target price alert for {ticker}: {unrealized_pl_pct:.2f}% gain "
                f"(signal: {current_signal})"
            )
            create_notification(
                user_id=user_id,
                notification_type='portfolio_alert',
                title=f'Target Price Reached - {ticker}',
                message=(
                    f"{ticker} has gained {unrealized_pl_pct:.1f}% from your cost basis. "
                    f"Current signal: {current_signal}. Consider taking profits."
                ),
                data={
                    'ticker': ticker,
                    'portfolio_id': portfolio_id,
                    'unrealized_pl_pct': unrealized_pl_pct,
                    'current_signal': current_signal,
                    'alert_type': 'target_price',
                    'action': 'view_holding'
                },
                priority='normal'
            )


def create_notification(
    user_id: int,
    notification_type: str,
    title: str,
    message: str,
    data: Optional[Dict[str, Any]] = None,
    priority: str = 'normal'
) -> Optional[int]:
    """
    Create a notification in the database.

    Args:
        user_id: User ID to notify
        notification_type: Type of notification (e.g., 'portfolio_alert')
        title: Notification title
        message: Notification message
        data: Additional structured data (JSON)
        priority: Priority level ('low', 'normal', 'high', 'urgent')

    Returns:
        Notification ID if created, None otherwise
    """
    try:
        with db_context() as conn:
            cur = conn.cursor()

            # Check if notifications table exists (graceful handling)
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = 'notifications'
                )
            """)
            table_exists = cur.fetchone()[0]

            if not table_exists:
                logger.warning("Notifications table does not exist - skipping notification creation")
                return None

            # Insert notification
            cur.execute("""
                INSERT INTO notifications (
                    user_id, notification_type, title, message, data, priority
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING notification_id
            """, (
                user_id,
                notification_type,
                title,
                message,
                data,  # PostgreSQL handles dict -> jsonb conversion
                priority
            ))

            notification_id = cur.fetchone()[0]
            conn.commit()

            logger.debug(
                f"Created notification {notification_id} for user {user_id}: {title}"
            )

            return notification_id

    except Exception as e:
        logger.error(f"Error creating notification for user {user_id}: {e}")
        return None
