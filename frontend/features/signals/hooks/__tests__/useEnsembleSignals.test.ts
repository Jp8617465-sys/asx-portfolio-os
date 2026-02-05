import { renderHook, waitFor } from '@testing-library/react';
import { useEnsembleSignals } from '../useEnsembleSignals';
import { getEnsembleSignalsLatest } from '../../api/signals-api';
import type { EnsembleSignals } from '../../api/signals-api';

// Mock the signals API
jest.mock('../../api/signals-api');

const mockedGetEnsembleSignalsLatest = getEnsembleSignalsLatest as jest.MockedFunction<
  typeof getEnsembleSignalsLatest
>;

// Mock SWR to avoid caching issues between tests
jest.mock('swr', () => {
  const originalModule = jest.requireActual('swr');
  return {
    __esModule: true,
    ...originalModule,
    default: (key: any, fetcher: any, config?: any) => {
      return originalModule.default(key, fetcher, { ...config, dedupingInterval: 0 });
    },
  };
});

describe('useEnsembleSignals', () => {
  const mockEnsembleSignals: EnsembleSignals = {
    status: 'success',
    count: 3,
    as_of: '2026-02-05T10:00:00Z',
    statistics: {
      total: 100,
      agreement_rate: 0.85,
      conflict_rate: 0.15,
    },
    filters: {
      signal: null,
      agreement_only: false,
      no_conflict: false,
    },
    signals: [
      {
        symbol: 'CBA.AX',
        signal: 'BUY',
        ensemble_score: 0.85,
        confidence: 85,
        rank: 1,
        component_signals: {
          model_a: { signal: 'BUY', confidence: 82, rank: 2 },
          model_b: { signal: 'BUY', confidence: 88, rank: 1 },
        },
        agreement: {
          signals_agree: true,
          conflict: false,
          conflict_reason: null,
        },
      },
      {
        symbol: 'BHP.AX',
        signal: 'HOLD',
        ensemble_score: 0.65,
        confidence: 65,
        rank: 2,
        component_signals: {
          model_a: { signal: 'HOLD', confidence: 60, rank: 10 },
          model_b: { signal: 'HOLD', confidence: 70, rank: 8 },
        },
        agreement: {
          signals_agree: true,
          conflict: false,
          conflict_reason: null,
        },
      },
      {
        symbol: 'WBC.AX',
        signal: 'BUY',
        ensemble_score: 0.55,
        confidence: 55,
        rank: 3,
        component_signals: {
          model_a: { signal: 'BUY', confidence: 75, rank: 5 },
          model_b: { signal: 'HOLD', confidence: 60, rank: 12 },
        },
        agreement: {
          signals_agree: false,
          conflict: true,
          conflict_reason: 'Model A suggests BUY, Model B suggests HOLD',
        },
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('no parameters', () => {
    it('should fetch ensemble signals with default parameters', async () => {
      mockedGetEnsembleSignalsLatest.mockResolvedValue(mockEnsembleSignals);

      const { result } = renderHook(() => useEnsembleSignals());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockedGetEnsembleSignalsLatest).toHaveBeenCalledWith(undefined, undefined, undefined);
      expect(mockedGetEnsembleSignalsLatest).toHaveBeenCalledTimes(1);
      expect(result.current.data).toEqual(mockEnsembleSignals);
      expect(result.current.error).toBeUndefined();
    });

    it('should return all signal data properties', async () => {
      mockedGetEnsembleSignalsLatest.mockResolvedValue(mockEnsembleSignals);

      const { result } = renderHook(() => useEnsembleSignals());

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data).toMatchObject({
        status: 'success',
        count: 3,
        statistics: expect.objectContaining({
          total: 100,
          agreement_rate: 0.85,
        }),
      });
      expect(result.current.data?.signals).toHaveLength(3);
    });
  });

  describe('with limit parameter', () => {
    it('should fetch with custom limit', async () => {
      mockedGetEnsembleSignalsLatest.mockResolvedValue({
        ...mockEnsembleSignals,
        count: 10,
      });

      const { result } = renderHook(() => useEnsembleSignals({ limit: 10 }));

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(mockedGetEnsembleSignalsLatest).toHaveBeenCalledWith(10, undefined, undefined);
      expect(result.current.data?.count).toBe(10);
    });

    it('should handle small limit values', async () => {
      mockedGetEnsembleSignalsLatest.mockResolvedValue({
        ...mockEnsembleSignals,
        count: 5,
        signals: mockEnsembleSignals.signals?.slice(0, 1),
      });

      const { result } = renderHook(() => useEnsembleSignals({ limit: 5 }));

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(mockedGetEnsembleSignalsLatest).toHaveBeenCalledWith(5, undefined, undefined);
      expect(result.current.data?.count).toBe(5);
    });

    it('should handle large limit values', async () => {
      mockedGetEnsembleSignalsLatest.mockResolvedValue({
        ...mockEnsembleSignals,
        count: 100,
      });

      const { result } = renderHook(() => useEnsembleSignals({ limit: 100 }));

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(mockedGetEnsembleSignalsLatest).toHaveBeenCalledWith(100, undefined, undefined);
    });
  });

  describe('with agreementOnly parameter', () => {
    it('should filter for agreement only when true', async () => {
      const agreementOnlySignals = {
        ...mockEnsembleSignals,
        count: 2,
        signals: mockEnsembleSignals.signals?.filter((s) => s.agreement?.signals_agree),
        filters: {
          signal: null,
          agreement_only: true,
          no_conflict: false,
        },
      };

      mockedGetEnsembleSignalsLatest.mockResolvedValue(agreementOnlySignals);

      const { result } = renderHook(() => useEnsembleSignals({ agreementOnly: true }));

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(mockedGetEnsembleSignalsLatest).toHaveBeenCalledWith(undefined, undefined, true);
      expect(result.current.data?.filters?.agreement_only).toBe(true);
      expect(result.current.data?.signals?.every((s) => s.agreement?.signals_agree)).toBe(true);
    });

    it('should include conflicting signals when false', async () => {
      mockedGetEnsembleSignalsLatest.mockResolvedValue(mockEnsembleSignals);

      const { result } = renderHook(() => useEnsembleSignals({ agreementOnly: false }));

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(mockedGetEnsembleSignalsLatest).toHaveBeenCalledWith(undefined, undefined, false);
      expect(result.current.data?.signals?.some((s) => s.agreement?.conflict)).toBe(true);
    });
  });

  describe('with combined parameters', () => {
    it('should handle both limit and agreementOnly', async () => {
      const filteredSignals = {
        ...mockEnsembleSignals,
        count: 1,
        signals: [mockEnsembleSignals.signals![0]],
        filters: {
          signal: null,
          agreement_only: true,
          no_conflict: false,
        },
      };

      mockedGetEnsembleSignalsLatest.mockResolvedValue(filteredSignals);

      const { result } = renderHook(() => useEnsembleSignals({ limit: 10, agreementOnly: true }));

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(mockedGetEnsembleSignalsLatest).toHaveBeenCalledWith(10, undefined, true);
      expect(result.current.data?.count).toBe(1);
      expect(result.current.data?.filters?.agreement_only).toBe(true);
    });

    it('should handle parameter changes', async () => {
      const signals1 = { ...mockEnsembleSignals, count: 10 };
      const signals2 = { ...mockEnsembleSignals, count: 20 };

      mockedGetEnsembleSignalsLatest
        .mockResolvedValueOnce(signals1)
        .mockResolvedValueOnce(signals2);

      const { result, rerender } = renderHook(({ params }) => useEnsembleSignals(params), {
        initialProps: { params: { limit: 10 } },
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      // Change parameters
      rerender({ params: { limit: 20, agreementOnly: true } });

      await waitFor(
        () => {
          expect(result.current.data?.count).toBe(20);
        },
        { timeout: 3000 }
      );

      // Should have been called with both parameter sets
      expect(mockedGetEnsembleSignalsLatest).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const error = new Error('API Error: Failed to fetch ensemble signals');
      mockedGetEnsembleSignalsLatest.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useEnsembleSignals({ limit: 999 }));

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      expect(result.current.error).toBe(error);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      mockedGetEnsembleSignalsLatest.mockRejectedValue(networkError);

      const { result } = renderHook(() => useEnsembleSignals());

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      expect(result.current.error).toBe(networkError);
    });

    it('should handle 500 errors', async () => {
      const error500 = Object.assign(new Error('Internal server error'), { status: 500 });
      mockedGetEnsembleSignalsLatest.mockRejectedValueOnce(error500);

      const { result } = renderHook(() => useEnsembleSignals({ limit: 888 }));

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      expect((result.current.error as any).status).toBe(500);
    });

    it('should handle empty response', async () => {
      const emptyResponse: EnsembleSignals = {
        status: 'success',
        count: 0,
        signals: [],
      };

      mockedGetEnsembleSignalsLatest.mockResolvedValue(emptyResponse);

      const { result } = renderHook(() => useEnsembleSignals());

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data?.count).toBe(0);
      expect(result.current.data?.signals).toHaveLength(0);
    });
  });

  describe('SWR caching behavior', () => {
    it('should cache results for same parameters', async () => {
      mockedGetEnsembleSignalsLatest.mockResolvedValue(mockEnsembleSignals);

      const { result: result1 } = renderHook(() => useEnsembleSignals({ limit: 10 }));

      await waitFor(() => {
        expect(result1.current.data).toBeDefined();
      });

      // Second call with same params should use cache
      const { result: result2 } = renderHook(() => useEnsembleSignals({ limit: 10 }));

      await waitFor(() => {
        expect(result2.current.data).toBeDefined();
      });

      // Both should have same data
      expect(result1.current.data).toEqual(result2.current.data);
    });

    it('should use different cache for different parameters', async () => {
      mockedGetEnsembleSignalsLatest.mockResolvedValue(mockEnsembleSignals);

      const { result: result1 } = renderHook(() => useEnsembleSignals({ limit: 10 }));
      const { result: result2 } = renderHook(() => useEnsembleSignals({ limit: 20 }));

      await waitFor(() => {
        expect(result1.current.data).toBeDefined();
        expect(result2.current.data).toBeDefined();
      });

      // Should have called API twice with different parameters
      expect(mockedGetEnsembleSignalsLatest).toHaveBeenCalledWith(10, undefined, undefined);
      expect(mockedGetEnsembleSignalsLatest).toHaveBeenCalledWith(20, undefined, undefined);
    });

    it('should differentiate cache by agreementOnly flag', async () => {
      const agreementSignals = { ...mockEnsembleSignals, status: 'agreement' as any };
      const allSignals = { ...mockEnsembleSignals, status: 'all' as any };

      mockedGetEnsembleSignalsLatest
        .mockResolvedValueOnce(agreementSignals)
        .mockResolvedValueOnce(allSignals);

      const { result: result1 } = renderHook(() => useEnsembleSignals({ agreementOnly: true }));

      await waitFor(() => {
        expect(result1.current.data).toBeDefined();
      });

      const { result: result2 } = renderHook(() => useEnsembleSignals({ agreementOnly: false }));

      await waitFor(() => {
        expect(result2.current.data).toBeDefined();
      });

      expect(mockedGetEnsembleSignalsLatest).toHaveBeenCalledWith(undefined, undefined, true);
      expect(mockedGetEnsembleSignalsLatest).toHaveBeenCalledWith(undefined, undefined, false);
    });

    it('should revalidate on mount', async () => {
      mockedGetEnsembleSignalsLatest.mockResolvedValue(mockEnsembleSignals);

      const { result, unmount } = renderHook(() => useEnsembleSignals());

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      unmount();

      // Re-mount should trigger revalidation
      const { result: result2 } = renderHook(() => useEnsembleSignals());

      await waitFor(() => {
        expect(result2.current.data).toBeDefined();
      });

      expect(result2.current.data).toEqual(mockEnsembleSignals);
    });
  });

  describe('loading states', () => {
    it('should set isLoading to true initially', async () => {
      let resolvePromise: any;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockedGetEnsembleSignalsLatest.mockReturnValueOnce(promise as any);

      const { result } = renderHook(() => useEnsembleSignals({ limit: 777 }));

      // Initially should have no data
      expect(result.current.data).toBeUndefined();

      // Resolve the promise
      resolvePromise(mockEnsembleSignals);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should set isLoading to false after successful fetch', async () => {
      mockedGetEnsembleSignalsLatest.mockResolvedValue(mockEnsembleSignals);

      const { result } = renderHook(() => useEnsembleSignals());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeDefined();
    });

    it('should set isLoading to false after error', async () => {
      const error = new Error('API Error');
      mockedGetEnsembleSignalsLatest.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useEnsembleSignals({ limit: 666 }));

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('signal data integrity', () => {
    it('should preserve signal agreement status', async () => {
      mockedGetEnsembleSignalsLatest.mockResolvedValue(mockEnsembleSignals);

      const { result } = renderHook(() => useEnsembleSignals());

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      const agreementSignals = result.current.data?.signals?.filter(
        (s) => s.agreement?.signals_agree
      );
      const conflictSignals = result.current.data?.signals?.filter((s) => s.agreement?.conflict);

      expect(agreementSignals).toHaveLength(2);
      expect(conflictSignals).toHaveLength(1);
    });

    it('should preserve component signal details', async () => {
      mockedGetEnsembleSignalsLatest.mockResolvedValue(mockEnsembleSignals);

      const { result } = renderHook(() => useEnsembleSignals());

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      const firstSignal = result.current.data?.signals?.[0];
      expect(firstSignal?.component_signals?.model_a).toBeDefined();
      expect(firstSignal?.component_signals?.model_b).toBeDefined();
      expect(firstSignal?.component_signals?.model_a?.signal).toBe('BUY');
      expect(firstSignal?.component_signals?.model_b?.signal).toBe('BUY');
    });

    it('should preserve statistics data', async () => {
      mockedGetEnsembleSignalsLatest.mockResolvedValue(mockEnsembleSignals);

      const { result } = renderHook(() => useEnsembleSignals());

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data?.statistics).toEqual({
        total: 100,
        agreement_rate: 0.85,
        conflict_rate: 0.15,
      });
    });
  });
});
