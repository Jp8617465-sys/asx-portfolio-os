import useSWR from 'swr';
import { getEnsembleSignalsLatest } from '../api/signals-api';

/**
 * Hook to fetch ensemble signals with optional filters
 * @param params - Optional parameters for limit and agreement filtering
 * @returns SWR response with ensemble signals data
 */
export function useEnsembleSignals(params?: { limit?: number; agreementOnly?: boolean }) {
  return useSWR(['ensemble-signals', params], () =>
    getEnsembleSignalsLatest(params?.limit, undefined, params?.agreementOnly).then((res) => res)
  );
}
