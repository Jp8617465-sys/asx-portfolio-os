import useSWR from 'swr';
import { getSignalReasoning } from '../api/signals-api';
import type { SignalReasoning } from '@/contracts';

/**
 * Hook to fetch signal reasoning/explanation for a specific ticker
 * @param ticker - Stock ticker symbol (null will skip fetching)
 * @returns SWR response with signal reasoning data
 */
export function useSignalReasoning(ticker: string | null) {
  return useSWR<SignalReasoning>(
    ticker ? `reasoning-${ticker}` : null,
    ticker ? () => getSignalReasoning(ticker).then((res) => res.data) : null
  );
}
