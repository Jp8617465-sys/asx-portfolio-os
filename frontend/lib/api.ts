const INTERNAL_BASE = '/api';
const EXTERNAL_BASE = process.env.NEXT_PUBLIC_API_URL || '';
const BASE_URL = typeof window === 'undefined' ? EXTERNAL_BASE || INTERNAL_BASE : INTERNAL_BASE;

type FetchOptions = RequestInit & { next?: { revalidate?: number } };

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

export type ModelStatusSummary = {
  status?: string;
  model?: string;
  last_run?: {
    version?: string;
    created_at?: string;
    roc_auc_mean?: number;
    rmse_mean?: number;
  };
  signals?: {
    as_of?: string;
    row_count?: number;
  };
  drift?: {
    psi_mean?: number;
    psi_max?: number;
    created_at?: string;
  };
};

export type DriftSummary = {
  status?: string;
  count?: number;
  rows?: Array<{
    id?: number;
    model?: string;
    baseline_label?: string;
    current_label?: string;
    metrics?: {
      psi_mean?: number;
      psi_max?: number;
    };
    created_at?: string;
  }>;
};

export type DashboardSummary = {
  as_of?: string;
  model?: string;
  summary?: {
    n_targets?: number;
    top10_weight?: number;
    top20_weight?: number;
  };
  targets?: Array<{
    symbol?: string;
    rank?: number;
    score?: number;
    target_weight?: number;
  }>;
};

export type FeatureImportance = {
  status?: string;
  model?: string;
  updated_at?: string;
  features?: Array<{
    feature: string;
    importance: number;
  }>;
};

export type AsxAnnouncementsSummary = {
  status?: string;
  limit?: number;
  lookback_days?: number;
  items?: Array<{
    dt?: string;
    code?: string;
    headline?: string;
    sentiment?: string;
    event_type?: string;
    confidence?: number;
    stance?: string;
    relevance_score?: number;
    source?: string;
  }>;
  summary?: {
    sentiment_counts?: Record<string, number>;
    event_counts?: Record<string, number>;
  };
};

export type LoanSummary = {
  status?: string;
  totals?: {
    count?: number;
    total_principal?: number | null;
    avg_rate?: number | null;
    avg_years?: number | null;
    total_interest?: number | null;
    avg_monthly_payment?: number | null;
    interest_ratio?: number | null;
    health_score?: number | null;
  };
  latest?: Array<{
    principal?: number | null;
    annual_rate?: number | null;
    years?: number | null;
    extra_payment?: number | null;
    monthly_payment?: number | null;
    total_interest?: number | null;
    created_at?: string | null;
  }>;
};

export type PortfolioAttribution = {
  status?: string;
  model?: string;
  as_of?: string;
  items?: Array<{
    symbol?: string;
    weight?: number | null;
    return_1d?: number | null;
    contribution?: number | null;
  }>;
  summary?: {
    portfolio_return?: number | null;
    volatility?: number | null;
    sharpe?: number | null;
  };
};

export type PortfolioPerformance = {
  status?: string;
  model?: string;
  series?: Array<{
    as_of?: string | null;
    portfolio_return?: number | null;
    volatility?: number | null;
    sharpe?: number | null;
    created_at?: string | null;
  }>;
};

export type ExplainabilityFeature = {
  feature?: string;
  importance?: number;
};

export type ModelExplainability = {
  status?: string;
  model_version?: string;
  path?: string;
  features?: ExplainabilityFeature[];
};

export type ModelCompare = {
  status?: string;
  model?: string;
  left?: {
    version?: string;
    created_at?: string;
    metrics?: Record<string, number | null>;
  };
  right?: {
    version?: string;
    created_at?: string;
    metrics?: Record<string, number | null>;
  };
  delta?: Record<string, number | null>;
};

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

export async function getModelStatusSummary(model: string, options?: FetchOptions) {
  return request<ModelStatusSummary>(
    `/model/status/summary?model=${encodeURIComponent(model)}`,
    options
  );
}

export async function getDriftSummary(model: string, options?: FetchOptions) {
  return request<DriftSummary>(`/drift/summary?model=${encodeURIComponent(model)}`, options);
}

export async function getDashboard(asOf: string, model = 'model_a_v1_1', options?: FetchOptions) {
  return request<DashboardSummary>(
    `/dashboard/model_a_v1_1?as_of=${encodeURIComponent(asOf)}&model=${encodeURIComponent(model)}`,
    options
  );
}

export async function getHealth(options?: FetchOptions) {
  return request<{ status?: string }>(`/health`, options);
}

export async function getFeatureImportance(
  model = 'model_a_ml',
  limit = 10,
  options?: FetchOptions
) {
  const params = new URLSearchParams({ model, limit: String(limit) });
  return request<FeatureImportance>(`/insights/feature-importance?${params.toString()}`, options);
}

export async function getModelExplainability(
  modelVersion = 'v1_2',
  limit = 20,
  options?: FetchOptions
) {
  const params = new URLSearchParams({ model_version: modelVersion, limit: String(limit) });
  return request<ModelExplainability>(`/model/explainability?${params.toString()}`, options);
}

export async function getAsxAnnouncements(limit = 10, lookbackDays = 30, options?: FetchOptions) {
  const params = new URLSearchParams({ limit: String(limit), lookback_days: String(lookbackDays) });
  return request<AsxAnnouncementsSummary>(`/insights/announcements?${params.toString()}`, options);
}

export async function sendAssistantChat(query: string, options?: FetchOptions) {
  return request<{ reply?: string }>(`/assistant/chat`, {
    method: 'POST',
    body: JSON.stringify({ query }),
    ...options,
  });
}

export async function getLoanSummary(limit = 10, options?: FetchOptions) {
  const params = new URLSearchParams({ limit: String(limit) });
  return request<LoanSummary>(`/loan/summary?${params.toString()}`, options);
}

export async function getPortfolioAttribution(
  model = 'model_a_v1_1',
  asOf?: string,
  limit = 50,
  options?: FetchOptions
) {
  const params = new URLSearchParams({ model, limit: String(limit) });
  if (asOf) params.set('as_of', asOf);
  return request<PortfolioAttribution>(`/portfolio/attribution?${params.toString()}`, options);
}

export async function getPortfolioPerformance(
  model = 'model_a_v1_1',
  limit = 30,
  options?: FetchOptions
) {
  const params = new URLSearchParams({ model, limit: String(limit) });
  return request<PortfolioPerformance>(`/portfolio/performance?${params.toString()}`, options);
}

export async function getModelCompare(
  model = 'model_a_ml',
  leftVersion?: string,
  rightVersion?: string,
  options?: FetchOptions
) {
  const params = new URLSearchParams({ model });
  if (leftVersion) params.set('left_version', leftVersion);
  if (rightVersion) params.set('right_version', rightVersion);
  return request<ModelCompare>(`/model/compare?${params.toString()}`, options);
}

export async function getSignalsLive(model = 'model_a_ml', limit = 20, options?: FetchOptions) {
  const params = new URLSearchParams({ model, limit: String(limit) });
  return request<SignalsLive>(`/signals/live?${params.toString()}`, options);
}

// ============================================================================
// V2: Fundamental Analysis & Ensemble Signals
// ============================================================================

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

// V2 API Functions

export async function getFundamentalsMetrics(ticker: string, options?: FetchOptions) {
  const params = new URLSearchParams({ ticker });
  return request<FundamentalsMetrics>(`/fundamentals/metrics?${params.toString()}`, options);
}

export async function getFundamentalsQuality(ticker: string, options?: FetchOptions) {
  const params = new URLSearchParams({ ticker });
  return request<FundamentalsQuality>(`/fundamentals/quality?${params.toString()}`, options);
}

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

export async function getModelBSignal(ticker: string, options?: FetchOptions) {
  return request<ModelBSignal>(`/signals/model_b/${ticker}`, options);
}

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

export async function getEnsembleSignal(ticker: string, options?: FetchOptions) {
  return request<EnsembleSignal>(`/signals/ensemble/${ticker}`, options);
}

export async function compareSignals(ticker: string, options?: FetchOptions) {
  const params = new URLSearchParams({ ticker });
  return request<SignalsComparison>(`/signals/compare?${params.toString()}`, options);
}
