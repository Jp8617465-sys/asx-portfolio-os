import { apiClient } from '@/shared/api';
import type { Alert, CreateAlertPayload, AlertHistoryEntry } from '@/contracts';

export const getAlerts = () =>
  apiClient.get<{ status: string; count: number; alerts: Alert[] }>('/api/alerts');

export const createAlert = (payload: CreateAlertPayload) =>
  apiClient.post<Alert>('/api/alerts', payload);

export const updateAlert = (id: number, updates: Partial<CreateAlertPayload>) =>
  apiClient.put<Alert>(`/api/alerts/${id}`, updates);

export const deleteAlert = (id: number) =>
  apiClient.delete<{ success: boolean }>(`/api/alerts/${id}`);

export const getAlertHistory = () =>
  apiClient.get<{ status: string; count: number; history: AlertHistoryEntry[] }>(
    '/api/alerts/history'
  );
