/**
 * Portfolio Store Tests
 */

import { usePortfolioStore } from '../portfolio-store';
import type { Portfolio, PortfolioHolding, RebalancingSuggestion } from '@/contracts';

// Reset store state before each test
beforeEach(() => {
  usePortfolioStore.setState({ portfolio: null, holdings: [], suggestions: [] });
});

describe('usePortfolioStore', () => {
  describe('Initial State', () => {
    it('should have null portfolio', () => {
      const { portfolio } = usePortfolioStore.getState();
      expect(portfolio).toBeNull();
    });

    it('should have empty holdings array', () => {
      const { holdings } = usePortfolioStore.getState();
      expect(holdings).toEqual([]);
    });

    it('should have empty suggestions array', () => {
      const { suggestions } = usePortfolioStore.getState();
      expect(suggestions).toEqual([]);
    });
  });

  describe('setPortfolio', () => {
    it('should set portfolio and extract holdings', () => {
      const mockPortfolio: Portfolio = {
        totalValue: 100000,
        holdings: [
          {
            ticker: 'CBA',
            companyName: 'Commonwealth Bank',
            shares: 100,
            avgCost: 95.5,
            currentPrice: 100,
            totalValue: 10000,
            signal: 'BUY',
            confidence: 75,
          },
          {
            ticker: 'BHP',
            companyName: 'BHP Group',
            shares: 200,
            avgCost: 42.0,
            currentPrice: 45.0,
            totalValue: 9000,
            signal: 'HOLD',
            confidence: 60,
          },
        ],
      };

      usePortfolioStore.getState().setPortfolio(mockPortfolio);

      const { portfolio, holdings } = usePortfolioStore.getState();
      expect(portfolio).toEqual(mockPortfolio);
      expect(holdings).toEqual(mockPortfolio.holdings);
      expect(holdings).toHaveLength(2);
    });

    it('should update existing portfolio with new data', () => {
      const firstPortfolio: Portfolio = {
        totalValue: 50000,
        holdings: [
          {
            ticker: 'ANZ',
            companyName: 'ANZ Bank',
            shares: 50,
            avgCost: 25.0,
            currentPrice: 26.0,
            totalValue: 1300,
            signal: 'HOLD',
            confidence: 50,
          },
        ],
      };

      const secondPortfolio: Portfolio = {
        totalValue: 100000,
        holdings: [
          {
            ticker: 'CBA',
            companyName: 'Commonwealth Bank',
            shares: 100,
            avgCost: 95.5,
            currentPrice: 100,
            totalValue: 10000,
            signal: 'BUY',
            confidence: 75,
          },
        ],
      };

      usePortfolioStore.getState().setPortfolio(firstPortfolio);
      usePortfolioStore.getState().setPortfolio(secondPortfolio);

      const { portfolio, holdings } = usePortfolioStore.getState();
      expect(portfolio).toEqual(secondPortfolio);
      expect(holdings).toEqual(secondPortfolio.holdings);
      expect(holdings).toHaveLength(1);
      expect(holdings[0].ticker).toBe('CBA');
    });

    it('should handle portfolio with empty holdings', () => {
      const emptyPortfolio: Portfolio = {
        totalValue: 0,
        holdings: [],
      };

      usePortfolioStore.getState().setPortfolio(emptyPortfolio);

      const { portfolio, holdings } = usePortfolioStore.getState();
      expect(portfolio).toEqual(emptyPortfolio);
      expect(holdings).toEqual([]);
    });

    it('should handle portfolio with risk metrics', () => {
      const portfolioWithRisk: Portfolio = {
        totalValue: 100000,
        holdings: [
          {
            ticker: 'CBA',
            companyName: 'Commonwealth Bank',
            shares: 100,
            avgCost: 95.5,
            currentPrice: 100,
            totalValue: 10000,
            signal: 'BUY',
            confidence: 75,
          },
        ],
        riskMetrics: {
          sharpeRatio: 1.5,
          sortinoRatio: 2.0,
          maxDrawdown: -15.5,
          beta: 0.95,
          volatility: 18.5,
        },
      };

      usePortfolioStore.getState().setPortfolio(portfolioWithRisk);

      const { portfolio } = usePortfolioStore.getState();
      expect(portfolio?.riskMetrics).toBeDefined();
      expect(portfolio?.riskMetrics?.sharpeRatio).toBe(1.5);
    });
  });

  describe('updateHolding', () => {
    beforeEach(() => {
      const mockPortfolio: Portfolio = {
        totalValue: 100000,
        holdings: [
          {
            ticker: 'CBA',
            companyName: 'Commonwealth Bank',
            shares: 100,
            avgCost: 95.5,
            currentPrice: 100,
            totalValue: 10000,
            signal: 'BUY',
            confidence: 75,
          },
          {
            ticker: 'BHP',
            companyName: 'BHP Group',
            shares: 200,
            avgCost: 42.0,
            currentPrice: 45.0,
            totalValue: 9000,
            signal: 'HOLD',
            confidence: 60,
          },
        ],
      };
      usePortfolioStore.getState().setPortfolio(mockPortfolio);
    });

    it('should update a specific holding by ticker', () => {
      usePortfolioStore.getState().updateHolding('CBA', { currentPrice: 105, totalValue: 10500 });

      const { holdings } = usePortfolioStore.getState();
      const cbaHolding = holdings.find((h) => h.ticker === 'CBA');

      expect(cbaHolding?.currentPrice).toBe(105);
      expect(cbaHolding?.totalValue).toBe(10500);
    });

    it('should not affect other holdings', () => {
      usePortfolioStore.getState().updateHolding('CBA', { currentPrice: 105 });

      const { holdings } = usePortfolioStore.getState();
      const bhpHolding = holdings.find((h) => h.ticker === 'BHP');

      expect(bhpHolding?.currentPrice).toBe(45.0);
      expect(bhpHolding?.totalValue).toBe(9000);
    });

    it('should update signal and confidence', () => {
      usePortfolioStore.getState().updateHolding('BHP', { signal: 'STRONG_BUY', confidence: 90 });

      const { holdings } = usePortfolioStore.getState();
      const bhpHolding = holdings.find((h) => h.ticker === 'BHP');

      expect(bhpHolding?.signal).toBe('STRONG_BUY');
      expect(bhpHolding?.confidence).toBe(90);
    });

    it('should update expectedReturn if provided', () => {
      usePortfolioStore.getState().updateHolding('CBA', { expectedReturn: 12.5 });

      const { holdings } = usePortfolioStore.getState();
      const cbaHolding = holdings.find((h) => h.ticker === 'CBA');

      expect(cbaHolding?.expectedReturn).toBe(12.5);
    });

    it('should handle partial updates', () => {
      const originalCBA = usePortfolioStore.getState().holdings.find((h) => h.ticker === 'CBA')!;

      usePortfolioStore.getState().updateHolding('CBA', { currentPrice: 102 });

      const { holdings } = usePortfolioStore.getState();
      const updatedCBA = holdings.find((h) => h.ticker === 'CBA')!;

      expect(updatedCBA.currentPrice).toBe(102);
      expect(updatedCBA.shares).toBe(originalCBA.shares);
      expect(updatedCBA.avgCost).toBe(originalCBA.avgCost);
      expect(updatedCBA.companyName).toBe(originalCBA.companyName);
    });

    it('should do nothing if ticker does not exist', () => {
      const beforeHoldings = usePortfolioStore.getState().holdings;

      usePortfolioStore.getState().updateHolding('INVALID', { currentPrice: 999 });

      const afterHoldings = usePortfolioStore.getState().holdings;

      expect(afterHoldings).toEqual(beforeHoldings);
      expect(afterHoldings.find((h) => h.ticker === 'INVALID')).toBeUndefined();
    });

    it('should handle multiple updates to the same holding', () => {
      usePortfolioStore.getState().updateHolding('CBA', { currentPrice: 102 });
      usePortfolioStore.getState().updateHolding('CBA', { totalValue: 10200 });
      usePortfolioStore.getState().updateHolding('CBA', { signal: 'STRONG_BUY' });

      const { holdings } = usePortfolioStore.getState();
      const cbaHolding = holdings.find((h) => h.ticker === 'CBA');

      expect(cbaHolding?.currentPrice).toBe(102);
      expect(cbaHolding?.totalValue).toBe(10200);
      expect(cbaHolding?.signal).toBe('STRONG_BUY');
    });
  });

  describe('setSuggestions', () => {
    it('should set rebalancing suggestions', () => {
      const mockSuggestions: RebalancingSuggestion[] = [
        {
          id: 'sug-1',
          action: 'SELL',
          ticker: 'BHP',
          companyName: 'BHP Group',
          quantity: 50,
          currentSignal: 'SELL',
          currentConfidence: 80,
          reason: 'Overweight position, sell to rebalance',
          impact: {
            expectedReturn: 8.5,
            volatilityChange: -2.1,
            newAllocation: 15.0,
          },
          priority: 'high',
        },
        {
          id: 'sug-2',
          action: 'BUY',
          ticker: 'CSL',
          companyName: 'CSL Limited',
          quantity: 20,
          currentSignal: 'STRONG_BUY',
          currentConfidence: 85,
          reason: 'Underweight healthcare sector',
          impact: {
            expectedReturn: 12.0,
            volatilityChange: 1.5,
            newAllocation: 10.0,
          },
          priority: 'medium',
        },
      ];

      usePortfolioStore.getState().setSuggestions(mockSuggestions);

      const { suggestions } = usePortfolioStore.getState();
      expect(suggestions).toEqual(mockSuggestions);
      expect(suggestions).toHaveLength(2);
    });

    it('should replace existing suggestions', () => {
      const firstSuggestions: RebalancingSuggestion[] = [
        {
          id: 'sug-1',
          action: 'HOLD',
          ticker: 'CBA',
          companyName: 'Commonwealth Bank',
          quantity: 0,
          currentSignal: 'HOLD',
          currentConfidence: 60,
          reason: 'Maintain position',
          impact: {
            expectedReturn: 0,
            volatilityChange: 0,
            newAllocation: 20.0,
          },
          priority: 'low',
        },
      ];

      const secondSuggestions: RebalancingSuggestion[] = [
        {
          id: 'sug-2',
          action: 'BUY',
          ticker: 'WBC',
          companyName: 'Westpac',
          quantity: 100,
          currentSignal: 'BUY',
          currentConfidence: 70,
          reason: 'Increase banking exposure',
          impact: {
            expectedReturn: 9.0,
            volatilityChange: 0.5,
            newAllocation: 15.0,
          },
          priority: 'medium',
        },
      ];

      usePortfolioStore.getState().setSuggestions(firstSuggestions);
      usePortfolioStore.getState().setSuggestions(secondSuggestions);

      const { suggestions } = usePortfolioStore.getState();
      expect(suggestions).toEqual(secondSuggestions);
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].ticker).toBe('WBC');
    });

    it('should handle empty suggestions array', () => {
      const mockSuggestions: RebalancingSuggestion[] = [
        {
          id: 'sug-1',
          action: 'SELL',
          ticker: 'BHP',
          companyName: 'BHP Group',
          quantity: 50,
          currentSignal: 'SELL',
          currentConfidence: 80,
          reason: 'Overweight position',
          impact: {
            expectedReturn: 8.5,
            volatilityChange: -2.1,
            newAllocation: 15.0,
          },
          priority: 'high',
        },
      ];

      usePortfolioStore.getState().setSuggestions(mockSuggestions);
      usePortfolioStore.getState().setSuggestions([]);

      const { suggestions } = usePortfolioStore.getState();
      expect(suggestions).toEqual([]);
    });
  });

  describe('clearPortfolio', () => {
    beforeEach(() => {
      const mockPortfolio: Portfolio = {
        totalValue: 100000,
        holdings: [
          {
            ticker: 'CBA',
            companyName: 'Commonwealth Bank',
            shares: 100,
            avgCost: 95.5,
            currentPrice: 100,
            totalValue: 10000,
            signal: 'BUY',
            confidence: 75,
          },
        ],
      };

      const mockSuggestions: RebalancingSuggestion[] = [
        {
          id: 'sug-1',
          action: 'SELL',
          ticker: 'BHP',
          companyName: 'BHP Group',
          quantity: 50,
          currentSignal: 'SELL',
          currentConfidence: 80,
          reason: 'Overweight position',
          impact: {
            expectedReturn: 8.5,
            volatilityChange: -2.1,
            newAllocation: 15.0,
          },
          priority: 'high',
        },
      ];

      usePortfolioStore.getState().setPortfolio(mockPortfolio);
      usePortfolioStore.getState().setSuggestions(mockSuggestions);
    });

    it('should reset portfolio to null', () => {
      usePortfolioStore.getState().clearPortfolio();

      const { portfolio } = usePortfolioStore.getState();
      expect(portfolio).toBeNull();
    });

    it('should reset holdings to empty array', () => {
      usePortfolioStore.getState().clearPortfolio();

      const { holdings } = usePortfolioStore.getState();
      expect(holdings).toEqual([]);
    });

    it('should reset suggestions to empty array', () => {
      usePortfolioStore.getState().clearPortfolio();

      const { suggestions } = usePortfolioStore.getState();
      expect(suggestions).toEqual([]);
    });

    it('should reset all state at once', () => {
      usePortfolioStore.getState().clearPortfolio();

      const state = usePortfolioStore.getState();
      expect(state.portfolio).toBeNull();
      expect(state.holdings).toEqual([]);
      expect(state.suggestions).toEqual([]);
    });
  });

  describe('State Immutability', () => {
    it('should not mutate original portfolio when updating', () => {
      const mockPortfolio: Portfolio = {
        totalValue: 100000,
        holdings: [
          {
            ticker: 'CBA',
            companyName: 'Commonwealth Bank',
            shares: 100,
            avgCost: 95.5,
            currentPrice: 100,
            totalValue: 10000,
            signal: 'BUY',
            confidence: 75,
          },
        ],
      };

      const originalHoldings = [...mockPortfolio.holdings];
      usePortfolioStore.getState().setPortfolio(mockPortfolio);
      usePortfolioStore.getState().updateHolding('CBA', { currentPrice: 105 });

      expect(mockPortfolio.holdings).toEqual(originalHoldings);
    });

    it('should not mutate holdings array when updating a holding', () => {
      const mockPortfolio: Portfolio = {
        totalValue: 100000,
        holdings: [
          {
            ticker: 'CBA',
            companyName: 'Commonwealth Bank',
            shares: 100,
            avgCost: 95.5,
            currentPrice: 100,
            totalValue: 10000,
            signal: 'BUY',
            confidence: 75,
          },
        ],
      };

      usePortfolioStore.getState().setPortfolio(mockPortfolio);
      const holdingsBefore = usePortfolioStore.getState().holdings;

      usePortfolioStore.getState().updateHolding('CBA', { currentPrice: 105 });
      const holdingsAfter = usePortfolioStore.getState().holdings;

      expect(holdingsBefore).not.toBe(holdingsAfter);
      expect(holdingsBefore[0]).not.toBe(holdingsAfter[0]);
    });

    it('should not mutate suggestions array when setting new suggestions', () => {
      const firstSuggestions: RebalancingSuggestion[] = [
        {
          id: 'sug-1',
          action: 'HOLD',
          ticker: 'CBA',
          companyName: 'Commonwealth Bank',
          quantity: 0,
          currentSignal: 'HOLD',
          currentConfidence: 60,
          reason: 'Maintain position',
          impact: {
            expectedReturn: 0,
            volatilityChange: 0,
            newAllocation: 20.0,
          },
          priority: 'low',
        },
      ];

      const secondSuggestions: RebalancingSuggestion[] = [
        {
          id: 'sug-2',
          action: 'BUY',
          ticker: 'WBC',
          companyName: 'Westpac',
          quantity: 100,
          currentSignal: 'BUY',
          currentConfidence: 70,
          reason: 'Increase banking exposure',
          impact: {
            expectedReturn: 9.0,
            volatilityChange: 0.5,
            newAllocation: 15.0,
          },
          priority: 'medium',
        },
      ];

      usePortfolioStore.getState().setSuggestions(firstSuggestions);
      const suggestionsBefore = usePortfolioStore.getState().suggestions;

      usePortfolioStore.getState().setSuggestions(secondSuggestions);

      expect(suggestionsBefore).toEqual(firstSuggestions);
      expect(suggestionsBefore).not.toBe(usePortfolioStore.getState().suggestions);
    });
  });

  describe('Multiple Updates in Sequence', () => {
    it('should handle multiple sequential updates correctly', () => {
      const mockPortfolio: Portfolio = {
        totalValue: 100000,
        holdings: [
          {
            ticker: 'CBA',
            companyName: 'Commonwealth Bank',
            shares: 100,
            avgCost: 95.5,
            currentPrice: 100,
            totalValue: 10000,
            signal: 'BUY',
            confidence: 75,
          },
          {
            ticker: 'BHP',
            companyName: 'BHP Group',
            shares: 200,
            avgCost: 42.0,
            currentPrice: 45.0,
            totalValue: 9000,
            signal: 'HOLD',
            confidence: 60,
          },
        ],
      };

      const mockSuggestions: RebalancingSuggestion[] = [
        {
          id: 'sug-1',
          action: 'SELL',
          ticker: 'BHP',
          companyName: 'BHP Group',
          quantity: 50,
          currentSignal: 'SELL',
          currentConfidence: 80,
          reason: 'Overweight position',
          impact: {
            expectedReturn: 8.5,
            volatilityChange: -2.1,
            newAllocation: 15.0,
          },
          priority: 'high',
        },
      ];

      // Sequence of updates
      usePortfolioStore.getState().setPortfolio(mockPortfolio);
      usePortfolioStore.getState().updateHolding('CBA', { currentPrice: 105 });
      usePortfolioStore.getState().setSuggestions(mockSuggestions);
      usePortfolioStore.getState().updateHolding('BHP', { signal: 'SELL', confidence: 80 });

      const state = usePortfolioStore.getState();

      expect(state.portfolio).toEqual(mockPortfolio);
      expect(state.holdings[0].currentPrice).toBe(105);
      expect(state.holdings[1].signal).toBe('SELL');
      expect(state.holdings[1].confidence).toBe(80);
      expect(state.suggestions).toEqual(mockSuggestions);
    });

    it('should handle set, update, and clear sequence', () => {
      const mockPortfolio: Portfolio = {
        totalValue: 100000,
        holdings: [
          {
            ticker: 'CBA',
            companyName: 'Commonwealth Bank',
            shares: 100,
            avgCost: 95.5,
            currentPrice: 100,
            totalValue: 10000,
            signal: 'BUY',
            confidence: 75,
          },
        ],
      };

      usePortfolioStore.getState().setPortfolio(mockPortfolio);
      usePortfolioStore.getState().updateHolding('CBA', { currentPrice: 105 });
      usePortfolioStore.getState().clearPortfolio();

      const state = usePortfolioStore.getState();
      expect(state.portfolio).toBeNull();
      expect(state.holdings).toEqual([]);
      expect(state.suggestions).toEqual([]);
    });

    it('should handle multiple portfolio replacements', () => {
      const portfolio1: Portfolio = {
        totalValue: 50000,
        holdings: [
          {
            ticker: 'ANZ',
            companyName: 'ANZ Bank',
            shares: 50,
            avgCost: 25.0,
            currentPrice: 26.0,
            totalValue: 1300,
            signal: 'HOLD',
            confidence: 50,
          },
        ],
      };

      const portfolio2: Portfolio = {
        totalValue: 75000,
        holdings: [
          {
            ticker: 'WBC',
            companyName: 'Westpac',
            shares: 100,
            avgCost: 22.0,
            currentPrice: 23.0,
            totalValue: 2300,
            signal: 'BUY',
            confidence: 65,
          },
        ],
      };

      const portfolio3: Portfolio = {
        totalValue: 100000,
        holdings: [
          {
            ticker: 'CBA',
            companyName: 'Commonwealth Bank',
            shares: 100,
            avgCost: 95.5,
            currentPrice: 100,
            totalValue: 10000,
            signal: 'STRONG_BUY',
            confidence: 85,
          },
        ],
      };

      usePortfolioStore.getState().setPortfolio(portfolio1);
      usePortfolioStore.getState().setPortfolio(portfolio2);
      usePortfolioStore.getState().setPortfolio(portfolio3);

      const { portfolio, holdings } = usePortfolioStore.getState();
      expect(portfolio).toEqual(portfolio3);
      expect(holdings).toEqual(portfolio3.holdings);
      expect(holdings[0].ticker).toBe('CBA');
    });
  });
});
