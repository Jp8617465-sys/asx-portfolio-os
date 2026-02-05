"""
Signal Change Event Handler - Phase 3 Week 5

Handles SIGNAL_GENERATED events by:
1. Checking if any portfolios contain the affected tickers
2. Updating holdings signals in user_holdings table
3. Triggering rebalancing suggestion recalculation if needed
4. Creating notifications for users with affected holdings

Implementation follows TDD methodology with comprehensive test coverage.
"""

from typing import Dict, Any, Optional, List
from datetime import datetime
from psycopg2.extras import RealDictCursor

from app.core import db_context, logger
from app.core.events import Event, EventType, event_bus


# Valid signal values
VALID_SIGNALS = {'STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL'}

# Signal hierarchy for comparison (higher = more bullish)
SIGNAL_HIERARCHY = {
    'STRONG_SELL': 1,
    'SELL': 2,
    'HOLD': 3,
    'BUY': 4,
    'STRONG_BUY': 5
}


def _is_significant_signal_change(old_signal: Optional[str], new_signal: str) -> bool:
    """
    Determine if a signal change is significant enough to trigger notifications.

    A change is considered significant if:
    - It crosses neutral (HOLD) - e.g., BUY to SELL
    - It's a major reversal (e.g., STRONG_BUY to STRONG_SELL)
    - It changes by more than 1 level in the hierarchy

    Args:
        old_signal: Previous signal value
        new_signal: New signal value

    Returns:
        True if the change is significant, False otherwise

    Examples:
        >>> _is_significant_signal_change('BUY', 'SELL')
        True
        >>> _is_significant_signal_change('BUY', 'STRONG_BUY')
        False
        >>> _is_significant_signal_change('STRONG_BUY', 'STRONG_SELL')
        True
    """
    if not old_signal or old_signal not in SIGNAL_HIERARCHY:
        # No previous signal or invalid - any new signal is significant
        return True

    if new_signal not in SIGNAL_HIERARCHY:
        return False

    old_level = SIGNAL_HIERARCHY[old_signal]
    new_level = SIGNAL_HIERARCHY[new_signal]

    # Check if crossing neutral (HOLD = level 3)
    if (old_level < 3 and new_level > 3) or (old_level > 3 and new_level < 3):
        return True

    # Check if major reversal (difference > 2 levels)
    if abs(old_level - new_level) > 2:
        return True

    # Check if change is more than 1 level
    if abs(old_level - new_level) > 1:
        return True

    return False


async def _get_portfolios_with_ticker(ticker: str) -> List[Dict[str, Any]]:
    """
    Find all portfolios that contain holdings for the given ticker.

    Args:
        ticker: Stock ticker symbol (e.g., 'BHP.AX')

    Returns:
        List of dictionaries with portfolio_id, user_id, and holding_id

    Example:
        >>> portfolios = await _get_portfolios_with_ticker('BHP.AX')
        >>> print(len(portfolios))
        3
    """
    try:
        with db_context() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)

            cur.execute(
                """
                SELECT
                    h.portfolio_id,
                    p.user_id,
                    h.id AS holding_id
                FROM user_holdings h
                JOIN user_portfolios p ON p.id = h.portfolio_id
                WHERE h.ticker = %s
                  AND p.is_active = true
                ORDER BY h.portfolio_id
                """,
                (ticker,)
            )

            portfolios = cur.fetchall()
            return [dict(row) for row in portfolios]

    except Exception as e:
        logger.error(f"Error fetching portfolios with ticker {ticker}: {e}")
        return []


async def _get_previous_signal(holding_id: int) -> Optional[Dict[str, Any]]:
    """
    Get the previous signal for a holding.

    Args:
        holding_id: Holding ID

    Returns:
        Dictionary with current_signal and signal_confidence, or None
    """
    try:
        with db_context() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)

            cur.execute(
                """
                SELECT current_signal, signal_confidence
                FROM user_holdings
                WHERE id = %s
                """,
                (holding_id,)
            )

            result = cur.fetchall()
            if result:
                return dict(result[0])
            return None

    except Exception as e:
        logger.error(f"Error fetching previous signal for holding {holding_id}: {e}")
        return None


async def _update_holding_signal(
    holding_id: int,
    signal: str,
    confidence: float,
    model: str
) -> bool:
    """
    Update the signal and confidence for a holding.

    Args:
        holding_id: Holding ID to update
        signal: New signal value
        confidence: New confidence value
        model: Model name that generated the signal

    Returns:
        True if update was successful, False otherwise
    """
    try:
        with db_context() as conn:
            cur = conn.cursor()

            cur.execute(
                """
                UPDATE user_holdings
                SET
                    current_signal = %s,
                    signal_confidence = %s,
                    updated_at = now()
                WHERE id = %s
                """,
                (signal, confidence, holding_id)
            )

            logger.debug(
                f"Updated holding {holding_id} with signal={signal}, "
                f"confidence={confidence}, model={model}"
            )
            return True

    except Exception as e:
        logger.error(f"Error updating holding {holding_id} signal: {e}")
        return False


async def _trigger_rebalancing_recalculation(portfolio_id: int) -> None:
    """
    Trigger rebalancing suggestion recalculation for a portfolio.

    Deletes existing suggestions to force regeneration on next request.

    Args:
        portfolio_id: Portfolio ID
    """
    try:
        with db_context() as conn:
            cur = conn.cursor()

            # Delete existing suggestions to force regeneration
            cur.execute(
                """
                DELETE FROM portfolio_rebalancing_suggestions
                WHERE portfolio_id = %s
                """,
                (portfolio_id,)
            )

            logger.info(
                f"Cleared rebalancing suggestions for portfolio {portfolio_id} "
                f"to trigger recalculation"
            )

    except Exception as e:
        logger.error(
            f"Error triggering rebalancing recalculation for portfolio {portfolio_id}: {e}"
        )


async def _update_portfolio_totals(portfolio_id: int) -> None:
    """
    Update portfolio totals after signal changes.

    Args:
        portfolio_id: Portfolio ID
    """
    try:
        with db_context() as conn:
            cur = conn.cursor()

            # Call database function to update totals
            cur.execute(
                "SELECT update_portfolio_totals(%s)",
                (portfolio_id,)
            )

            logger.debug(f"Updated portfolio totals for portfolio {portfolio_id}")

    except Exception as e:
        logger.error(f"Error updating portfolio totals for portfolio {portfolio_id}: {e}")


async def _create_notification_event(
    user_id: int,
    ticker: str,
    old_signal: Optional[str],
    new_signal: str,
    confidence: float,
    model: str
) -> None:
    """
    Create a notification event for a user about a signal change.

    Args:
        user_id: User ID to notify
        ticker: Stock ticker
        old_signal: Previous signal value
        new_signal: New signal value
        confidence: Signal confidence
        model: Model that generated the signal
    """
    try:
        # Publish notification event to event bus
        notification_event = Event(
            type=EventType.ALERT_TRIGGERED,
            payload={
                'user_id': user_id,
                'ticker': ticker,
                'old_signal': old_signal,
                'new_signal': new_signal,
                'confidence': confidence,
                'model': model,
                'alert_type': 'signal_change',
                'message': f"Signal changed for {ticker}: {old_signal or 'N/A'} → {new_signal} ({confidence:.1f}%)",
                'timestamp': datetime.utcnow().isoformat()
            },
            source='signal_handler',
            user_id=str(user_id)
        )

        await event_bus.publish(notification_event)

        logger.info(
            f"Created notification for user {user_id}: "
            f"{ticker} signal changed from {old_signal} to {new_signal}"
        )

    except Exception as e:
        logger.error(f"Error creating notification for user {user_id}: {e}")


async def handle_signal_generated(event: Event) -> None:
    """
    Handle SIGNAL_GENERATED events.

    This handler:
    1. Extracts signal data from event payload
    2. Finds all portfolios containing the affected ticker
    3. Updates holdings signals in the database
    4. Triggers rebalancing recalculation if signal change is significant
    5. Creates notifications for affected users

    Args:
        event: Event object with SIGNAL_GENERATED type and payload containing:
            - model: Model name (e.g., 'model_a_v1_1')
            - ticker: Stock ticker (e.g., 'BHP.AX')
            - signal: New signal value (STRONG_BUY, BUY, HOLD, SELL, STRONG_SELL)
            - confidence: Confidence score (0-100)
            - timestamp: Signal generation timestamp

    Example:
        >>> event = Event(
        ...     type=EventType.SIGNAL_GENERATED,
        ...     payload={
        ...         'model': 'model_a_v1_1',
        ...         'ticker': 'BHP.AX',
        ...         'signal': 'STRONG_BUY',
        ...         'confidence': 85.5
        ...     }
        ... )
        >>> await handle_signal_generated(event)
    """
    try:
        # Extract payload
        payload = event.payload
        model = payload.get('model', 'unknown')
        ticker = payload.get('ticker')
        signal = payload.get('signal')
        confidence = payload.get('confidence')

        # Validate required fields
        if not ticker:
            logger.warning("Signal event missing ticker field, skipping")
            return

        if not signal:
            logger.warning(f"Signal event for {ticker} missing signal field, skipping")
            return

        if confidence is None:
            logger.warning(f"Signal event for {ticker} missing confidence field, defaulting to 0")
            confidence = 0.0

        # Validate signal value
        if signal not in VALID_SIGNALS:
            logger.warning(
                f"Invalid signal value '{signal}' for {ticker}, skipping. "
                f"Valid values: {VALID_SIGNALS}"
            )
            return

        logger.info(
            f"Processing signal change for {ticker}: "
            f"signal={signal}, confidence={confidence}, model={model}"
        )

        # Find all portfolios containing this ticker
        affected_portfolios = await _get_portfolios_with_ticker(ticker)

        if not affected_portfolios:
            logger.info(f"No active portfolios contain {ticker}, no updates needed")
            return

        logger.info(
            f"Found {len(affected_portfolios)} portfolio(s) with {ticker}, "
            f"updating holdings..."
        )

        # Track unique portfolios for totals update
        portfolios_to_update = set()

        # Update each affected holding
        for portfolio_info in affected_portfolios:
            portfolio_id = portfolio_info['portfolio_id']
            user_id = portfolio_info['user_id']
            holding_id = portfolio_info['holding_id']

            # Get previous signal
            previous_signal_data = await _get_previous_signal(holding_id)
            old_signal = previous_signal_data.get('current_signal') if previous_signal_data else None

            # Update holding signal
            success = await _update_holding_signal(holding_id, signal, confidence, model)

            if not success:
                logger.warning(f"Failed to update holding {holding_id}, skipping")
                continue

            # Track portfolio for totals update
            portfolios_to_update.add(portfolio_id)

            # Check if signal change is significant
            is_significant = _is_significant_signal_change(old_signal, signal)

            if is_significant:
                logger.info(
                    f"Significant signal change detected for {ticker} in portfolio {portfolio_id}: "
                    f"{old_signal} → {signal}"
                )

                # Trigger rebalancing recalculation
                await _trigger_rebalancing_recalculation(portfolio_id)

                # Create notification for user
                await _create_notification_event(
                    user_id=user_id,
                    ticker=ticker,
                    old_signal=old_signal,
                    new_signal=signal,
                    confidence=confidence,
                    model=model
                )

        # Update portfolio totals for all affected portfolios
        for portfolio_id in portfolios_to_update:
            await _update_portfolio_totals(portfolio_id)

        logger.info(
            f"Completed signal update for {ticker}: "
            f"updated {len(affected_portfolios)} holding(s) across "
            f"{len(portfolios_to_update)} portfolio(s)"
        )

    except Exception as e:
        logger.error(f"Error handling signal generated event: {e}", exc_info=True)
