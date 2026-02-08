import { act } from '@testing-library/react';
import { useETFStore } from '../etf-store';
import type { ETFHolding, ETFBreadcrumbItem } from '@/contracts';

describe('useETFStore', () => {
  beforeEach(() => {
    useETFStore.setState({
      selectedETF: null,
      drillDownPath: [],
      holdingsCache: {},
    });
  });

  describe('initial state', () => {
    it('should have null selectedETF', () => {
      const state = useETFStore.getState();
      expect(state.selectedETF).toBeNull();
    });

    it('should have empty drillDownPath', () => {
      const state = useETFStore.getState();
      expect(state.drillDownPath).toEqual([]);
    });

    it('should have empty holdingsCache', () => {
      const state = useETFStore.getState();
      expect(state.holdingsCache).toEqual({});
    });
  });

  describe('selectETF', () => {
    it('should set selectedETF to the given symbol', () => {
      act(() => {
        useETFStore.getState().selectETF('VAS.AX');
      });

      const state = useETFStore.getState();
      expect(state.selectedETF).toBe('VAS.AX');
    });

    it('should build drillDownPath with home, etf-list, and etf items', () => {
      act(() => {
        useETFStore.getState().selectETF('VAS.AX', 'Vanguard Australian Shares');
      });

      const state = useETFStore.getState();
      expect(state.drillDownPath).toHaveLength(3);
      expect(state.drillDownPath[0]).toEqual({ type: 'home', label: 'Home' });
      expect(state.drillDownPath[1]).toEqual({ type: 'etf-list', label: 'ETFs' });
      expect(state.drillDownPath[2]).toEqual({
        type: 'etf',
        label: 'Vanguard Australian Shares',
        symbol: 'VAS.AX',
      });
    });

    it('should use symbol as label when name is not provided', () => {
      act(() => {
        useETFStore.getState().selectETF('VAS.AX');
      });

      const state = useETFStore.getState();
      expect(state.drillDownPath[2]).toEqual({
        type: 'etf',
        label: 'VAS.AX',
        symbol: 'VAS.AX',
      });
    });
  });

  describe('navigateBack', () => {
    it('should remove last item from drillDownPath', () => {
      act(() => {
        useETFStore.getState().selectETF('VAS.AX', 'Vanguard Australian Shares');
      });

      act(() => {
        useETFStore.getState().navigateBack();
      });

      const state = useETFStore.getState();
      expect(state.drillDownPath).toHaveLength(2);
      expect(state.selectedETF).toBeNull();
    });

    it('should clear selectedETF when navigating back from ETF detail', () => {
      act(() => {
        useETFStore.getState().selectETF('VAS.AX');
      });

      act(() => {
        useETFStore.getState().navigateBack();
      });

      expect(useETFStore.getState().selectedETF).toBeNull();
    });

    it('should do nothing when drillDownPath is empty', () => {
      act(() => {
        useETFStore.getState().navigateBack();
      });

      const state = useETFStore.getState();
      expect(state.drillDownPath).toEqual([]);
      expect(state.selectedETF).toBeNull();
    });
  });

  describe('navigateToHome', () => {
    it('should clear selectedETF and drillDownPath', () => {
      act(() => {
        useETFStore.getState().selectETF('VAS.AX');
      });

      act(() => {
        useETFStore.getState().navigateToHome();
      });

      const state = useETFStore.getState();
      expect(state.selectedETF).toBeNull();
      expect(state.drillDownPath).toEqual([]);
    });
  });

  describe('cacheHoldings', () => {
    const mockHoldings: ETFHolding[] = [
      { holdingSymbol: 'CBA.AX', holdingName: 'Commonwealth Bank', weight: 10.5 },
      { holdingSymbol: 'BHP.AX', holdingName: 'BHP Group', weight: 8.2 },
    ];

    it('should cache holdings for a given symbol', () => {
      act(() => {
        useETFStore.getState().cacheHoldings('VAS.AX', mockHoldings);
      });

      const state = useETFStore.getState();
      expect(state.holdingsCache['VAS.AX']).toEqual(mockHoldings);
    });

    it('should cache holdings for multiple symbols', () => {
      const otherHoldings: ETFHolding[] = [
        { holdingSymbol: 'AAPL', holdingName: 'Apple Inc', weight: 5.0 },
      ];

      act(() => {
        useETFStore.getState().cacheHoldings('VAS.AX', mockHoldings);
        useETFStore.getState().cacheHoldings('VGS.AX', otherHoldings);
      });

      const state = useETFStore.getState();
      expect(state.holdingsCache['VAS.AX']).toEqual(mockHoldings);
      expect(state.holdingsCache['VGS.AX']).toEqual(otherHoldings);
    });

    it('should overwrite existing cache for same symbol', () => {
      const updatedHoldings: ETFHolding[] = [
        { holdingSymbol: 'CBA.AX', holdingName: 'Commonwealth Bank', weight: 11.0 },
      ];

      act(() => {
        useETFStore.getState().cacheHoldings('VAS.AX', mockHoldings);
      });
      act(() => {
        useETFStore.getState().cacheHoldings('VAS.AX', updatedHoldings);
      });

      const state = useETFStore.getState();
      expect(state.holdingsCache['VAS.AX']).toEqual(updatedHoldings);
    });
  });

  describe('clearCache', () => {
    it('should clear all cached holdings', () => {
      act(() => {
        useETFStore.getState().cacheHoldings('VAS.AX', [{ holdingSymbol: 'CBA.AX', weight: 10 }]);
        useETFStore.getState().cacheHoldings('VGS.AX', [{ holdingSymbol: 'AAPL', weight: 5 }]);
      });

      act(() => {
        useETFStore.getState().clearCache();
      });

      const state = useETFStore.getState();
      expect(state.holdingsCache).toEqual({});
    });
  });
});
