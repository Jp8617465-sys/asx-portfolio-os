/**
 * ETF Contract Types for ASX Portfolio OS
 * Defines types for ETF holdings drill-down feature
 */

import type { SignalType } from '../lib/types';

/** Single ETF holding with optional signal enrichment */
export interface ETFHolding {
  holdingSymbol: string;
  holdingName?: string;
  weight?: number;
  sharesHeld?: number;
  marketValue?: number;
  sector?: string;
  asOfDate?: string;
  signal?: SignalType;
  confidence?: number;
}

/** ETF summary for list view */
export interface ETFSummary {
  symbol: string;
  etfName?: string;
  sector?: string;
  nav?: number;
  return1w?: number;
  return1m?: number;
  return3m?: number;
  holdingsCount: number;
}

/** ETF detail with full holdings */
export interface ETFDetail extends ETFSummary {
  holdings: ETFHolding[];
  sectorAllocation: Record<string, number>;
  asOfDate?: string;
}

/** Sector allocation entry */
export interface ETFSectorAllocationEntry {
  sector: string;
  weight: number;
  holdingCount: number;
}

/** ETF navigation breadcrumb item */
export interface ETFBreadcrumbItem {
  type: 'home' | 'etf-list' | 'etf' | 'stock';
  label: string;
  symbol?: string;
}

/** ETF drill-down navigation state */
export interface ETFNavigationState {
  selectedETF: string | null;
  drillDownPath: ETFBreadcrumbItem[];
  holdingsCache: Record<string, ETFHolding[]>;
}

/** ETF API Contract */
export interface ETFAPI {
  getETFList(): Promise<{ etfs: ETFSummary[]; count: number }>;
  getETFDetail(symbol: string): Promise<ETFDetail>;
  getETFHoldings(symbol: string): Promise<{ holdings: ETFHolding[]; count: number }>;
  getETFHoldingsWithSignals(symbol: string): Promise<{ holdings: ETFHolding[]; count: number }>;
  getSectorAllocation(symbol: string): Promise<ETFSectorAllocationEntry[]>;
}
