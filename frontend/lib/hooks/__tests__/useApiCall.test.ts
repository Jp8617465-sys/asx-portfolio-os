import { renderHook, act, waitFor } from '@testing-library/react';
import { useApiCall } from '../useApiCall';
import { toastHelpers } from '@/lib/toast-helpers';

jest.mock('@/lib/toast-helpers', () => ({
  toastHelpers: {
    apiError: jest.fn(),
    saveSuccess: jest.fn(),
  },
}));

const mockToastHelpers = toastHelpers as jest.Mocked<typeof toastHelpers>;

describe('useApiCall', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns initial state', () => {
    const apiFn = jest.fn();
    const { result } = renderHook(() => useApiCall(apiFn));

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(typeof result.current.execute).toBe('function');
    expect(typeof result.current.retry).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  it('execute calls api function and returns data', async () => {
    const mockData = { id: 1, name: 'Test' };
    const apiFn = jest.fn().mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useApiCall(apiFn, { retryCount: 0 }));

    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.execute('arg1', 'arg2');
    });

    expect(apiFn).toHaveBeenCalledWith('arg1', 'arg2');
    expect(returnValue).toEqual(mockData);
  });

  it('sets isLoading true during execution', async () => {
    let resolvePromise: (value: any) => void;
    const apiFn = jest.fn(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
    );

    const { result } = renderHook(() => useApiCall(apiFn, { retryCount: 0 }));

    // Start execute but don't await
    let executePromise: Promise<any>;
    act(() => {
      executePromise = result.current.execute();
    });

    // isLoading should be true while executing
    expect(result.current.isLoading).toBe(true);

    // Resolve and finish
    await act(async () => {
      resolvePromise!({ data: 'done' });
      await executePromise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('sets isSuccess true after successful call', async () => {
    const apiFn = jest.fn().mockResolvedValue({ data: 'result' });

    const { result } = renderHook(() => useApiCall(apiFn, { retryCount: 0 }));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.isError).toBe(false);
  });

  it('sets data from response.data', async () => {
    const mockData = { items: [1, 2, 3] };
    const apiFn = jest.fn().mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useApiCall(apiFn, { retryCount: 0 }));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.data).toEqual(mockData);
  });

  it('sets data directly when response has no .data', async () => {
    const mockResponse = { id: 1, name: 'Direct' };
    const apiFn = jest.fn().mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useApiCall(apiFn, { retryCount: 0 }));

    await act(async () => {
      await result.current.execute();
    });

    // response.data is undefined, so response itself is used
    expect(result.current.data).toEqual(mockResponse);
  });

  it('calls onSuccess callback with response data', async () => {
    const mockData = { id: 1 };
    const apiFn = jest.fn().mockResolvedValue({ data: mockData });
    const onSuccess = jest.fn();

    const { result } = renderHook(() => useApiCall(apiFn, { onSuccess, retryCount: 0 }));

    await act(async () => {
      await result.current.execute();
    });

    expect(onSuccess).toHaveBeenCalledWith(mockData);
  });

  it('shows success toast when showSuccessToast and successMessage provided', async () => {
    const apiFn = jest.fn().mockResolvedValue({ data: 'ok' });

    const { result } = renderHook(() =>
      useApiCall(apiFn, {
        showSuccessToast: true,
        successMessage: 'Portfolio',
        retryCount: 0,
      })
    );

    await act(async () => {
      await result.current.execute();
    });

    expect(mockToastHelpers.saveSuccess).toHaveBeenCalledWith('Portfolio');
  });

  it('does not show success toast when showSuccessToast is false', async () => {
    const apiFn = jest.fn().mockResolvedValue({ data: 'ok' });

    const { result } = renderHook(() =>
      useApiCall(apiFn, {
        showSuccessToast: false,
        successMessage: 'Portfolio',
        retryCount: 0,
      })
    );

    await act(async () => {
      await result.current.execute();
    });

    expect(mockToastHelpers.saveSuccess).not.toHaveBeenCalled();
  });

  it('sets isError true on failure', async () => {
    const error = { response: { status: 400 }, message: 'Bad Request' };
    const apiFn = jest.fn().mockRejectedValue(error);

    const { result } = renderHook(() => useApiCall(apiFn, { retryCount: 0 }));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('sets error on failure', async () => {
    const error = { response: { status: 404 }, message: 'Not Found' };
    const apiFn = jest.fn().mockRejectedValue(error);

    const { result } = renderHook(() => useApiCall(apiFn, { retryCount: 0 }));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.error).toEqual(error);
  });

  it('does not retry on 4xx errors (client errors)', async () => {
    const error = { response: { status: 422 }, message: 'Validation Error' };
    const apiFn = jest.fn().mockRejectedValue(error);

    const { result } = renderHook(() => useApiCall(apiFn, { retryCount: 3, retryDelay: 10 }));

    await act(async () => {
      await result.current.execute();
    });

    // Should only be called once (no retries for 4xx)
    expect(apiFn).toHaveBeenCalledTimes(1);
    expect(result.current.isError).toBe(true);
  });

  it('calls onError callback on failure', async () => {
    const error = { response: { status: 400 }, message: 'Bad Request' };
    const apiFn = jest.fn().mockRejectedValue(error);
    const onError = jest.fn();

    const { result } = renderHook(() => useApiCall(apiFn, { onError, retryCount: 0 }));

    await act(async () => {
      await result.current.execute();
    });

    expect(onError).toHaveBeenCalledWith(error);
  });

  it('shows error toast by default on failure', async () => {
    const error = { response: { status: 400 }, message: 'Bad Request' };
    const apiFn = jest.fn().mockRejectedValue(error);

    const { result } = renderHook(() => useApiCall(apiFn, { retryCount: 0 }));

    await act(async () => {
      await result.current.execute();
    });

    expect(mockToastHelpers.apiError).toHaveBeenCalledWith(error);
  });

  it('does not show error toast when showErrorToast is false', async () => {
    const error = { response: { status: 400 }, message: 'Bad Request' };
    const apiFn = jest.fn().mockRejectedValue(error);

    const { result } = renderHook(() =>
      useApiCall(apiFn, { showErrorToast: false, retryCount: 0 })
    );

    await act(async () => {
      await result.current.execute();
    });

    expect(mockToastHelpers.apiError).not.toHaveBeenCalled();
  });

  it('reset clears all state back to initial', async () => {
    const apiFn = jest.fn().mockResolvedValue({ data: 'result' });

    const { result } = renderHook(() => useApiCall(apiFn, { retryCount: 0 }));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.data).toBe('result');
    expect(result.current.isSuccess).toBe(true);

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('retry re-executes with last arguments', async () => {
    const mockData1 = { attempt: 1 };
    const mockData2 = { attempt: 2 };
    const apiFn = jest
      .fn()
      .mockResolvedValueOnce({ data: mockData1 })
      .mockResolvedValueOnce({ data: mockData2 });

    const { result } = renderHook(() => useApiCall(apiFn, { retryCount: 0 }));

    await act(async () => {
      await result.current.execute('myArg');
    });

    expect(apiFn).toHaveBeenCalledWith('myArg');
    expect(result.current.data).toEqual(mockData1);

    await act(async () => {
      await result.current.retry();
    });

    expect(apiFn).toHaveBeenCalledTimes(2);
    expect(apiFn).toHaveBeenLastCalledWith('myArg');
    expect(result.current.data).toEqual(mockData2);
  });

  it('retries on 5xx server errors then succeeds', async () => {
    const serverError = { response: { status: 500 }, message: 'Internal Server Error' };
    const apiFn = jest
      .fn()
      .mockRejectedValueOnce(serverError)
      .mockResolvedValueOnce({ data: 'recovered' });

    const { result } = renderHook(() => useApiCall(apiFn, { retryCount: 1, retryDelay: 1 }));

    await act(async () => {
      await result.current.execute();
    });

    expect(apiFn).toHaveBeenCalledTimes(2);
    expect(result.current.data).toBe('recovered');
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.isError).toBe(false);
  });

  it('retries on network errors (no status) then fails after retryCount', async () => {
    const networkError = { message: 'Network Error' };
    const apiFn = jest.fn().mockRejectedValue(networkError);
    const onError = jest.fn();

    const { result } = renderHook(() =>
      useApiCall(apiFn, { retryCount: 1, retryDelay: 1, onError })
    );

    await act(async () => {
      await result.current.execute();
    });

    // Initial call + 1 retry = 2 calls
    expect(apiFn).toHaveBeenCalledTimes(2);
    expect(result.current.isError).toBe(true);
    expect(result.current.error).toEqual(networkError);
    expect(onError).toHaveBeenCalledWith(networkError);
  });

  it('retries on 5xx errors and fails after exhausting retries', async () => {
    const serverError = { response: { status: 503 }, message: 'Service Unavailable' };
    const apiFn = jest.fn().mockRejectedValue(serverError);

    const { result } = renderHook(() =>
      useApiCall(apiFn, { retryCount: 2, retryDelay: 1, showErrorToast: false })
    );

    await act(async () => {
      await result.current.execute();
    });

    // Initial call + 2 retries = 3 calls
    expect(apiFn).toHaveBeenCalledTimes(3);
    expect(result.current.isError).toBe(true);
  });
});
