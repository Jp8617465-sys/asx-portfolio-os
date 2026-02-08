import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PriceAlertsPage } from '../PriceAlertsPage';
import { useAlerts, useAlertHistory, useAlertActions } from '../../hooks/useAlerts';
import { useAlertStore } from '../../stores/alert-store';
import type { Alert, AlertHistoryEntry } from '@/contracts';

// Mock the hooks
jest.mock('../../hooks/useAlerts', () => ({
  useAlerts: jest.fn(),
  useAlertHistory: jest.fn(),
  useAlertActions: jest.fn(),
}));

jest.mock('../../stores/alert-store', () => ({
  useAlertStore: jest.fn(),
}));

const mockedUseAlerts = useAlerts as jest.MockedFunction<typeof useAlerts>;
const mockedUseAlertHistory = useAlertHistory as jest.MockedFunction<typeof useAlertHistory>;
const mockedUseAlertActions = useAlertActions as jest.MockedFunction<typeof useAlertActions>;
const mockedUseAlertStore = useAlertStore as jest.MockedFunction<typeof useAlertStore>;

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

const mockActions = {
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

const mockStoreState = {
  isCreateModalOpen: false,
  editingAlert: null,
  selectedSymbol: '',
  openCreateModal: jest.fn(),
  closeCreateModal: jest.fn(),
  openEditModal: jest.fn(),
  closeEditModal: jest.fn(),
};

describe('PriceAlertsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAlerts.mockReturnValue({
      alerts: mockAlerts,
      count: 2,
      error: undefined,
      isLoading: false,
      mutate: jest.fn(),
    });
    mockedUseAlertHistory.mockReturnValue({
      history: mockHistory,
      count: 1,
      error: undefined,
      isLoading: false,
    });
    mockedUseAlertActions.mockReturnValue(mockActions);
    mockedUseAlertStore.mockReturnValue(mockStoreState);
  });

  it('should render the page title', () => {
    render(<PriceAlertsPage />);
    expect(screen.getByText('Price Alerts')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    mockedUseAlerts.mockReturnValue({
      alerts: [],
      count: 0,
      error: undefined,
      isLoading: true,
      mutate: jest.fn(),
    });

    render(<PriceAlertsPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should show error state', () => {
    mockedUseAlerts.mockReturnValue({
      alerts: [],
      count: 0,
      error: new Error('Failed to fetch'),
      isLoading: false,
      mutate: jest.fn(),
    });

    render(<PriceAlertsPage />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should render alert cards for each alert', () => {
    render(<PriceAlertsPage />);
    expect(screen.getByText('CBA.AX')).toBeInTheDocument();
    // BHP.AX appears in both alert cards and history table, so use getAllByText
    const bhpElements = screen.getAllByText('BHP.AX');
    expect(bhpElements.length).toBeGreaterThanOrEqual(1);
  });

  it('should open create modal when Create Alert button is clicked', () => {
    render(<PriceAlertsPage />);

    const createButton = screen.getByRole('button', { name: /create alert/i });
    fireEvent.click(createButton);

    expect(mockStoreState.openCreateModal).toHaveBeenCalled();
  });

  it('should render history table section', () => {
    render(<PriceAlertsPage />);
    expect(screen.getByText(/alert history/i)).toBeInTheDocument();
  });

  it('should show empty state when no alerts', () => {
    mockedUseAlerts.mockReturnValue({
      alerts: [],
      count: 0,
      error: undefined,
      isLoading: false,
      mutate: jest.fn(),
    });

    render(<PriceAlertsPage />);
    expect(screen.getByText(/no alerts/i)).toBeInTheDocument();
  });

  it('should render create modal when isCreateModalOpen is true', () => {
    mockedUseAlertStore.mockReturnValue({
      ...mockStoreState,
      isCreateModalOpen: true,
    });

    render(<PriceAlertsPage />);
    // Modal should show form fields
    expect(screen.getByLabelText(/symbol/i)).toBeInTheDocument();
  });
});
