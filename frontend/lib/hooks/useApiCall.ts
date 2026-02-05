/**
 * Custom hook for API calls with built-in error handling, loading states, and retry logic
 */

import { useState, useCallback, useRef } from 'react';
import { toastHelpers } from '@/lib/toast-helpers';

interface UseApiCallOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: any) => void;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
  retryCount?: number;
  retryDelay?: number;
}

interface UseApiCallReturn<T> {
  data: T | null;
  error: any | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  execute: (...args: any[]) => Promise<T | null>;
  retry: () => Promise<T | null>;
  reset: () => void;
}

export function useApiCall<T = any>(
  apiFunction: (...args: any[]) => Promise<any>,
  options: UseApiCallOptions<T> = {}
): UseApiCallReturn<T> {
  const {
    onSuccess,
    onError,
    showSuccessToast = false,
    showErrorToast = true,
    successMessage,
    retryCount = 3,
    retryDelay = 1000,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);

  const lastArgsRef = useRef<any[]>([]);
  const attemptCountRef = useRef(0);

  const executeWithRetry = useCallback(
    async (...args: any[]): Promise<T | null> => {
      lastArgsRef.current = args;
      setIsLoading(true);
      setIsError(false);
      setError(null);

      for (let attempt = 0; attempt <= retryCount; attempt++) {
        attemptCountRef.current = attempt;

        try {
          const response = await apiFunction(...args);
          const responseData = response.data || response;

          setData(responseData);
          setIsSuccess(true);
          setIsLoading(false);

          if (showSuccessToast && successMessage) {
            toastHelpers.saveSuccess(successMessage);
          }

          if (onSuccess) {
            onSuccess(responseData);
          }

          return responseData;
        } catch (err: any) {
          // Don't retry on client errors (4xx)
          const status = err?.response?.status;
          if (status && status >= 400 && status < 500) {
            setError(err);
            setIsError(true);
            setIsLoading(false);

            if (showErrorToast) {
              toastHelpers.apiError(err);
            }

            if (onError) {
              onError(err);
            }

            return null;
          }

          // Retry on server errors (5xx) or network errors
          if (attempt < retryCount) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
            continue;
          }

          // Final attempt failed
          setError(err);
          setIsError(true);
          setIsLoading(false);

          if (showErrorToast) {
            toastHelpers.apiError(err);
          }

          if (onError) {
            onError(err);
          }

          return null;
        }
      }

      return null;
    },
    [
      apiFunction,
      onSuccess,
      onError,
      showSuccessToast,
      showErrorToast,
      successMessage,
      retryCount,
      retryDelay,
    ]
  );

  const retry = useCallback(async () => {
    return executeWithRetry(...lastArgsRef.current);
  }, [executeWithRetry]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
    setIsSuccess(false);
    setIsError(false);
    attemptCountRef.current = 0;
  }, []);

  return {
    data,
    error,
    isLoading,
    isSuccess,
    isError,
    execute: executeWithRetry,
    retry,
    reset,
  };
}
