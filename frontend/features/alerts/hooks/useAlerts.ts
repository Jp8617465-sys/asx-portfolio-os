import useSWR, { useSWRConfig } from 'swr';
import {
  getAlerts,
  createAlert,
  deleteAlert,
  updateAlert,
  getAlertHistory,
} from '../api/alerts-api';
import type { CreateAlertPayload } from '@/contracts';

export function useAlerts() {
  const { data, error, isLoading, mutate } = useSWR('alerts', async () => {
    const res = await getAlerts();
    return res.data;
  });

  return {
    alerts: data?.alerts ?? [],
    count: data?.count ?? 0,
    error,
    isLoading,
    mutate,
  };
}

export function useAlertHistory() {
  const { data, error, isLoading } = useSWR('alert-history', async () => {
    const res = await getAlertHistory();
    return res.data;
  });

  return {
    history: data?.history ?? [],
    count: data?.count ?? 0,
    error,
    isLoading,
  };
}

export function useAlertActions() {
  const { mutate } = useSWRConfig();

  return {
    create: async (payload: CreateAlertPayload) => {
      const res = await createAlert(payload);
      mutate('alerts');
      return res.data;
    },
    update: async (id: number, updates: Partial<CreateAlertPayload>) => {
      const res = await updateAlert(id, updates);
      mutate('alerts');
      return res.data;
    },
    remove: async (id: number) => {
      await deleteAlert(id);
      mutate('alerts');
    },
  };
}
