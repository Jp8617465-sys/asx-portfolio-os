/**
 * Signals Feature API Module - Public Exports
 *
 * This module exports all signal-related API functions and types
 * for use throughout the application.
 */

// Export all types
export type {
  SignalsLive,
  FundamentalsMetrics,
  FundamentalsQuality,
  ModelBSignal,
  ModelBSignals,
  EnsembleSignal,
  EnsembleSignals,
  SignalsComparison,
} from './signals-api';

// Export all API functions
export {
  // Model A (ML) signals - client-side
  getSignal,
  getSignalReasoning,
  getTopSignals,

  // Model A (ML) signals - server-side
  getSignalsLive,

  // Model B (Fundamentals) signals - client-side
  getModelBSignals,
  getModelBSignal,
  getFundamentalMetrics,

  // Model B (Fundamentals) signals - server-side
  getModelBSignalsLatest,
  getFundamentalsMetrics,
  getFundamentalsQuality,

  // Model C (Sentiment) signals - client-side
  getModelCSignals,
  getModelCSignal,

  // Ensemble signals - client-side
  getEnsembleSignals,
  getEnsembleSignal,

  // Ensemble signals - server-side
  getEnsembleSignalsLatest,

  // Signal comparison
  getSignalComparison,
  compareSignals,
} from './signals-api';
