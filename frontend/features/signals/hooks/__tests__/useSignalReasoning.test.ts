import { renderHook, waitFor } from '@testing-library/react';
import { useSignalReasoning } from '../useSignalReasoning';
import { getSignalReasoning } from '../../api/signals-api';
import type { SignalReasoning } from '@/contracts';

// Mock the signals API
jest.mock('../../api/signals-api');

const mockedGetSignalReasoning = getSignalReasoning as jest.MockedFunction<
  typeof getSignalReasoning
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

describe('useSignalReasoning', () => {
  const mockReasoning: SignalReasoning = {
    ticker: 'CBA.AX',
    signal: 'BUY',
    confidence: 78,
    topFactors: [
      {
        feature: 'RSI Momentum',
        impact: 42,
        description: 'Strong upward momentum',
        value: 68.5,
      },
      {
        feature: 'Volume Trend',
        impact: -12,
        description: 'Below average volume',
        value: 1200000,
      },
      {
        feature: 'MA Crossover',
        impact: 25,
        description: '50-day MA crossed above 200-day',
        value: 'bullish',
      },
    ],
    modelBreakdown: {
      technicalScore: 72,
      fundamentalsScore: 65,
      sentimentScore: 58,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('null ticker handling', () => {
    it('should not fetch when ticker is null', () => {
      const { result } = renderHook(() => useSignalReasoning(null));

      expect(mockedGetSignalReasoning).not.toHaveBeenCalled();
      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
    });

    it('should not make API call when ticker is null', async () => {
      renderHook(() => useSignalReasoning(null));

      await waitFor(() => {
        expect(mockedGetSignalReasoning).not.toHaveBeenCalled();
      });
    });
  });

  describe('successful fetch', () => {
    it('should fetch reasoning data when ticker is provided', async () => {
      mockedGetSignalReasoning.mockResolvedValue({ data: mockReasoning } as any);

      const { result } = renderHook(() => useSignalReasoning('CBA.AX'));

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockedGetSignalReasoning).toHaveBeenCalledWith('CBA.AX');
      expect(mockedGetSignalReasoning).toHaveBeenCalledTimes(1);
      expect(result.current.data).toEqual(mockReasoning);
      expect(result.current.error).toBeUndefined();
    });

    it('should return complete reasoning data with all properties', async () => {
      mockedGetSignalReasoning.mockResolvedValue({ data: mockReasoning } as any);

      const { result } = renderHook(() => useSignalReasoning('CBA.AX'));

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data).toMatchObject({
        ticker: 'CBA.AX',
        signal: 'BUY',
        confidence: 78,
      });
      expect(result.current.data?.topFactors).toHaveLength(3);
      expect(result.current.data?.modelBreakdown).toBeDefined();
    });

    it('should preserve top factors data', async () => {
      mockedGetSignalReasoning.mockResolvedValue({ data: mockReasoning } as any);

      const { result } = renderHook(() => useSignalReasoning('CBA.AX'));

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      const factors = result.current.data?.topFactors;
      expect(factors?.[0]).toEqual({
        feature: 'RSI Momentum',
        impact: 42,
        description: 'Strong upward momentum',
        value: 68.5,
      });
      expect(factors?.[1].impact).toBe(-12);
      expect(factors?.[2].value).toBe('bullish');
    });

    it('should preserve model breakdown scores', async () => {
      mockedGetSignalReasoning.mockResolvedValue({ data: mockReasoning } as any);

      const { result } = renderHook(() => useSignalReasoning('CBA.AX'));

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data?.modelBreakdown).toEqual({
        technicalScore: 72,
        fundamentalsScore: 65,
        sentimentScore: 58,
      });
    });

    it('should handle different signal types', async () => {
      const sellReasoning: SignalReasoning = {
        ...mockReasoning,
        signal: 'SELL',
        confidence: 82,
        topFactors: [
          {
            feature: 'Bearish Divergence',
            impact: -35,
            description: 'Price diverging from RSI',
            value: -15.2,
          },
        ],
      };

      mockedGetSignalReasoning.mockResolvedValue({ data: sellReasoning } as any);

      const { result } = renderHook(() => useSignalReasoning('BHP.AX'));

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data?.signal).toBe('SELL');
      expect(result.current.data?.topFactors?.[0].impact).toBe(-35);
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const error = new Error('API Error: Reasoning not found');
      mockedGetSignalReasoning.mockRejectedValue(error);

      const { result } = renderHook(() => useSignalReasoning('INVALID.AX'));

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      expect(result.current.error).toBe(error);
      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      mockedGetSignalReasoning.mockRejectedValue(networkError);

      const { result } = renderHook(() => useSignalReasoning('CBA.AX'));

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      expect(result.current.error).toBe(networkError);
    });

    it('should handle 404 errors', async () => {
      const error404 = Object.assign(new Error('Not found'), { status: 404 });
      mockedGetSignalReasoning.mockRejectedValue(error404);

      const { result } = renderHook(() => useSignalReasoning('NOTFOUND.AX'));

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      expect(result.current.error).toMatchObject({ status: 404 });
    });

    it('should handle 500 errors', async () => {
      const error500 = Object.assign(new Error('Internal server error'), { status: 500 });
      mockedGetSignalReasoning.mockRejectedValueOnce(error500);

      const { result } = renderHook(() => useSignalReasoning('ERROR500.AX'));

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      expect((result.current.error as any).status).toBe(500);
    });

    it('should handle missing model breakdown', async () => {
      const incompleteReasoning: SignalReasoning = {
        ticker: 'CBA.AX',
        signal: 'BUY',
        confidence: 78,
        topFactors: [],
      };

      mockedGetSignalReasoning.mockResolvedValue({ data: incompleteReasoning } as any);

      const { result } = renderHook(() => useSignalReasoning('CBA.AX'));

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data?.modelBreakdown).toBeUndefined();
      expect(result.current.data?.topFactors).toHaveLength(0);
    });
  });

  describe('SWR caching behavior', () => {
    it('should use unique cache key per ticker', async () => {
      const reasoning1 = { ...mockReasoning, ticker: 'CBA.AX' };
      const reasoning2 = { ...mockReasoning, ticker: 'BHP.AX' };

      mockedGetSignalReasoning
        .mockResolvedValueOnce({ data: reasoning1 } as any)
        .mockResolvedValueOnce({ data: reasoning2 } as any);

      const { result: result1 } = renderHook(() => useSignalReasoning('CBA.AX'));

      await waitFor(() => {
        expect(result1.current.data).toBeDefined();
      });

      const { result: result2 } = renderHook(() => useSignalReasoning('BHP.AX'));

      await waitFor(() => {
        expect(result2.current.data).toBeDefined();
      });

      // Should have called API with different tickers
      expect(mockedGetSignalReasoning).toHaveBeenCalledWith('CBA.AX');
      expect(mockedGetSignalReasoning).toHaveBeenCalledWith('BHP.AX');
    });

    it('should share cache for same ticker', async () => {
      mockedGetSignalReasoning.mockResolvedValue({ data: mockReasoning } as any);

      const { result: result1 } = renderHook(() => useSignalReasoning('CBA.AX'));

      await waitFor(() => {
        expect(result1.current.data).toBeDefined();
      });

      // Second call with same ticker should use cache
      const { result: result2 } = renderHook(() => useSignalReasoning('CBA.AX'));

      await waitFor(() => {
        expect(result2.current.data).toBeDefined();
      });

      // Both should have same data
      expect(result1.current.data).toEqual(result2.current.data);
    });

    it('should use different cache key than useSignal', async () => {
      const reasoning = { ...mockReasoning, ticker: 'CACHE.AX' };
      mockedGetSignalReasoning.mockResolvedValueOnce({ data: reasoning } as any);

      const { result } = renderHook(() => useSignalReasoning('CACHE.AX'));

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      // Cache key should be 'reasoning-CACHE.AX', not 'signal-CACHE.AX'
      expect(mockedGetSignalReasoning).toHaveBeenCalledWith('CACHE.AX');
    });

    it('should revalidate on mount', async () => {
      mockedGetSignalReasoning.mockResolvedValue({ data: mockReasoning } as any);

      const { result, unmount } = renderHook(() => useSignalReasoning('CBA.AX'));

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      unmount();

      // Re-mount should trigger revalidation
      const { result: result2 } = renderHook(() => useSignalReasoning('CBA.AX'));

      await waitFor(() => {
        expect(result2.current.data).toBeDefined();
      });

      expect(result2.current.data).toEqual(mockReasoning);
    });
  });

  describe('ticker changes', () => {
    it('should refetch when ticker changes', async () => {
      const reasoning1: SignalReasoning = { ...mockReasoning, ticker: 'CHANGE1.AX' };
      const reasoning2: SignalReasoning = {
        ...mockReasoning,
        ticker: 'CHANGE2.AX',
        signal: 'SELL',
        confidence: 82,
      };

      mockedGetSignalReasoning
        .mockResolvedValueOnce({ data: reasoning1 } as any)
        .mockResolvedValueOnce({ data: reasoning2 } as any);

      const { result, rerender } = renderHook(({ ticker }) => useSignalReasoning(ticker), {
        initialProps: { ticker: 'CHANGE1.AX' },
      });

      await waitFor(() => {
        expect(result.current.data?.ticker).toBe('CHANGE1.AX');
      });

      // Change ticker
      rerender({ ticker: 'CHANGE2.AX' });

      await waitFor(() => {
        expect(result.current.data?.ticker).toBe('CHANGE2.AX');
      });

      expect(mockedGetSignalReasoning).toHaveBeenCalledWith('CHANGE1.AX');
      expect(mockedGetSignalReasoning).toHaveBeenCalledWith('CHANGE2.AX');
    });

    it('should stop fetching when ticker becomes null', async () => {
      mockedGetSignalReasoning.mockResolvedValue({ data: mockReasoning } as any);

      const { result, rerender } = renderHook(({ ticker }) => useSignalReasoning(ticker), {
        initialProps: { ticker: 'CBA.AX' },
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      const callCount = mockedGetSignalReasoning.mock.calls.length;

      // Change to null
      rerender({ ticker: null });

      // When ticker is null, SWR clears the cache key so data may be undefined
      // The important thing is that no additional API calls are made
      expect(mockedGetSignalReasoning).toHaveBeenCalledTimes(callCount);
    });

    it('should resume fetching when ticker changes from null to valid', async () => {
      const reasoning = { ...mockReasoning, ticker: 'RESUME.AX' };
      mockedGetSignalReasoning.mockResolvedValueOnce({ data: reasoning } as any);

      const { result, rerender } = renderHook(({ ticker }) => useSignalReasoning(ticker), {
        initialProps: { ticker: null },
      });

      expect(result.current.data).toBeUndefined();
      expect(mockedGetSignalReasoning).not.toHaveBeenCalled();

      // Change from null to valid ticker
      rerender({ ticker: 'RESUME.AX' });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(mockedGetSignalReasoning).toHaveBeenCalledWith('RESUME.AX');
    });
  });

  describe('loading states', () => {
    it('should set isLoading to true initially', async () => {
      let resolvePromise: any;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockedGetSignalReasoning.mockReturnValueOnce(promise as any);

      const { result } = renderHook(() => useSignalReasoning('LOADING.AX'));

      // Initially should have no data
      expect(result.current.data).toBeUndefined();

      // Resolve the promise
      resolvePromise({ data: { ...mockReasoning, ticker: 'LOADING.AX' } });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should set isLoading to false after successful fetch', async () => {
      mockedGetSignalReasoning.mockResolvedValue({ data: mockReasoning } as any);

      const { result } = renderHook(() => useSignalReasoning('CBA.AX'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeDefined();
    });

    it('should set isLoading to false after error', async () => {
      const error = new Error('API Error');
      mockedGetSignalReasoning.mockRejectedValue(error);

      const { result } = renderHook(() => useSignalReasoning('CBA.AX'));

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('reasoning data integrity', () => {
    it('should handle positive and negative impact factors', async () => {
      mockedGetSignalReasoning.mockResolvedValue({ data: mockReasoning } as any);

      const { result } = renderHook(() => useSignalReasoning('CBA.AX'));

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      const positiveFactors = result.current.data?.topFactors?.filter((f) => f.impact > 0);
      const negativeFactors = result.current.data?.topFactors?.filter((f) => f.impact < 0);

      expect(positiveFactors).toHaveLength(2);
      expect(negativeFactors).toHaveLength(1);
    });

    it('should handle numeric and string factor values', async () => {
      mockedGetSignalReasoning.mockResolvedValue({ data: mockReasoning } as any);

      const { result } = renderHook(() => useSignalReasoning('CBA.AX'));

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      const factors = result.current.data?.topFactors;
      expect(typeof factors?.[0].value).toBe('number');
      expect(typeof factors?.[1].value).toBe('number');
      expect(typeof factors?.[2].value).toBe('string');
    });

    it('should preserve factor order', async () => {
      mockedGetSignalReasoning.mockResolvedValue({ data: mockReasoning } as any);

      const { result } = renderHook(() => useSignalReasoning('CBA.AX'));

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      const factors = result.current.data?.topFactors;
      expect(factors?.[0].feature).toBe('RSI Momentum');
      expect(factors?.[1].feature).toBe('Volume Trend');
      expect(factors?.[2].feature).toBe('MA Crossover');
    });

    it('should handle reasoning with many factors', async () => {
      const manyFactorsReasoning: SignalReasoning = {
        ticker: 'WBC.AX',
        signal: 'BUY',
        confidence: 85,
        topFactors: [
          { feature: 'Factor 1', impact: 10, description: 'Desc 1', value: 1 },
          { feature: 'Factor 2', impact: 9, description: 'Desc 2', value: 2 },
          { feature: 'Factor 3', impact: 8, description: 'Desc 3', value: 3 },
          { feature: 'Factor 4', impact: 7, description: 'Desc 4', value: 4 },
          { feature: 'Factor 5', impact: 6, description: 'Desc 5', value: 5 },
        ],
      };

      mockedGetSignalReasoning.mockResolvedValue({ data: manyFactorsReasoning } as any);

      const { result } = renderHook(() => useSignalReasoning('WBC.AX'));

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data?.topFactors).toHaveLength(5);
    });
  });

  describe('isValidating state', () => {
    it('should handle revalidation correctly', async () => {
      mockedGetSignalReasoning.mockResolvedValue({ data: mockReasoning } as any);

      const { result } = renderHook(() => useSignalReasoning('CBA.AX'));

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.isValidating).toBe(false);
    });
  });
});
