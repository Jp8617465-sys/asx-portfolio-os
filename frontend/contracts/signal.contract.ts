/**
 * Signal Contract Types for ASX Portfolio OS
 * Defines types for ML model signals and API contracts
 */

import type { SignalType, ShapValue, ModelBreakdown } from '../lib/types';

export type { SignalType, ShapValue, ModelBreakdown };

/** Base signal interface - common properties across all model signals */
export interface BaseSignal {
  ticker: string;
  signal: SignalType;
  confidence: number;
  generatedAt: string;
  expiresAt?: string;
  modelVersion: string;
  rank?: number;
}

/** Model A Signal - Technical/Momentum analysis */
export interface ModelASignal extends BaseSignal {
  modelId: 'model_a';
  mlProb: number;
  expectedReturn: number;
  factors?: ShapValue[];
}

/** Model B Signal - Fundamental/Quality analysis */
export interface ModelBSignal extends BaseSignal {
  modelId: 'model_b';
  qualityScore: 'A' | 'B' | 'C' | 'D' | 'F';
}

/** Model C Signal - Sentiment/News analysis (V3) */
export interface ModelCSignal extends BaseSignal {
  modelId: 'model_c';
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  sentimentScore: number;
}

export type ModelSignal = ModelASignal | ModelBSignal | ModelCSignal;

/** Ensemble Signal - Combined signal from multiple models */
export interface EnsembleSignal {
  ticker: string;
  companyName: string;
  finalSignal: SignalType;
  confidence: number;
  ensembleScore: number;
  generatedAt: string;
  components: {
    modelA?: ModelASignal;
    modelB?: ModelBSignal;
    modelC?: ModelCSignal;
  };
  agreement: {
    signalsAgree: boolean;
    hasConflict: boolean;
    agreementScore: number;
    disagreements: string[];
  };
  weights: { modelA: number; modelB: number; modelC: number };
}

/** Signal API Contract */
export interface SignalAPI {
  getLiveSignals(params?: {
    model?: string;
    limit?: number;
  }): Promise<{ signals: BaseSignal[]; asOf: string }>;
  getSignal(ticker: string): Promise<BaseSignal>;
  getEnsembleSignals(params?: { limit?: number }): Promise<{ signals: EnsembleSignal[] }>;
  compareSignals(ticker: string): Promise<{ signals: Record<string, BaseSignal> }>;
}
