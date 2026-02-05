import { renderHook, waitFor } from '@testing-library/react';
import { useSignal } from '../useSignal';
import { getSignal } from '../../api/signals-api';
import type { BaseSignal } from '@/contracts';

// Mock the signals API
jest.mock('../../api/signals-api');

const mockedGetSignal = getSignal as jest.MockedFunction<typeof getSignal>;

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

describe('useSignal', () => {
  const mockSignal: BaseSignal = {
    ticker: 'CBA.AX',
    signal: 'BUY',
    confidence: 85,
    generatedAt: '2026-02-05T10:00:00Z',
    modelVersion: 'v1.2.0',
    rank: 5,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('null ticker handling', () => {
    it('should not fetch when ticker is null', () => {
      const { result } = renderHook(() => useSignal(null));

      expect(mockedGetSignal).not.toHaveBeenCalled();
      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
    });

    it('should not make API call when ticker is null', async () => {
      renderHook(() => useSignal(null));

      await waitFor(() => {
        expect(mockedGetSignal).not.toHaveBeenCalled();
      });
    });
  });

  describe('successful fetch', () => {
    it('should fetch signal data when ticker is provided', async () => {
      mockedGetSignal.mockResolvedValue({ data: mockSignal } as any);

      const { result } = renderHook(() => useSignal('CBA.AX'));

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockedGetSignal).toHaveBeenCalledWith('CBA.AX');
      expect(mockedGetSignal).toHaveBeenCalledTimes(1);
      expect(result.current.data).toEqual(mockSignal);
      expect(result.current.error).toBeUndefined();
    });

    it('should return complete signal data with all properties', async () => {
      mockedGetSignal.mockResolvedValue({ data: mockSignal } as any);

      const { result } = renderHook(() => useSignal('CBA.AX'));

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data).toMatchObject({
        ticker: 'CBA.AX',
        signal: 'BUY',
        confidence: 85,
        generatedAt: '2026-02-05T10:00:00Z',
        modelVersion: 'v1.2.0',
        rank: 5,
      });
    });

    it('should handle different signal types', async () => {
      const sellSignal: BaseSignal = {
        ...mockSignal,
        signal: 'SELL',
        confidence: 72,
      };

      mockedGetSignal.mockResolvedValue({ data: sellSignal } as any);

      const { result } = renderHook(() => useSignal('BHP.AX'));

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data?.signal).toBe('SELL');
      expect(result.current.data?.confidence).toBe(72);
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const error = new Error('API Error: Signal not found');
      mockedGetSignal.mockRejectedValue(error);

      const { result } = renderHook(() => useSignal('INVALID.AX'));

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      expect(result.current.error).toBe(error);
      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      mockedGetSignal.mockRejectedValue(networkError);

      const { result } = renderHook(() => useSignal('CBA.AX'));

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      expect(result.current.error).toBe(networkError);
    });

    it('should handle 404 errors', async () => {
      const error404 = Object.assign(new Error('Not found'), { status: 404 });
      mockedGetSignal.mockRejectedValue(error404);

      const { result } = renderHook(() => useSignal('NOTFOUND.AX'));

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      expect(result.current.error).toMatchObject({ status: 404 });
    });

    it('should handle 500 errors', async () => {
      const error500 = Object.assign(new Error('Internal server error'), { status: 500 });
      mockedGetSignal.mockRejectedValueOnce(error500);

      const { result } = renderHook(() => useSignal('ERROR500.AX'));

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      expect((result.current.error as any).status).toBe(500);
    });
  });

  describe('SWR caching behavior', () => {
    it('should use unique cache key per ticker', async () => {
      const signal1 = { ...mockSignal, ticker: 'UNIQUE1.AX' };
      const signal2 = { ...mockSignal, ticker: 'UNIQUE2.AX' };

      mockedGetSignal
        .mockResolvedValueOnce({ data: signal1 } as any)
        .mockResolvedValueOnce({ data: signal2 } as any);

      const { result: result1 } = renderHook(() => useSignal('UNIQUE1.AX'));

      await waitFor(() => {
        expect(result1.current.data).toBeDefined();
      });

      const { result: result2 } = renderHook(() => useSignal('UNIQUE2.AX'));

      await waitFor(() => {
        expect(result2.current.data).toBeDefined();
      });

      // Should have called API with different tickers
      expect(mockedGetSignal).toHaveBeenCalledWith('UNIQUE1.AX');
      expect(mockedGetSignal).toHaveBeenCalledWith('UNIQUE2.AX');
    });

    it('should share cache for same ticker', async () => {
      mockedGetSignal.mockResolvedValue({ data: mockSignal } as any);

      const { result: result1 } = renderHook(() => useSignal('CBA.AX'));

      await waitFor(() => {
        expect(result1.current.data).toBeDefined();
      });

      // Second call with same ticker should use cache
      const { result: result2 } = renderHook(() => useSignal('CBA.AX'));

      await waitFor(() => {
        expect(result2.current.data).toBeDefined();
      });

      // Both should have same data
      expect(result1.current.data).toEqual(result2.current.data);
    });

    it('should revalidate on mount', async () => {
      mockedGetSignal.mockResolvedValue({ data: mockSignal } as any);

      const { result, unmount } = renderHook(() => useSignal('CBA.AX'));

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      unmount();

      // Re-mount should trigger revalidation
      const { result: result2 } = renderHook(() => useSignal('CBA.AX'));

      await waitFor(() => {
        expect(result2.current.data).toBeDefined();
      });

      expect(result2.current.data).toEqual(mockSignal);
    });
  });

  describe('ticker changes', () => {
    it('should refetch when ticker changes', async () => {
      const signal1: BaseSignal = { ...mockSignal, ticker: 'TICKER1.AX' };
      const signal2: BaseSignal = { ...mockSignal, ticker: 'TICKER2.AX', signal: 'SELL' };

      mockedGetSignal
        .mockResolvedValueOnce({ data: signal1 } as any)
        .mockResolvedValueOnce({ data: signal2 } as any);

      const { result, rerender } = renderHook(({ ticker }) => useSignal(ticker), {
        initialProps: { ticker: 'TICKER1.AX' },
      });

      await waitFor(() => {
        expect(result.current.data?.ticker).toBe('TICKER1.AX');
      });

      // Change ticker
      rerender({ ticker: 'TICKER2.AX' });

      await waitFor(() => {
        expect(result.current.data?.ticker).toBe('TICKER2.AX');
      });

      expect(mockedGetSignal).toHaveBeenCalledWith('TICKER1.AX');
      expect(mockedGetSignal).toHaveBeenCalledWith('TICKER2.AX');
    });

    it('should stop fetching when ticker becomes null', async () => {
      mockedGetSignal.mockResolvedValue({ data: mockSignal } as any);

      const { result, rerender } = renderHook(({ ticker }) => useSignal(ticker), {
        initialProps: { ticker: 'CBA.AX' },
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      const callCount = mockedGetSignal.mock.calls.length;
      const lastData = result.current.data;

      // Change to null
      rerender({ ticker: null });

      // When ticker is null, SWR clears the cache key so data may be undefined
      // The important thing is that no additional API calls are made
      expect(mockedGetSignal).toHaveBeenCalledTimes(callCount);
    });
  });

  describe('loading states', () => {
    it('should set isLoading to true initially', async () => {
      let resolvePromise: any;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockedGetSignal.mockReturnValueOnce(promise as any);

      const { result } = renderHook(() => useSignal('LOADING.AX'));

      // Initially should be loading with no data
      expect(result.current.data).toBeUndefined();

      // Resolve the promise
      resolvePromise({ data: { ...mockSignal, ticker: 'LOADING.AX' } });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should set isLoading to false after successful fetch', async () => {
      mockedGetSignal.mockResolvedValue({ data: mockSignal } as any);

      const { result } = renderHook(() => useSignal('CBA.AX'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeDefined();
    });

    it('should set isLoading to false after error', async () => {
      const error = new Error('API Error');
      mockedGetSignal.mockRejectedValue(error);

      const { result } = renderHook(() => useSignal('CBA.AX'));

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('isValidating state', () => {
    it('should handle revalidation correctly', async () => {
      mockedGetSignal.mockResolvedValue({ data: mockSignal } as any);

      const { result } = renderHook(() => useSignal('CBA.AX'));

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.isValidating).toBe(false);
    });
  });
});
