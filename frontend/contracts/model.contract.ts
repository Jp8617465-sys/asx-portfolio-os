/**
 * Model Contract Types for ASX Portfolio OS
 */

export type ModelId = 'model_a' | 'model_b' | 'model_c';
export type ModelStatusState = 'active' | 'training' | 'degraded' | 'offline';

/** Configuration for an ML model */
export interface ModelConfig {
  modelId: ModelId;
  version: string;
  displayName: string;
  ensembleWeight: number;
  enabled: boolean;
  requiredFeatures: string[];
}

/** Current status of a model */
export interface ModelStatus {
  modelId: ModelId;
  version: string;
  status: ModelStatusState;
  lastPrediction: string;
  accuracy: { overall: number; last7Days: number; last30Days: number };
  driftStatus: 'normal' | 'warning' | 'critical';
  healthScore: number;
}

/** Drift metrics for a model */
export interface DriftMetrics {
  modelId: ModelId;
  timestamp: string;
  overallDriftScore: number;
  driftStatus: 'normal' | 'warning' | 'critical';
  featureDrift: Array<{ feature: string; psiScore: number; severity: string }>;
}

/** Model API Contract */
export interface ModelAPI {
  getStatusSummary(): Promise<{ models: ModelStatus[] }>;
  getModelStatus(modelId: ModelId): Promise<ModelStatus>;
  getDriftMetrics(modelId: ModelId): Promise<DriftMetrics>;
  getDriftSummary(): Promise<{ models: Array<{ modelId: ModelId; driftStatus: string }> }>;
}
