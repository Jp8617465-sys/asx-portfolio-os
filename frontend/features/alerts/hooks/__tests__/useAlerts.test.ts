import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { SWRConfig } from 'swr';
import { useAlerts, useAlertHistory, useAlertActions } from '../useAlerts';
import {
  getAlerts,
  createAlert,
  updateAlert,
  deleteAlert,
  getAlertHistory,
} from '../../api/alerts-api';
import type { Alert, AlertHistoryEntry, CreateAlertPayload } from '@/contracts';

// Mock the alerts API
jest.mock('../../api/alerts-api', () => ({
  getAlerts: jest.fn(),
  createAlert: jest.fn(),
  updateAlert: jest.fn(),
  deleteAlert: jest.fn(),
  getAlertHistory: jest.fn(),
}));

const mockedGetAlerts = getAlerts as jest.MockedFunction<typeof getAlerts>;
const mockedCreateAlert = createAlert as jest.MockedFunction<typeof createAlert>;
const mockedUpdateAlert = updateAlert as jest.MockedFunction<typeof updateAlert>;
const mockedDeleteAlert = deleteAlert as jest.MockedFunction<typeof deleteAlert>;
const mockedGetAlertHistory = getAlertHistory as jest.MockedFunction<typeof getAlertHistory>;

// SWR wrapper for cache isolation
const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(
    SWRConfig,
    { value: { provider: () => new Map(), dedupingInterval: 0 } },
    children
  );

const mockAlerts: Alert[] = [
  {
    id: 1,
    userId: 1,
    symbol: 'CBA.AX',
    alertType: 'PRICE_ABOVE',
    threshold: 105.5,
    status: 'active',
    notificationChannel: 'email',
    createdAt: '2026-02-01T10:00:00Z',
  },
  {
    id: 2,
    userId: 1,
    symbol: 'BHP.AX',
    alertType: 'PRICE_BELOW',
    threshold: 42.0,
    status: 'triggered',
    notificationChannel: 'push',
    createdAt: '2026-02-02T10:00:00Z',
    triggeredAt: '2026-02-03T14:00:00Z',
  },
];

const mockHistory: AlertHistoryEntry[] = [
  {
    id: 1,
    alertId: 2,
    symbol: 'BHP.AX',
    alertType: 'PRICE_BELOW',
    threshold: 42.0,
    triggeredAt: '2026-02-03T14:00:00Z',
    priceAtTrigger: 41.5,
    notificationSent: true,
  },
];

describe('useAlerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return alerts data on successful fetch', async () => {
    mockedGetAlerts.mockResolvedValue({
      data: { status: 'ok', count: 2, alerts: mockAlerts },
    } as any);

    const { result } = renderHook(() => useAlerts(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.alerts).toEqual(mockAlerts);
    expect(result.current.count).toBe(2);
    expect(result.current.error).toBeUndefined();
  });

  it('should return loading state initially', () => {
    mockedGetAlerts.mockReturnValue(new Promise(() => {}) as any);

    const { result } = renderHook(() => useAlerts(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.alerts).toEqual([]);
    expect(result.current.count).toBe(0);
  });

  it('should handle API errors', async () => {
    const error = new Error('Failed to fetch alerts');
    mockedGetAlerts.mockRejectedValue(error);

    const { result } = renderHook(() => useAlerts(), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.alerts).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('should return empty arrays when no data', async () => {
    mockedGetAlerts.mockResolvedValue({
      data: { status: 'ok', count: 0, alerts: [] },
    } as any);

    const { result } = renderHook(() => useAlerts(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.alerts).toEqual([]);
    expect(result.current.count).toBe(0);
  });
});

describe('useAlertHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return history data on successful fetch', async () => {
    mockedGetAlertHistory.mockResolvedValue({
      data: { status: 'ok', count: 1, history: mockHistory },
    } as any);

    const { result } = renderHook(() => useAlertHistory(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.history).toEqual(mockHistory);
    expect(result.current.count).toBe(1);
    expect(result.current.error).toBeUndefined();
  });

  it('should handle API errors for history', async () => {
    mockedGetAlertHistory.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAlertHistory(), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.history).toEqual([]);
  });
});

describe('useAlertActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create an alert and revalidate', async () => {
    const newAlert: Alert = {
      ...mockAlerts[0],
      id: 3,
      symbol: 'WBC.AX',
    };

    mockedCreateAlert.mockResolvedValue({ data: newAlert } as any);
    mockedGetAlerts.mockResolvedValue({
      data: { status: 'ok', count: 0, alerts: [] },
    } as any);

    const { result } = renderHook(() => useAlertActions(), { wrapper });

    const payload: CreateAlertPayload = {
      symbol: 'WBC.AX',
      alertType: 'PRICE_ABOVE',
      threshold: 25.0,
    };

    let created: Alert | undefined;
    await act(async () => {
      created = await result.current.create(payload);
    });

    expect(mockedCreateAlert).toHaveBeenCalledWith(payload);
    expect(created).toEqual(newAlert);
  });

  it('should update an alert and revalidate', async () => {
    const updatedAlert: Alert = {
      ...mockAlerts[0],
      threshold: 110.0,
    };

    mockedUpdateAlert.mockResolvedValue({ data: updatedAlert } as any);
    mockedGetAlerts.mockResolvedValue({
      data: { status: 'ok', count: 0, alerts: [] },
    } as any);

    const { result } = renderHook(() => useAlertActions(), { wrapper });

    let updated: Alert | undefined;
    await act(async () => {
      updated = await result.current.update(1, { threshold: 110.0 });
    });

    expect(mockedUpdateAlert).toHaveBeenCalledWith(1, { threshold: 110.0 });
    expect(updated).toEqual(updatedAlert);
  });

  it('should remove an alert and revalidate', async () => {
    mockedDeleteAlert.mockResolvedValue({ data: { success: true } } as any);
    mockedGetAlerts.mockResolvedValue({
      data: { status: 'ok', count: 0, alerts: [] },
    } as any);

    const { result } = renderHook(() => useAlertActions(), { wrapper });

    await act(async () => {
      await result.current.remove(1);
    });

    expect(mockedDeleteAlert).toHaveBeenCalledWith(1);
  });

  it('should propagate create errors', async () => {
    const error = new Error('Create failed');
    mockedCreateAlert.mockRejectedValue(error);

    const { result } = renderHook(() => useAlertActions(), { wrapper });

    await expect(
      act(async () => {
        await result.current.create({
          symbol: 'CBA.AX',
          alertType: 'PRICE_ABOVE',
          threshold: 100,
        });
      })
    ).rejects.toThrow('Create failed');
  });
});
