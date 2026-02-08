/**
 * ETF Navigation Store using Zustand
 * Manages ETF selection, drill-down navigation, and holdings cache
 */

import { create } from 'zustand';
import type { ETFBreadcrumbItem, ETFHolding } from '@/contracts';

interface ETFStoreState {
  // State
  selectedETF: string | null;
  drillDownPath: ETFBreadcrumbItem[];
  holdingsCache: Record<string, ETFHolding[]>;

  // Actions
  selectETF: (symbol: string, name?: string) => void;
  navigateBack: () => void;
  navigateToHome: () => void;
  cacheHoldings: (symbol: string, holdings: ETFHolding[]) => void;
  clearCache: () => void;
}

export const useETFStore = create<ETFStoreState>((set) => ({
  selectedETF: null,
  drillDownPath: [],
  holdingsCache: {},

  selectETF: (symbol, name) =>
    set({
      selectedETF: symbol,
      drillDownPath: [
        { type: 'home', label: 'Home' },
        { type: 'etf-list', label: 'ETFs' },
        { type: 'etf', label: name || symbol, symbol },
      ],
    }),

  navigateBack: () =>
    set((state) => {
      if (state.drillDownPath.length === 0) return state;
      const newPath = state.drillDownPath.slice(0, -1);
      // If we removed the ETF item, clear selectedETF
      const hasETF = newPath.some((item) => item.type === 'etf');
      return {
        drillDownPath: newPath,
        selectedETF: hasETF ? state.selectedETF : null,
      };
    }),

  navigateToHome: () =>
    set({
      selectedETF: null,
      drillDownPath: [],
    }),

  cacheHoldings: (symbol, holdings) =>
    set((state) => ({
      holdingsCache: { ...state.holdingsCache, [symbol]: holdings },
    })),

  clearCache: () =>
    set({
      holdingsCache: {},
    }),
}));
