/**
 * ETF Hooks
 * SWR-based hooks for fetching ETF data
 */

import useSWR from 'swr';
import { getETFList, getETFHoldings, getSectorAllocation } from '../api/etf-api';

/**
 * Hook to fetch the list of all ETFs
 */
export function useETFList() {
  return useSWR('etf-list', () => getETFList());
}

/**
 * Hook to fetch holdings for a specific ETF
 * @param symbol - ETF symbol, null to skip fetching
 * @param withSignals - Include signal enrichment data
 */
export function useETFHoldings(symbol: string | null, withSignals = false) {
  return useSWR(symbol ? ['etf-holdings', symbol, withSignals] : null, () =>
    getETFHoldings(symbol!, withSignals)
  );
}

/**
 * Hook to fetch sector allocation for a specific ETF
 * @param symbol - ETF symbol, null to skip fetching
 */
export function useSectorAllocation(symbol: string | null) {
  return useSWR(symbol ? ['etf-sectors', symbol] : null, () => getSectorAllocation(symbol!));
}
