/**
 * ETF Feature API Module
 * API functions for ETF list, holdings, and sector allocation
 */

import { apiClient } from '@/shared/api';
import type { ETFSummary, ETFHolding, ETFSectorAllocationEntry } from '@/contracts';

/**
 * Fetch all available ETFs
 */
export const getETFList = async (): Promise<{ etfs: ETFSummary[]; count: number }> => {
  const response = await apiClient.get<{
    status: string;
    count: number;
    etfs: ETFSummary[];
  }>('/api/etfs');
  return { etfs: response.data.etfs, count: response.data.count };
};

/**
 * Fetch holdings for a specific ETF
 * @param symbol - ETF symbol
 * @param withSignals - Include signal enrichment data
 */
export const getETFHoldings = async (
  symbol: string,
  withSignals = false
): Promise<{ holdings: ETFHolding[]; count: number; asOfDate: string | null }> => {
  const response = await apiClient.get<{
    status: string;
    etf_symbol: string;
    holdings_count: number;
    as_of_date: string | null;
    holdings: ETFHolding[];
  }>(`/api/etfs/${symbol}/holdings`, {
    params: { with_signals: withSignals },
  });
  return {
    holdings: response.data.holdings,
    count: response.data.holdings_count,
    asOfDate: response.data.as_of_date,
  };
};

/**
 * Fetch sector allocation for a specific ETF
 * @param symbol - ETF symbol
 */
export const getSectorAllocation = async (symbol: string): Promise<ETFSectorAllocationEntry[]> => {
  const response = await apiClient.get<{
    status: string;
    etf_symbol: string;
    sectors: ETFSectorAllocationEntry[];
  }>(`/api/etfs/${symbol}/sectors`);
  return response.data.sectors;
};
