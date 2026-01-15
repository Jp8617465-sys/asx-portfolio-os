"""
analytics/rl_environment.py
Reinforcement Learning Environment for ASX Portfolio Optimization.

Custom OpenAI Gym environment for training RL agents on ASX equities.
Supports PPO, A2C, SAC algorithms via Stable-Baselines3.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
import gymnasium as gym
from gymnasium import spaces


class ASXPortfolioEnv(gym.Env):
    """
    Custom Environment for ASX Portfolio Optimization.
    
    Observation Space:
        - Portfolio weights (n_assets)
        - Asset returns (n_assets x lookback_window)
        - Technical indicators (n_assets x n_indicators)
        - Macro features (n_macro)
        
    Action Space:
        - Continuous: Portfolio weights [0, 1] for each asset (sum to 1)
        - Discrete: Buy/Hold/Sell for each asset
        
    Reward:
        - Risk-adjusted returns (Sharpe ratio)
        - Penalize high turnover and drawdowns
    """
    
    metadata = {'render.modes': ['human']}
    
    def __init__(
        self,
        data: pd.DataFrame,
        tickers: List[str],
        initial_cash: float = 100000,
        transaction_cost: float = 0.001,
        lookback_window: int = 20,
        mode: str = 'train'
    ):
        """
        Initialize RL environment.
        
        Args:
            data: DataFrame with columns [date, ticker, close, volume, features...]
            tickers: List of ticker symbols
            initial_cash: Starting cash amount
            transaction_cost: Trading cost as fraction of trade value
            lookback_window: Number of historical periods to include in observation
            mode: 'train' or 'test'
        """
        super(ASXPortfolioEnv, self).__init__()
        
        self.data = data
        self.tickers = tickers
        self.n_assets = len(tickers)
        self.initial_cash = initial_cash
        self.transaction_cost = transaction_cost
        self.lookback_window = lookback_window
        self.mode = mode
        
        # Prepare data
        self.dates = sorted(data['date'].unique())
        self.current_step = lookback_window
        self.max_steps = len(self.dates) - 1
        
        # State variables
        self.cash = initial_cash
        self.positions = np.zeros(self.n_assets)
        self.portfolio_value = initial_cash
        self.trade_history = []
        
        # Performance tracking
        self.portfolio_values = [initial_cash]
        self.returns = []
        
        # Define action space: continuous weights for each asset
        self.action_space = spaces.Box(
            low=0.0,
            high=1.0,
            shape=(self.n_assets,),
            dtype=np.float32
        )
        
        # Define observation space
        # Features per asset: price, return, volume, technical indicators
        n_features_per_asset = 10  # Adjust based on actual features
        obs_dim = (
            self.n_assets +  # Current weights
            self.n_assets * self.lookback_window +  # Historical returns
            self.n_assets * n_features_per_asset +  # Technical features
            5  # Macro features
        )
        
        self.observation_space = spaces.Box(
            low=-np.inf,
            high=np.inf,
            shape=(obs_dim,),
            dtype=np.float32
        )
    
    def reset(self, seed=None, options=None):
        """Reset environment to initial state."""
        super().reset(seed=seed)
        
        self.current_step = self.lookback_window
        self.cash = self.initial_cash
        self.positions = np.zeros(self.n_assets)
        self.portfolio_value = self.initial_cash
        self.trade_history = []
        self.portfolio_values = [self.initial_cash]
        self.returns = []
        
        return self._get_observation(), {}
    
    def step(self, action: np.ndarray) -> Tuple[np.ndarray, float, bool, bool, Dict]:
        """
        Execute one step in the environment.
        
        Args:
            action: Portfolio weights for each asset (normalized to sum to 1)
            
        Returns:
            observation, reward, terminated, truncated, info
        """
        # Normalize action to sum to 1 (portfolio weights)
        action = np.clip(action, 0, 1)
        action = action / (action.sum() + 1e-8)
        
        # Get current prices
        current_date = self.dates[self.current_step]
        prices = self._get_prices(current_date)
        
        # Calculate target positions in dollars
        target_portfolio_value = self.cash + np.sum(self.positions * prices)
        target_positions_value = action * target_portfolio_value
        target_positions = target_positions_value / (prices + 1e-8)
        
        # Execute trades (rebalance portfolio)
        trade_value = np.sum(np.abs(target_positions - self.positions) * prices)
        transaction_costs = trade_value * self.transaction_cost
        
        # Update positions and cash
        self.positions = target_positions
        self.cash = target_portfolio_value - np.sum(self.positions * prices) - transaction_costs
        
        # Move to next step
        self.current_step += 1
        
        # Calculate new portfolio value
        if self.current_step < self.max_steps:
            next_date = self.dates[self.current_step]
            next_prices = self._get_prices(next_date)
            new_portfolio_value = self.cash + np.sum(self.positions * next_prices)
        else:
            new_portfolio_value = self.cash + np.sum(self.positions * prices)
        
        # Calculate reward
        reward = self._calculate_reward(new_portfolio_value)
        
        # Update tracking
        self.portfolio_value = new_portfolio_value
        self.portfolio_values.append(new_portfolio_value)
        
        # Check if episode is done
        terminated = self.current_step >= self.max_steps
        truncated = False
        
        # Get new observation
        observation = self._get_observation()
        
        info = {
            'portfolio_value': new_portfolio_value,
            'cash': self.cash,
            'positions': self.positions.copy(),
            'transaction_costs': transaction_costs
        }
        
        return observation, reward, terminated, truncated, info
    
    def _get_observation(self) -> np.ndarray:
        """Construct observation vector."""
        current_date = self.dates[self.current_step]
        
        # Current portfolio weights
        current_prices = self._get_prices(current_date)
        position_values = self.positions * current_prices
        total_value = position_values.sum() + self.cash
        weights = position_values / (total_value + 1e-8)
        
        # Historical returns (lookback window)
        historical_returns = self._get_historical_returns(self.current_step)
        
        # Technical features (simplified - expand in production)
        technical_features = np.random.randn(self.n_assets * 10)  # Placeholder
        
        # Macro features (simplified)
        macro_features = np.random.randn(5)  # Placeholder
        
        # Concatenate all features
        observation = np.concatenate([
            weights,
            historical_returns.flatten(),
            technical_features,
            macro_features
        ])
        
        return observation.astype(np.float32)
    
    def _get_prices(self, date) -> np.ndarray:
        """Get asset prices for a given date."""
        prices = []
        for ticker in self.tickers:
            ticker_data = self.data[(self.data['ticker'] == ticker) & (self.data['date'] == date)]
            if len(ticker_data) > 0:
                prices.append(ticker_data['close'].values[0])
            else:
                prices.append(0.0)
        return np.array(prices)
    
    def _get_historical_returns(self, step: int) -> np.ndarray:
        """Get historical returns for lookback window."""
        returns = np.zeros((self.n_assets, self.lookback_window))
        
        for i, ticker in enumerate(self.tickers):
            for j in range(self.lookback_window):
                if step - j - 1 >= 0 and step - j < len(self.dates):
                    date_t = self.dates[step - j - 1]
                    date_t1 = self.dates[step - j]
                    
                    price_t = self._get_prices(date_t)[i]
                    price_t1 = self._get_prices(date_t1)[i]
                    
                    if price_t > 0:
                        returns[i, j] = (price_t1 - price_t) / price_t
        
        return returns
    
    def _calculate_reward(self, new_portfolio_value: float) -> float:
        """
        Calculate reward based on portfolio performance.
        
        Reward components:
        1. Return: (new_value - old_value) / old_value
        2. Sharpe penalty: Penalize high volatility
        3. Drawdown penalty: Penalize large drawdowns
        """
        # Simple return
        portfolio_return = (new_portfolio_value - self.portfolio_value) / self.portfolio_value
        
        # Volatility penalty (calculated over recent returns)
        if len(self.portfolio_values) > 10:
            recent_returns = np.diff(self.portfolio_values[-10:]) / self.portfolio_values[-11:-1]
            volatility = np.std(recent_returns)
            sharpe_component = portfolio_return / (volatility + 1e-8)
        else:
            sharpe_component = portfolio_return
        
        # Drawdown penalty
        if len(self.portfolio_values) > 1:
            peak = np.max(self.portfolio_values)
            drawdown = (peak - new_portfolio_value) / peak
            drawdown_penalty = -drawdown * 0.5
        else:
            drawdown_penalty = 0
        
        # Combined reward
        reward = sharpe_component + drawdown_penalty
        
        return reward
    
    def render(self, mode='human'):
        """Render environment state."""
        if mode == 'human':
            print(f"Step: {self.current_step}/{self.max_steps}")
            print(f"Portfolio Value: ${self.portfolio_value:,.2f}")
            print(f"Cash: ${self.cash:,.2f}")
            print(f"Positions: {self.positions}")
            print(f"Return: {(self.portfolio_value / self.initial_cash - 1) * 100:.2f}%")
