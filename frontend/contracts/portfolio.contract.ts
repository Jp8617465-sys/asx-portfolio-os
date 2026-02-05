/**
 * Portfolio Contract Types for ASX Portfolio OS
 */

import type {
  PortfolioHolding,
  Portfolio,
  RiskMetrics,
  RebalancingSuggestion,
  RebalancingPlan,
} from '../lib/types';

export type { PortfolioHolding, Portfolio, RiskMetrics, RebalancingSuggestion, RebalancingPlan };

/** Portfolio summary with high-level metrics */
export interface PortfolioSummary {
  totalValue: number;
  totalInvested: number;
  cashBalance: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  holdingsCount: number;
  lastUpdated: string;
}

/** Portfolio performance over time */
export interface PortfolioPerformance {
  portfolioId: string;
  timeframe: string;
  timeSeries: Array<{ date: string; value: number; dailyReturn: number }>;
  metrics: { totalReturn: number; sharpeRatio: number; volatility: number };
}

/** Portfolio API Contract */
export interface PortfolioAPI {
  getPortfolio(): Promise<Portfolio>;
  getPerformance(timeframe: string): Promise<PortfolioPerformance>;
  getRebalancingPlan(): Promise<RebalancingPlan>;
  uploadPortfolio(
    holdings: Array<{ ticker: string; shares: number }>
  ): Promise<{ success: boolean }>;
}
