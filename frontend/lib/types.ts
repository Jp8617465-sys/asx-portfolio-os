/**
 * TypeScript Type Definitions for ASX Portfolio OS
 */

// Signal types
export type SignalType = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';

export interface Signal {
  ticker: string;
  companyName: string;
  confidence: number; // 0-100
  signal: SignalType;
  lastPrice: number;
  priceChange: number; // percentage
  priceChangeAmount: number; // dollar amount
  lastUpdated: string; // ISO date
  modelBreakdown?: ModelBreakdown;
}

export interface ModelBreakdown {
  technicalScore: number;
  fundamentalsScore: number;
  sentimentScore: number;
}

// SHAP reasoning types
export interface ShapValue {
  feature: string;
  impact: number; // -100 to +100
  description: string;
  value: string | number;
}

export interface SignalReasoning {
  ticker: string;
  signal: SignalType;
  confidence: number;
  topFactors: ShapValue[];
  modelBreakdown: ModelBreakdown;
}

// Stock search types
export interface SearchResult {
  ticker: string;
  companyName: string;
  sector: string;
  marketCap: number;
}

// Historical accuracy types
export interface AccuracyMetric {
  ticker: string;
  totalPredictions: number;
  correct Predictions: number;
  accuracyRate: number; // percentage
  bySignal: {
    [key in SignalType]: {
      total: number;
      correct: number;
      accuracy: number;
    };
  };
}

export interface HistoricalPrediction {
  date: string;
  ticker: string;
  signal: SignalType;
  confidence: number;
  predictedReturn: number;
  actualReturn: number;
  correct: boolean;
}

// Watchlist types
export interface WatchlistItem extends Signal {
  addedAt: string;
  notes?: string;
}

// Portfolio types (Phase 3)
export interface PortfolioHolding {
  ticker: string;
  companyName: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  value: number;
  costBasis: number;
  gainLoss: number;
  gainLossPercent: number;
  signal: Signal;
  recommendation: 'HOLD' | 'SELL' | 'TRIM' | 'ADD';
}

export interface Portfolio {
  totalValue: number;
  costBasis: number;
  gainLoss: number;
  gainLossPercent: number;
  todayChange: number;
  todayChangePercent: number;
  aiPortfolioScore: number;
  holdings: PortfolioHolding[];
  riskMetrics: RiskMetrics;
}

export interface RiskMetrics {
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  beta: number;
  volatility: number;
}

export interface RebalancingSuggestion {
  action: 'SELL' | 'BUY' | 'TRIM';
  ticker: string;
  companyName: string;
  shares: number;
  price: number;
  value: number;
  reason: string;
  confidence: number;
  taxImpact?: number;
}

export interface RebalancingPlan {
  generatedAt: string;
  currentScore: number;
  projectedScore: number;
  suggestions: RebalancingSuggestion[];
  portfolioImpact: {
    sharpeRatio: { current: number; projected: number };
    expectedReturn: { current: number; projected: number };
    maxDrawdown: { current: number; projected: number };
  };
}

// User types
export interface User {
  id: string;
  email: string;
  createdAt: string;
  plan: 'free' | 'pro' | 'quant';
  settings: UserSettings;
}

export interface UserSettings {
  emailDigestFrequency: 'daily' | 'weekly' | 'off';
  pushNotifications: boolean;
  theme: 'light' | 'dark' | 'auto';
  defaultTimeframe: '1M' | '3M' | '6M' | '1Y' | 'ALL';
}

// Chart data types
export interface OHLCData {
  time: number; // Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartSignalMarker {
  time: number;
  position: 'aboveBar' | 'belowBar';
  color: string;
  shape: 'arrowUp' | 'arrowDown' | 'circle';
  text: string;
}

// API response types
export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  error?: string;
  message?: string;
}

// Utility types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
