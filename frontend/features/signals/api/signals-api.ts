/**
 * Signals Feature API Module
 * All signal-related API functions extracted from lib/api-client.ts and lib/api.ts
 *
 * This module provides:
 * - Model A (ML) signals
 * - Model B (Fundamentals) signals
 * - Model C (Sentiment) signals
 * - Ensemble signals
 * - Signal comparisons and reasoning
 */

import { apiClient } from '@/shared/api';

// ============================================================================
// Types
// ============================================================================

export type SignalsLive = {
  status?: string;
  model?: string;
  as_of?: string;
  count?: number;
  signals?: Array<{
    symbol?: string;
    rank?: number;
    score?: number;
    ml_prob?: number;
    ml_expected_return?: number;
  }>;
};

export type FundamentalsMetrics = {
  symbol?: string;
  sector?: string;
  industry?: string;
  metrics?: {
    valuation?: {
      pe_ratio?: number | null;
      pb_ratio?: number | null;
      market_cap?: number | null;
    };
    profitability?: {
      roe?: number | null;
      profit_margin?: number | null;
      eps?: number | null;
    };
    growth?: {
      revenue_growth_yoy?: number | null;
      eps_growth?: number | null;
    };
    financial_health?: {
      debt_to_equity?: number | null;
      current_ratio?: number | null;
      quick_ratio?: number | null;
      free_cash_flow?: number | null;
    };
    income?: {
      div_yield?: number | null;
    };
  };
  updated_at?: string | null;
  period_end?: string | null;
};

export type FundamentalsQuality = {
  symbol?: string;
  as_of?: string;
  quality?: {
    score?: string; // A, B, C, D, F
    grade_description?: string;
    confidence?: number | null;
  };
  signal?: string;
  expected_return?: number | null;
  rank?: number | null;
  fundamentals_snapshot?: {
    pe_ratio?: number | null;
    pb_ratio?: number | null;
    roe?: number | null;
    debt_to_equity?: number | null;
    profit_margin?: number | null;
  };
  created_at?: string | null;
};

export type ModelBSignal = {
  symbol?: string;
  signal?: string;
  quality_score?: string;
  confidence?: number | null;
  expected_return?: number | null;
  rank?: number | null;
  fundamentals?: {
    pe_ratio?: number | null;
    pb_ratio?: number | null;
    roe?: number | null;
    debt_to_equity?: number | null;
    profit_margin?: number | null;
  };
};

export type ModelBSignals = {
  status?: string;
  count?: number;
  as_of?: string | null;
  filters?: {
    signal?: string | null;
    quality?: string | null;
  };
  signals?: ModelBSignal[];
  message?: string;
};

export type EnsembleSignal = {
  symbol?: string;
  signal?: string;
  ensemble_score?: number | null;
  confidence?: number | null;
  rank?: number | null;
  component_signals?: {
    model_a?: {
      signal?: string;
      confidence?: number | null;
      rank?: number | null;
    };
    model_b?: {
      signal?: string;
      confidence?: number | null;
      rank?: number | null;
    };
  };
  agreement?: {
    signals_agree?: boolean;
    conflict?: boolean;
    conflict_reason?: string | null;
  };
};

export type EnsembleSignals = {
  status?: string;
  count?: number;
  as_of?: string | null;
  statistics?: {
    total?: number;
    agreement_rate?: number;
    conflict_rate?: number;
  };
  filters?: {
    signal?: string | null;
    agreement_only?: boolean;
    no_conflict?: boolean;
  };
  signals?: EnsembleSignal[];
  message?: string;
};

export type SignalsComparison = {
  symbol?: string;
  model_a?: {
    as_of?: string;
    signal?: string;
    confidence?: number | null;
    expected_return?: number | null;
    rank?: number | null;
  } | null;
  model_b?: {
    as_of?: string;
    signal?: string;
    quality_score?: string;
    confidence?: number | null;
    expected_return?: number | null;
    rank?: number | null;
  } | null;
  ensemble?: {
    as_of?: string;
    signal?: string;
    ensemble_score?: number | null;
    confidence?: number | null;
    rank?: number | null;
    conflict?: boolean;
    signals_agree?: boolean;
  } | null;
  availability?: {
    model_a?: boolean;
    model_b?: boolean;
    ensemble?: boolean;
  };
  comparison?: {
    models_agree?: boolean;
    conflict_detected?: boolean;
    recommendation?: string | null;
  };
};

// ============================================================================
// Model A (ML) Signal Functions - from lib/api-client.ts
// ============================================================================

/**
 * Get signal for a specific ticker from Model A
 * @param ticker - Stock ticker symbol
 */
export const getSignal = (ticker: string) => apiClient.get(`/api/signals/${ticker}`);

/**
 * Get reasoning/explanation for a signal from Model A
 * @param ticker - Stock ticker symbol
 */
export const getSignalReasoning = (ticker: string) =>
  apiClient.get(`/api/signals/${ticker}/reasoning`);

/**
 * Get top signals from Model A
 * @param params - Optional limit and signal filter
 */
export const getTopSignals = (params?: { limit?: number; signal?: string }) =>
  apiClient.get('/api/signals/top', { params });

// ============================================================================
// Model A (ML) Signal Functions - from lib/api.ts
// ============================================================================

type FetchOptions = RequestInit & { next?: { revalidate?: number } };

const INTERNAL_BASE = '/api';
const EXTERNAL_BASE = process.env.NEXT_PUBLIC_API_URL || '';
const BASE_URL = typeof window === 'undefined' ? EXTERNAL_BASE || INTERNAL_BASE : INTERNAL_BASE;

const SERVER_HEADERS =
  typeof window === 'undefined' && process.env.OS_API_KEY
    ? { 'x-api-key': process.env.OS_API_KEY }
    : {};

async function request<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const headers = new Headers(options.headers || undefined);
  headers.set('Content-Type', 'application/json');
  if (SERVER_HEADERS['x-api-key']) {
    headers.set('x-api-key', SERVER_HEADERS['x-api-key']);
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    const error = new Error(text || `Request failed: ${res.status}`);
    (error as any).status = res.status;
    (error as any).body = text;
    throw error;
  }

  return res.json() as Promise<T>;
}

/**
 * Get live signals from Model A (server-side)
 * @param model - Model identifier (default: 'model_a_ml')
 * @param limit - Number of signals to return (default: 20)
 * @param options - Fetch options including cache revalidation
 */
export async function getSignalsLive(model = 'model_a_ml', limit = 20, options?: FetchOptions) {
  const params = new URLSearchParams({ model, limit: String(limit) });
  return request<SignalsLive>(`/signals/live?${params.toString()}`, options);
}

// ============================================================================
// Model B (Fundamentals) Signal Functions
// ============================================================================

/**
 * Get latest signals from Model B (Fundamentals) - from lib/api-client.ts
 * @param params - Optional limit and minimum grade filter
 */
export const getModelBSignals = (params?: { limit?: number; minGrade?: string }) =>
  apiClient.get('/api/signals/model_b/latest', { params });

/**
 * Get Model B signal for specific ticker - from lib/api-client.ts
 * @param ticker - Stock ticker symbol
 */
export const getModelBSignal = (ticker: string) => apiClient.get(`/api/signals/model_b/${ticker}`);

/**
 * Get fundamentals metrics for a ticker
 * @param ticker - Stock ticker symbol (optional)
 */
export const getFundamentalMetrics = (ticker?: string) =>
  apiClient.get('/api/fundamentals/metrics', { params: ticker ? { ticker } : undefined });

/**
 * Get latest Model B signals (server-side) - from lib/api.ts
 * @param limit - Number of signals to return (default: 50)
 * @param signalFilter - Optional signal type filter
 * @param qualityFilter - Optional quality grade filter
 * @param options - Fetch options including cache revalidation
 */
export async function getModelBSignalsLatest(
  limit = 50,
  signalFilter?: string,
  qualityFilter?: string,
  options?: FetchOptions
) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (signalFilter) params.set('signal_filter', signalFilter);
  if (qualityFilter) params.set('quality_filter', qualityFilter);
  return request<ModelBSignals>(`/signals/model_b/latest?${params.toString()}`, options);
}

/**
 * Get fundamentals metrics for a ticker (server-side) - from lib/api.ts
 * @param ticker - Stock ticker symbol
 * @param options - Fetch options including cache revalidation
 */
export async function getFundamentalsMetrics(ticker: string, options?: FetchOptions) {
  const params = new URLSearchParams({ ticker });
  return request<FundamentalsMetrics>(`/fundamentals/metrics?${params.toString()}`, options);
}

/**
 * Get fundamentals quality score for a ticker (server-side) - from lib/api.ts
 * @param ticker - Stock ticker symbol
 * @param options - Fetch options including cache revalidation
 */
export async function getFundamentalsQuality(ticker: string, options?: FetchOptions) {
  const params = new URLSearchParams({ ticker });
  return request<FundamentalsQuality>(`/fundamentals/quality?${params.toString()}`, options);
}

// ============================================================================
// Model C (Sentiment) Signal Functions - from lib/api-client.ts
// ============================================================================

/**
 * Get latest signals from Model C (Sentiment)
 * @param params - Optional limit parameter
 */
export const getModelCSignals = (params?: { limit?: number }) =>
  apiClient.get('/api/signals/model_c/latest', { params });

/**
 * Get Model C signal for specific ticker
 * @param ticker - Stock ticker symbol
 */
export const getModelCSignal = (ticker: string) => apiClient.get(`/api/signals/model_c/${ticker}`);

// ============================================================================
// Ensemble Signal Functions
// ============================================================================

/**
 * Get latest ensemble signals - from lib/api-client.ts
 * @param params - Optional limit and agreement filter
 */
export const getEnsembleSignals = (params?: { limit?: number; agreement_only?: boolean }) =>
  apiClient.get('/api/signals/ensemble/latest', { params });

/**
 * Get ensemble signal for specific ticker - from lib/api-client.ts
 * @param ticker - Stock ticker symbol
 */
export const getEnsembleSignal = (ticker: string) =>
  apiClient.get(`/api/signals/ensemble/${ticker}`);

/**
 * Get latest ensemble signals (server-side) - from lib/api.ts
 * @param limit - Number of signals to return (default: 50)
 * @param signalFilter - Optional signal type filter
 * @param agreementOnly - Only return signals where models agree (default: false)
 * @param noConflict - Exclude conflicting signals (default: false)
 * @param options - Fetch options including cache revalidation
 */
export async function getEnsembleSignalsLatest(
  limit = 50,
  signalFilter?: string,
  agreementOnly = false,
  noConflict = false,
  options?: FetchOptions
) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (signalFilter) params.set('signal_filter', signalFilter);
  if (agreementOnly) params.set('agreement_only', 'true');
  if (noConflict) params.set('no_conflict', 'true');
  return request<EnsembleSignals>(`/signals/ensemble/latest?${params.toString()}`, options);
}

// ============================================================================
// Signal Comparison Functions
// ============================================================================

/**
 * Compare signals across all models for a ticker - from lib/api-client.ts
 * @param ticker - Stock ticker symbol
 */
export const getSignalComparison = (ticker: string) =>
  apiClient.get(`/signals/compare?ticker=${ticker}`);

/**
 * Compare signals across all models (server-side) - from lib/api.ts
 * @param ticker - Stock ticker symbol
 * @param options - Fetch options including cache revalidation
 */
export async function compareSignals(ticker: string, options?: FetchOptions) {
  const params = new URLSearchParams({ ticker });
  return request<SignalsComparison>(`/signals/compare?${params.toString()}`, options);
}
