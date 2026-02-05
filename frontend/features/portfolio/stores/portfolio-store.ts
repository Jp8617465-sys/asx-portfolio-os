/**
 * Portfolio Store using Zustand
 * Global state management for portfolio data, holdings, and rebalancing suggestions
 */

import { create } from 'zustand';
import type { Portfolio, PortfolioHolding, RebalancingSuggestion } from '@/contracts';

interface PortfolioStoreState {
  // State
  portfolio: Portfolio | null;
  holdings: PortfolioHolding[];
  suggestions: RebalancingSuggestion[];

  // Actions
  setPortfolio: (portfolio: Portfolio) => void;
  updateHolding: (ticker: string, update: Partial<PortfolioHolding>) => void;
  setSuggestions: (suggestions: RebalancingSuggestion[]) => void;
  clearPortfolio: () => void;
}

export const usePortfolioStore = create<PortfolioStoreState>((set) => ({
  portfolio: null,
  holdings: [],
  suggestions: [],

  setPortfolio: (portfolio) =>
    set({
      portfolio,
      holdings: portfolio.holdings,
    }),

  updateHolding: (ticker, update) =>
    set((state) => ({
      holdings: state.holdings.map((h) => (h.ticker === ticker ? { ...h, ...update } : h)),
    })),

  setSuggestions: (suggestions) => set({ suggestions }),

  clearPortfolio: () =>
    set({
      portfolio: null,
      holdings: [],
      suggestions: [],
    }),
}));
