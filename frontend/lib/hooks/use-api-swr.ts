/**
 * Unified SWR hooks for all data fetching.
 *
 * Benefits over raw useEffect + useState:
 *  - Automatic request deduplication (same key = single request)
 *  - Stale-while-revalidate caching
 *  - Automatic cancellation on unmount
 *  - Built-in isLoading / error states
 *  - Focus revalidation (optional)
 */

import useSWR, { SWRConfiguration } from 'swr';
import apiClient from '@/lib/api-client';

// ---------------------------------------------------------------------------
// Generic fetcher – all hooks use the same Axios-based fetcher
// ---------------------------------------------------------------------------
const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

// ---------------------------------------------------------------------------
// Dashboard / Signals
// ---------------------------------------------------------------------------

export function useLiveSignals(model = 'model_a_ml', limit = 100, config?: SWRConfiguration) {
  return useSWR(`/api/signals/live?model=${model}&limit=${limit}`, fetcher, {
    refreshInterval: 60_000,
    dedupingInterval: 5_000,
    ...config,
  });
}

export function useSignal(ticker: string | null, config?: SWRConfiguration) {
  return useSWR(ticker ? `/api/signals/${ticker}` : null, fetcher, {
    dedupingInterval: 10_000,
    ...config,
  });
}

export function useSignalReasoning(ticker: string | null, config?: SWRConfiguration) {
  return useSWR(ticker ? `/api/signals/${ticker}/reasoning` : null, fetcher, {
    dedupingInterval: 30_000,
    ...config,
  });
}

export function useEnsembleSignals(
  params?: { limit?: number; agreement_only?: boolean },
  config?: SWRConfiguration
) {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.agreement_only) searchParams.set('agreement_only', 'true');
  const qs = searchParams.toString();

  return useSWR(`/api/signals/ensemble/latest${qs ? `?${qs}` : ''}`, fetcher, {
    dedupingInterval: 10_000,
    ...config,
  });
}

// ---------------------------------------------------------------------------
// Prices
// ---------------------------------------------------------------------------

export function usePriceHistory(ticker: string | null, period = '3M', config?: SWRConfiguration) {
  return useSWR(ticker ? `/api/prices/${ticker}/history?period=${period}` : null, fetcher, {
    dedupingInterval: 30_000,
    revalidateOnFocus: false,
    ...config,
  });
}

// ---------------------------------------------------------------------------
// Portfolio
// ---------------------------------------------------------------------------

export function usePortfolio(config?: SWRConfiguration) {
  return useSWR('/api/portfolio', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
    ...config,
  });
}

export function useRebalancingSuggestions(config?: SWRConfiguration) {
  return useSWR('/api/portfolio/rebalancing', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
    ...config,
  });
}

// ---------------------------------------------------------------------------
// Watchlist
// ---------------------------------------------------------------------------

export function useWatchlist(config?: SWRConfiguration) {
  return useSWR('/api/watchlist', fetcher, {
    refreshInterval: 60_000,
    dedupingInterval: 5_000,
    ...config,
  });
}

// ---------------------------------------------------------------------------
// Model Status & Drift
// ---------------------------------------------------------------------------

export function useModelStatusSummary(model = 'model_a_ml', config?: SWRConfiguration) {
  return useSWR(`/api/model/status/summary?model=${model}`, fetcher, {
    dedupingInterval: 30_000,
    ...config,
  });
}

export function useDriftSummary(model = 'model_a_ml', config?: SWRConfiguration) {
  return useSWR(`/api/drift/summary?model=${model}`, fetcher, {
    dedupingInterval: 60_000,
    ...config,
  });
}

// ---------------------------------------------------------------------------
// Accuracy
// ---------------------------------------------------------------------------

export function useAccuracy(ticker: string | null, config?: SWRConfiguration) {
  return useSWR(ticker ? `/api/accuracy/${ticker}` : null, fetcher, {
    dedupingInterval: 60_000,
    revalidateOnFocus: false,
    ...config,
  });
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export function useHealth(config?: SWRConfiguration) {
  return useSWR('/api/health', fetcher, {
    refreshInterval: 30_000,
    dedupingInterval: 10_000,
    ...config,
  });
}
