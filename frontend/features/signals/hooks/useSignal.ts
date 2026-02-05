import useSWR from 'swr';
import { getSignal } from '../api/signals-api';
import type { BaseSignal } from '@/contracts';

/**
 * Hook to fetch signal data for a specific ticker
 * @param ticker - Stock ticker symbol (null will skip fetching)
 * @returns SWR response with signal data
 */
export function useSignal(ticker: string | null) {
  return useSWR<BaseSignal>(
    ticker ? `signal-${ticker}` : null,
    ticker ? () => getSignal(ticker).then((res) => res.data) : null
  );
}
