const INTERNAL_BASE = "/api";
const EXTERNAL_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const BASE_URL = typeof window === "undefined" ? (EXTERNAL_BASE || INTERNAL_BASE) : INTERNAL_BASE;

type FetchOptions = RequestInit & { next?: { revalidate?: number } };

const SERVER_HEADERS =
  typeof window === "undefined" && process.env.OS_API_KEY
    ? { "x-api-key": process.env.OS_API_KEY }
    : {};

async function request<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const headers = new Headers(options.headers || undefined);
  headers.set("Content-Type", "application/json");
  if (SERVER_HEADERS["x-api-key"]) {
    headers.set("x-api-key", SERVER_HEADERS["x-api-key"]);
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
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

export async function getModelStatusSummary(model: string, options?: FetchOptions) {
  return request<ModelStatusSummary>(`/model/status/summary?model=${encodeURIComponent(model)}`, options);
}

export async function getDriftSummary(model: string, options?: FetchOptions) {
  return request<DriftSummary>(`/drift/summary?model=${encodeURIComponent(model)}`, options);
}

export async function getDashboard(asOf: string, model = "model_a_v1_1", options?: FetchOptions) {
  return request<DashboardSummary>(
    `/dashboard/model_a_v1_1?as_of=${encodeURIComponent(asOf)}&model=${encodeURIComponent(model)}`,
    options
  );
}

export async function getHealth(options?: FetchOptions) {
  return request<{ status?: string }>(`/health`, options);
}

export async function getFeatureImportance(model = "model_a_ml", limit = 10, options?: FetchOptions) {
  const params = new URLSearchParams({ model, limit: String(limit) });
  return request<FeatureImportance>(`/insights/feature-importance?${params.toString()}`, options);
}
