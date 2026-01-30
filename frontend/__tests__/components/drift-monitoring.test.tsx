/**
 * Drift Monitoring Dashboard Component Tests
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DriftMonitoringDashboard from '@/components/DriftMonitoringDashboard';

// Mock API client
jest.mock('@/lib/api-client', () => ({
  api: {
    getDriftSummary: jest.fn(() =>
      Promise.resolve({
        data: {
          latest_drift_score: 0.15,
          drift_trend: 'Stable',
          features_drifting: 2,
          total_features: 25,
          last_audit_date: '2024-01-31',
          psi_threshold: 0.2,
          alerts: [
            {
              feature_name: 'momentum_20d',
              psi_score: 0.22,
              status: 'DRIFT',
              message: 'Feature drift detected',
            },
          ],
        },
      })
    ),
    getFeatureDrift: jest.fn(() =>
      Promise.resolve({
        data: {
          features: [
            {
              feature_name: 'momentum_20d',
              psi_score: 0.22,
              status: 'DRIFT',
              baseline_mean: 0.05,
              current_mean: 0.12,
              percent_change: 140,
              last_calculated: '2024-01-31',
            },
            {
              feature_name: 'volatility',
              psi_score: 0.08,
              status: 'STABLE',
              baseline_mean: 0.15,
              current_mean: 0.16,
              percent_change: 6.7,
              last_calculated: '2024-01-31',
            },
          ],
        },
      })
    ),
    getDriftHistory: jest.fn(() =>
      Promise.resolve({
        data: {
          history: [
            {
              date: '2024-01-01',
              feature_name: 'momentum_20d',
              psi_score: 0.10,
            },
            {
              date: '2024-01-15',
              feature_name: 'momentum_20d',
              psi_score: 0.18,
            },
          ],
        },
      })
    ),
  },
}));

// Mock recharts
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

describe('DriftMonitoringDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<DriftMonitoringDashboard />);
    expect(container).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    render(<DriftMonitoringDashboard />);
    expect(screen.getByText(/loading.*drift/i)).toBeInTheDocument();
  });

  it('loads and displays PSI score', async () => {
    render(<DriftMonitoringDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/0\.15/)).toBeInTheDocument();
    });
  });

  it('shows drift trend status', async () => {
    render(<DriftMonitoringDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Stable/i)).toBeInTheDocument();
    });
  });

  it('displays features drifting count', async () => {
    render(<DriftMonitoringDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/2/)).toBeInTheDocument(); // 2 features drifting
    });
  });

  it('shows retraining recommendation when PSI > 0.2', async () => {
    const { api } = require('@/lib/api-client');
    api.getDriftSummary.mockResolvedValueOnce({
      data: {
        latest_drift_score: 0.25, // Above threshold
        drift_trend: 'Increasing',
        features_drifting: 5,
        total_features: 25,
        psi_threshold: 0.2,
        alerts: [],
      },
    });

    render(<DriftMonitoringDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Retraining.*Recommended/i)).toBeInTheDocument();
    });
  });

  it('displays PSI timeline chart', async () => {
    render(<DriftMonitoringDashboard />);

    await waitFor(() => {
      const lineChart = screen.getByTestId('line-chart');
      expect(lineChart).toBeInTheDocument();
    });
  });

  it('shows feature drift table', async () => {
    render(<DriftMonitoringDashboard />);

    await waitFor(() => {
      expect(screen.getByText('momentum_20d')).toBeInTheDocument();
      expect(screen.getByText('volatility')).toBeInTheDocument();
    });
  });

  it('displays drift status badges', async () => {
    render(<DriftMonitoringDashboard />);

    await waitFor(() => {
      expect(screen.getByText('DRIFT')).toBeInTheDocument();
      expect(screen.getByText('STABLE')).toBeInTheDocument();
    });
  });

  it('shows drift alerts panel', async () => {
    render(<DriftMonitoringDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Feature drift detected/i)).toBeInTheDocument();
    });
  });

  it('allows selecting feature for history chart', async () => {
    render(<DriftMonitoringDashboard />);

    await waitFor(() => {
      const featureRow = screen.getByText('momentum_20d');
      fireEvent.click(featureRow);
    });

    // Should load history for selected feature
    const { api } = require('@/lib/api-client');
    expect(api.getDriftHistory).toHaveBeenCalledWith(
      expect.objectContaining({ feature_name: 'momentum_20d' })
    );
  });

  it('handles API errors gracefully', async () => {
    const { api } = require('@/lib/api-client');
    api.getDriftSummary.mockRejectedValueOnce(new Error('API Error'));

    render(<DriftMonitoringDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/failed|error/i)).toBeInTheDocument();
    });
  });
});
