"""
app/features/portfolio/services/risk_service.py
Risk metrics calculation service for portfolio management.

This service calculates comprehensive risk metrics including:
- Sharpe ratio (risk-adjusted returns)
- Annualized volatility
- Beta (market correlation)
- Maximum drawdown
- Correlation matrix
- Concentration metrics
"""

from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd
from datetime import datetime, date

from app.core.service import BaseService
from app.core.events.event_bus import EventType
from app.core import logger


class RiskMetricsService(BaseService):
    """
    Service for calculating portfolio risk metrics.

    This service provides comprehensive risk analysis including
    volatility, Sharpe ratio, beta, drawdown, and diversification metrics.
    """

    # Constants
    TRADING_DAYS_PER_YEAR = 252
    DEFAULT_RISK_FREE_RATE = 2.0  # 2% annual risk-free rate
    DEFAULT_BENCHMARK = 'XJO.AX'  # ASX 200 index

    def __init__(self, repository=None):
        """Initialize service with optional repository."""
        super().__init__()
        self.repo = repository
        logger.debug("RiskMetricsService initialized")

    async def calculate_risk_metrics(
        self,
        portfolio_id: int,
        recalculate: bool = False
    ) -> Dict[str, Any]:
        """
        Calculate comprehensive risk metrics for a portfolio.

        Args:
            portfolio_id: Portfolio ID
            recalculate: Force recalculation even if cached

        Returns:
            Dictionary with risk metrics
        """
        try:
            # Check for cached metrics if not forcing recalculation
            if not recalculate and self.repo:
                cached = self.repo.get_cached_metrics(
                    portfolio_id=portfolio_id,
                    as_of=date.today()
                )
                if cached:
                    logger.info(f"Using cached risk metrics for portfolio {portfolio_id}")
                    return cached

            # Get holdings
            if not self.repo:
                raise Exception("Repository required to fetch holdings")

            holdings = self.repo.get_holdings(portfolio_id=portfolio_id)

            if not holdings:
                raise Exception("No holdings with current prices found. Cannot calculate metrics.")

            # Calculate total value and weights
            total_value = sum(h.get('current_value', 0) for h in holdings)

            if total_value <= 0:
                raise Exception("Portfolio has no value")

            # Fetch historical prices for advanced calculations
            # (Currently using simplified metrics based on unrealized P&L)
            if recalculate and holdings:
                # Attempt to fetch historical data for first holding
                # In a full implementation, this would be used for time-series analysis
                try:
                    first_ticker = holdings[0].get('ticker')
                    if first_ticker:
                        _ = self.repo.get_historical_prices(first_ticker)
                except Exception as e:
                    logger.debug(f"Could not fetch historical prices: {e}")

            # Calculate concentration metrics
            weights = [(h.get('current_value', 0) / total_value) * 100 for h in holdings]
            weights.sort(reverse=True)

            top_holding_weight = weights[0] if weights else 0
            top_5_weight = sum(weights[:5]) if len(weights) >= 5 else sum(weights)

            # Herfindahl index (concentration measure)
            herfindahl = sum([(w/100)**2 for w in weights]) if weights else 0

            # Signal distribution
            signal_dist = {}
            for h in holdings:
                signal = h.get('current_signal') or 'UNKNOWN'
                signal_dist[signal] = signal_dist.get(signal, 0) + 1

            # Calculate return metrics from unrealized P&L
            returns_pct = [
                float(h['unrealized_pl_pct'])
                for h in holdings
                if h.get('unrealized_pl_pct') is not None
            ]

            if returns_pct:
                total_return = float(np.mean(returns_pct))
                volatility = self._calculate_volatility(np.array(returns_pct))
                sharpe = self._calculate_sharpe_ratio(
                    np.array(returns_pct),
                    risk_free_rate=self.DEFAULT_RISK_FREE_RATE,
                    volatility=volatility
                )

                # Simple max drawdown from current returns
                max_drawdown = float(min(returns_pct)) if returns_pct else 0
            else:
                total_return = None
                volatility = None
                sharpe = None
                max_drawdown = None

            # Beta calculation (simplified - would need historical data)
            # For now, use a placeholder value
            beta = 1.0

            # Build metrics dictionary
            metrics = {
                'as_of': date.today().isoformat(),
                'total_return_pct': total_return,
                'volatility': volatility,
                'sharpe_ratio': sharpe,
                'beta': beta,
                'max_drawdown_pct': max_drawdown,
                'top_holding_weight_pct': top_holding_weight,
                'signal_distribution': signal_dist
            }

            # Save to database
            if self.repo:
                self.repo.save_risk_metrics(
                    portfolio_id=portfolio_id,
                    metrics=metrics
                )

            # Publish event
            await self.publish_event(
                EventType.PORTFOLIO_CHANGED,
                {
                    'portfolio_id': portfolio_id,
                    'action': 'risk_metrics_calculated',
                    'volatility': volatility,
                    'sharpe_ratio': sharpe
                }
            )

            logger.info(f"Calculated risk metrics for portfolio {portfolio_id}")

            return metrics

        except Exception as e:
            logger.error(f"Error calculating risk metrics: {e}")
            raise

    def _calculate_sharpe_ratio(
        self,
        returns: np.ndarray,
        risk_free_rate: float = 2.0,
        volatility: Optional[float] = None
    ) -> Optional[float]:
        """
        Calculate Sharpe ratio (risk-adjusted returns).

        Args:
            returns: Array of daily returns (as decimals, e.g., 0.0004 for 0.04%)
            risk_free_rate: Annual risk-free rate as percentage (default 2.0%)
            volatility: Pre-calculated annualized volatility as percentage (optional)

        Returns:
            Sharpe ratio or None if cannot calculate
        """
        if len(returns) == 0:
            return None

        # Calculate annualized return from daily returns
        # Mean daily return * trading days per year * 100 to convert to percentage
        avg_daily_return = float(np.mean(returns))
        annualized_return = avg_daily_return * self.TRADING_DAYS_PER_YEAR * 100

        # Calculate volatility if not provided
        if volatility is None:
            volatility = self._calculate_volatility(returns)

        if volatility is None or volatility == 0:
            return None

        # Sharpe ratio = (Annualized Return % - Risk-free rate %) / Annualized Volatility %
        sharpe = (annualized_return - risk_free_rate) / volatility

        return float(sharpe)

    def _calculate_volatility(
        self,
        returns: np.ndarray
    ) -> Optional[float]:
        """
        Calculate annualized volatility.

        Args:
            returns: Array of daily returns (as decimals, e.g., 0.01 for 1%)

        Returns:
            Annualized volatility as percentage or None
        """
        if len(returns) <= 1:
            return None if len(returns) == 0 else 0.0

        # Calculate standard deviation
        std_dev = float(np.std(returns))

        # Annualize: std * sqrt(252 trading days) * 100 to convert to percentage
        annualized_volatility = std_dev * np.sqrt(self.TRADING_DAYS_PER_YEAR) * 100

        return float(annualized_volatility)

    def _calculate_beta(
        self,
        portfolio_returns: np.ndarray,
        benchmark_returns: np.ndarray
    ) -> Optional[float]:
        """
        Calculate beta (market correlation).

        Args:
            portfolio_returns: Array of portfolio returns
            benchmark_returns: Array of benchmark returns

        Returns:
            Beta coefficient or None
        """
        if len(portfolio_returns) == 0 or len(benchmark_returns) == 0:
            return None

        if len(portfolio_returns) != len(benchmark_returns):
            logger.warning("Portfolio and benchmark returns have different lengths")
            return None

        # Calculate variance of benchmark
        benchmark_variance = np.var(benchmark_returns)

        # Check for zero or near-zero variance (constant benchmark)
        if benchmark_variance < 1e-10:
            return None

        # Calculate covariance
        covariance = np.cov(portfolio_returns, benchmark_returns)[0][1]

        # Beta = Cov(portfolio, benchmark) / Var(benchmark)
        beta = covariance / benchmark_variance

        return float(beta)

    def _calculate_max_drawdown(
        self,
        cumulative_returns: np.ndarray
    ) -> Optional[float]:
        """
        Calculate maximum drawdown.

        Args:
            cumulative_returns: Array of cumulative return values

        Returns:
            Maximum drawdown percentage (negative value) or None
        """
        if len(cumulative_returns) <= 1:
            return 0.0

        # Calculate running maximum
        running_max = np.maximum.accumulate(cumulative_returns)

        # Calculate drawdown at each point
        drawdowns = (cumulative_returns - running_max) / running_max * 100

        # Return the maximum drawdown (most negative)
        max_dd = float(np.min(drawdowns))

        return max_dd

    def _calculate_correlation_matrix(
        self,
        holdings: List[Dict[str, Any]],
        repository: Any
    ) -> Optional[Any]:
        """
        Calculate correlation matrix for diversification analysis.

        Args:
            holdings: List of holdings
            repository: Repository for fetching historical prices

        Returns:
            Correlation matrix (dict, DataFrame, or ndarray)
        """
        if not holdings or len(holdings) < 2:
            # Single holding or no holdings - no correlation to calculate
            return {} if len(holdings) <= 1 else None

        try:
            # Fetch historical prices for each holding
            price_data = {}

            for holding in holdings:
                ticker = holding.get('ticker')
                if not ticker:
                    continue

                prices = repository.get_historical_prices(ticker)

                if prices is not None and not prices.empty:
                    price_data[ticker] = prices

            if len(price_data) < 2:
                return {}

            # Calculate returns for each stock
            returns_dict = {}
            for ticker, prices_df in price_data.items():
                if 'close' in prices_df.columns:
                    returns = prices_df['close'].pct_change().dropna()
                    returns_dict[ticker] = returns

            if len(returns_dict) < 2:
                return {}

            # Create DataFrame with aligned returns
            returns_df = pd.DataFrame(returns_dict)

            # Calculate correlation matrix
            corr_matrix = returns_df.corr()

            # Convert to dictionary for JSON serialization
            corr_dict = corr_matrix.to_dict()

            return corr_dict

        except Exception as e:
            logger.error(f"Error calculating correlation matrix: {e}")
            return {}
