"""
app/features/portfolio/services/rebalancing_service.py
Rebalancing service for portfolio management.

This service generates AI-driven rebalancing suggestions based on:
- Current ML signals and confidence scores
- Position sizing rules (max 10%, min 2%)
- Portfolio concentration limits
- Risk-adjusted target weights
"""

from typing import List, Dict, Any, Optional
from datetime import datetime

from app.core.service import BaseService
from app.core.events.event_bus import EventType
from app.core import logger


class RebalancingService(BaseService):
    """
    Service for generating portfolio rebalancing suggestions.

    This service analyzes portfolio holdings and ML signals to generate
    actionable rebalancing suggestions with prioritization.
    """

    # Constants for position sizing rules
    MAX_POSITION_SIZE = 10.0  # Maximum 10% per holding
    MIN_POSITION_SIZE = 2.0   # Minimum 2% per holding
    OVERWEIGHT_THRESHOLD = 15.0  # Flag positions > 15%
    REBALANCE_THRESHOLD = 0.5  # 0.5% threshold for action

    def __init__(self, repository=None):
        """Initialize service with optional repository."""
        super().__init__()
        self.repo = repository
        logger.debug("RebalancingService initialized")

    async def generate_rebalancing_suggestions(
        self,
        portfolio_id: int,
        holdings: Optional[List[Dict[str, Any]]] = None,
        regenerate: bool = False
    ) -> Dict[str, Any]:
        """
        Generate rebalancing suggestions for a portfolio.

        Args:
            portfolio_id: Portfolio ID
            holdings: List of current holdings with signals (fetched from repo if not provided)
            regenerate: Force regeneration even if cached

        Returns:
            Dictionary with status, suggestions list, and metadata
        """
        try:
            # Fetch holdings from repository if not provided or if empty
            # Empty list might mean "fetch from DB" vs None means "I know there are none"
            if (holdings is None or (isinstance(holdings, list) and len(holdings) == 0)) and self.repo:
                holdings = self.repo.get_holdings(portfolio_id)
            elif holdings is None:
                holdings = []

            # Get portfolio info for total_value if needed
            total_value_from_db = 0
            if self.repo:
                portfolio = self.repo.get_portfolio(portfolio_id)
                total_value_from_db = portfolio.get('total_value', 0) if portfolio else 0

            # Calculate total value from holdings
            total_value = sum(h.get('current_value', 0) for h in holdings) if holdings else 0

            # Use DB value if available and holdings value is 0
            if total_value <= 0 and total_value_from_db > 0:
                total_value = total_value_from_db

            # Check total value first (more specific than "no holdings")
            if total_value <= 0:
                return {
                    'status': 'ok',
                    'portfolio_id': portfolio_id,
                    'suggestions': [],
                    'message': 'Portfolio has no value'
                }

            # Handle empty holdings (but portfolio has value - shouldn't happen)
            if not holdings:
                return {
                    'status': 'ok',
                    'portfolio_id': portfolio_id,
                    'suggestions': [],
                    'message': 'No holdings found in portfolio'
                }

            # Clear old suggestions (always clear before generating)
            if self.repo:
                self.repo.clear_old_suggestions(portfolio_id=portfolio_id)

            # Calculate current weights
            current_weights = {
                h['ticker']: (h.get('current_value', 0) / total_value) * 100
                for h in holdings
            }

            # Calculate target weights based on signals
            target_weights = self._calculate_target_weights(holdings, total_value)

            # Generate actions
            suggestions = self._generate_actions(
                current_weights, target_weights, holdings, total_value
            )

            # Prioritize suggestions
            suggestions = self._prioritize_suggestions(suggestions)

            # Save suggestions to database if repository provided
            if self.repo and suggestions:
                self.repo.save_suggestions(
                    portfolio_id=portfolio_id,
                    suggestions=suggestions
                )

            # Publish event
            await self.publish_event(
                EventType.PORTFOLIO_CHANGED,
                {
                    'portfolio_id': portfolio_id,
                    'action': 'rebalancing_suggestions',
                    'suggestions_count': len(suggestions)
                }
            )

            logger.info(
                f"Generated {len(suggestions)} rebalancing suggestions "
                f"for portfolio {portfolio_id}"
            )

            return {
                'status': 'ok',
                'portfolio_id': portfolio_id,
                'suggestions': suggestions,
                'generated_at': datetime.now().isoformat(),
                'message': f'Generated {len(suggestions)} suggestions'
            }

        except Exception as e:
            logger.error(f"Error generating rebalancing suggestions: {e}")
            raise

    def _calculate_target_weights(
        self,
        holdings: List[Dict[str, Any]],
        total_value: float
    ) -> Dict[str, float]:
        """
        Calculate target weights based on signals and fundamentals.

        Args:
            holdings: List of holdings with signals
            total_value: Total portfolio value

        Returns:
            Dictionary mapping ticker to target weight percentage
        """
        target_weights = {}

        for holding in holdings:
            ticker = holding.get('ticker')
            signal = holding.get('current_signal')
            confidence = holding.get('signal_confidence', 0)
            current_value = holding.get('current_value', 0)
            current_weight = (current_value / total_value) * 100 if total_value > 0 else 0

            # Calculate target weight based on signal
            if signal == 'STRONG_SELL' and confidence >= 70:
                # Exit position completely
                target_weight = 0.0

            elif signal == 'SELL' and confidence >= 60:
                # Reduce position by 50%
                target_weight = current_weight * 0.5

            elif signal == 'STRONG_BUY' and confidence >= 80:
                # Increase position by 20%
                target_weight = min(current_weight * 1.2, self.MAX_POSITION_SIZE)

            elif signal == 'BUY' and confidence >= 70:
                # Increase position by 10%
                target_weight = min(current_weight * 1.1, self.MAX_POSITION_SIZE)

            elif signal == 'HOLD' or not signal:
                # Maintain current weight
                target_weight = current_weight

            else:
                # Default: maintain current weight
                target_weight = current_weight

            # Apply position sizing constraints
            if target_weight > self.MAX_POSITION_SIZE:
                target_weight = self.MAX_POSITION_SIZE

            # For positions we're keeping, enforce minimum size
            if target_weight > 0 and target_weight < self.MIN_POSITION_SIZE:
                # Either increase to minimum or exit completely
                if signal in ['BUY', 'STRONG_BUY']:
                    target_weight = self.MIN_POSITION_SIZE
                else:
                    target_weight = current_weight  # Keep as is

            target_weights[ticker] = target_weight

        return target_weights

    def _generate_actions(
        self,
        current_weights: Dict[str, float],
        target_weights: Dict[str, float],
        holdings: List[Dict[str, Any]],
        total_value: float,
        threshold: float = 0.5
    ) -> List[Dict[str, Any]]:
        """
        Generate buy/sell/hold/trim/add actions.

        Args:
            current_weights: Current weight percentages
            target_weights: Target weight percentages
            holdings: Holdings data
            total_value: Total portfolio value
            threshold: Minimum weight change to trigger action

        Returns:
            List of action dictionaries
        """
        actions = []

        # Create holdings lookup
        holdings_map = {h.get('ticker'): h for h in holdings}

        for ticker, target_weight in target_weights.items():
            current_weight = current_weights.get(ticker, 0)
            weight_diff = abs(target_weight - current_weight)

            # Skip if difference is below threshold
            if weight_diff < threshold and target_weight > 0:
                continue

            holding = holdings_map.get(ticker, {})
            signal = holding.get('current_signal')
            confidence = holding.get('signal_confidence', 50.0)
            current_price = holding.get('current_price', 0)
            current_shares = holding.get('shares', 0)

            # Determine action type
            if target_weight == 0:
                action = 'SELL'
                suggested_qty = float(current_shares)
                suggested_value = suggested_qty * current_price if current_price else 0
                reason = f"{signal} signal (confidence: {confidence:.1f}%). Exit position."
                conf_score = float(confidence)

            elif target_weight < current_weight - threshold:
                action = 'TRIM'
                # Calculate shares to sell
                target_value = (target_weight / 100) * total_value
                current_value = (current_weight / 100) * total_value
                value_to_sell = current_value - target_value
                suggested_qty = value_to_sell / current_price if current_price else 0
                suggested_value = value_to_sell
                reason = f"{signal or 'Rebalance'} - reduce from {current_weight:.1f}% to {target_weight:.1f}%"
                conf_score = float(confidence) * 0.8

            elif target_weight > current_weight + threshold:
                action = 'ADD'
                # Calculate shares to buy
                target_value = (target_weight / 100) * total_value
                current_value = (current_weight / 100) * total_value
                value_to_add = target_value - current_value
                suggested_qty = value_to_add / current_price if current_price else 0
                suggested_value = value_to_add
                reason = f"{signal or 'Rebalance'} - increase from {current_weight:.1f}% to {target_weight:.1f}%"
                conf_score = float(confidence) * 0.9

            else:
                # HOLD - no action needed
                continue

            actions.append({
                'ticker': ticker,
                'action': action,
                'suggested_quantity': float(suggested_qty) if suggested_qty else None,
                'suggested_value': float(suggested_value) if suggested_value else None,
                'reason': reason,
                'current_signal': signal,
                'signal_confidence': float(confidence) if confidence else None,
                'current_shares': float(current_shares) if current_shares else None,
                'current_weight_pct': float(current_weight),
                'target_weight_pct': float(target_weight),
                'confidence_score': conf_score,
                'priority': 1  # Will be updated by _prioritize_suggestions
            })

        # Check for overweight positions (>15% threshold)
        for ticker, current_weight in current_weights.items():
            if current_weight > self.OVERWEIGHT_THRESHOLD:
                # Check if we already have an action for this ticker
                existing_action = next((a for a in actions if a['ticker'] == ticker), None)

                if not existing_action:
                    holding = holdings_map.get(ticker, {})
                    current_price = holding.get('current_price', 0)
                    current_shares = holding.get('shares', 0)

                    # Suggest bringing down to 12%
                    target_weight = 12.0
                    target_value = (target_weight / 100) * total_value
                    current_value = (current_weight / 100) * total_value
                    value_to_sell = current_value - target_value
                    suggested_qty = value_to_sell / current_price if current_price else 0

                    actions.append({
                        'ticker': ticker,
                        'action': 'TRIM',
                        'suggested_quantity': float(suggested_qty),
                        'suggested_value': float(value_to_sell),
                        'reason': f"Position is {current_weight:.1f}% of portfolio (overweight). Reduce concentration risk.",
                        'current_signal': holding.get('current_signal'),
                        'signal_confidence': holding.get('signal_confidence'),
                        'current_shares': float(current_shares) if current_shares else None,
                        'current_weight_pct': float(current_weight),
                        'target_weight_pct': target_weight,
                        'confidence_score': 70.0,
                        'priority': 1
                    })
                elif existing_action and 'concentration' not in existing_action['reason'].lower():
                    # Update existing action reason to include overweight warning
                    existing_action['reason'] = f"{existing_action['reason']} Position overweight ({current_weight:.1f}%)."

        return actions

    def _prioritize_suggestions(
        self,
        suggestions: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Prioritize suggestions by impact and confidence.

        Args:
            suggestions: List of suggestion dictionaries

        Returns:
            Sorted list with priority numbers assigned
        """
        if not suggestions:
            return []

        # Define action priority weights
        action_weights = {
            'SELL': 3,    # Highest priority (exit bad positions)
            'TRIM': 2,    # Medium-high priority (reduce risk)
            'ADD': 1,     # Medium priority (capture opportunities)
            'BUY': 1,     # Medium priority (new positions)
            'HOLD': 0     # Lowest priority
        }

        # Calculate composite score for sorting
        for suggestion in suggestions:
            action_weight = action_weights.get(suggestion['action'], 0)
            confidence = suggestion.get('confidence_score', 50.0)
            value_impact = suggestion.get('suggested_value', 0)

            # Composite score: action priority + confidence + value impact (normalized)
            suggestion['_sort_score'] = (
                action_weight * 100 +
                confidence +
                min(value_impact / 1000, 50)  # Normalize value impact
            )

        # Sort by composite score (descending)
        sorted_suggestions = sorted(
            suggestions,
            key=lambda x: x['_sort_score'],
            reverse=True
        )

        # Assign priority numbers
        for i, suggestion in enumerate(sorted_suggestions, start=1):
            suggestion['priority'] = i
            # Remove internal sort score
            suggestion.pop('_sort_score', None)

        return sorted_suggestions
