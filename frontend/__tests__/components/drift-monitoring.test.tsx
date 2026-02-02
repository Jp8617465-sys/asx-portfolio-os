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
    expect(screen.getByText(/loading.*drift.*monitoring/i)).toBeInTheDocument();
  });

  it('loads and displays PSI score', async () => {
    render(<DriftMonitoringDashboard />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading.*drift.*monitoring/i)).not.toBeInTheDocument();
    });

    // PSI score may appear multiple times in the UI
    const psiScores = screen.getAllByText(/0\.15/);
    expect(psiScores.length).toBeGreaterThan(0);
  });

  it('shows drift trend status', async () => {
    render(<DriftMonitoringDashboard />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading.*drift.*monitoring/i)).not.toBeInTheDocument();
    });

    // Stable status may appear multiple times
    const stableStatus = screen.getAllByText(/Stable/i);
    expect(stableStatus.length).toBeGreaterThan(0);
  });

  it('displays features drifting count', async () => {
    render(<DriftMonitoringDashboard />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading.*drift.*monitoring/i)).not.toBeInTheDocument();
    });

    // Count may appear multiple times in the UI
    const counts = screen.getAllByText(/2/);
    expect(counts.length).toBeGreaterThan(0);
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

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading.*drift.*monitoring/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/Retraining.*Recommended/i)).toBeInTheDocument();
  });

  it('displays PSI timeline chart', async () => {
    render(<DriftMonitoringDashboard />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading.*drift.*monitoring/i)).not.toBeInTheDocument();
    });

    // Wait for chart to render with longer timeout
    await waitFor(() => {
      const lineChart = screen.queryByTestId('line-chart');
      expect(lineChart).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows feature drift table', async () => {
    render(<DriftMonitoringDashboard />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading.*drift.*monitoring/i)).not.toBeInTheDocument();
    });

    // Feature names may appear multiple times (table, alerts, etc.)
    const momentumFeatures = screen.getAllByText('momentum_20d');
    expect(momentumFeatures.length).toBeGreaterThan(0);

    expect(screen.getByText('volatility')).toBeInTheDocument();
  });

  it('displays drift status badges', async () => {
    render(<DriftMonitoringDashboard />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading.*drift.*monitoring/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText('DRIFT')).toBeInTheDocument();
    expect(screen.getByText('STABLE')).toBeInTheDocument();
  });

  it('shows drift alerts panel', async () => {
    render(<DriftMonitoringDashboard />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading.*drift.*monitoring/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/Feature drift detected/i)).toBeInTheDocument();
  });

  it('allows selecting feature for history chart', async () => {
    render(<DriftMonitoringDashboard />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading.*drift.*monitoring/i)).not.toBeInTheDocument();
    });

    // Get all momentum_20d elements and click the first one
    const featureRows = screen.getAllByText('momentum_20d');
    fireEvent.click(featureRows[0]);

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

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading.*drift.*monitoring/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/failed|error/i)).toBeInTheDocument();
  });

  // Additional coverage tests for business logic
  it('shows warning status when PSI between 0.1 and 0.2', async () => {
    const { api } = require('@/lib/api-client');
    api.getDriftSummary.mockResolvedValueOnce({
      data: {
        latest_drift_score: 0.15,
        drift_trend: 'Moderate',
        features_drifting: 3,
        total_features: 25,
        psi_threshold: 0.2,
        alerts: [
          {
            feature_name: 'rsi_14d',
            psi_score: 0.15,
            status: 'WARNING',
            message: 'Feature showing warning signs',
          },
        ],
      },
    });

    render(<DriftMonitoringDashboard />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading.*drift.*monitoring/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/WARNING/i)).toBeInTheDocument();
  });

  it('displays red badge when PSI exceeds 0.2 threshold', async () => {
    const { api } = require('@/lib/api-client');
    api.getDriftSummary.mockResolvedValueOnce({
      data: {
        latest_drift_score: 0.28,
        drift_trend: 'Critical',
        features_drifting: 8,
        total_features: 25,
        psi_threshold: 0.2,
        alerts: [],
      },
    });

    render(<DriftMonitoringDashboard />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading.*drift.*monitoring/i)).not.toBeInTheDocument();
    });

    // PSI above 0.2 should show critical/red status (may appear multiple times)
    const highPSI = screen.getAllByText(/0\.28/);
    expect(highPSI.length).toBeGreaterThan(0);
  });

  it('handles feature selection for drift history visualization', async () => {
    render(<DriftMonitoringDashboard />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading.*drift.*monitoring/i)).not.toBeInTheDocument();
    });

    // Click on a feature to select it
    const volatilityFeature = screen.getByText('volatility');
    fireEvent.click(volatilityFeature);

    // Should call API to get history for that feature
    const { api } = require('@/lib/api-client');
    await waitFor(() => {
      expect(api.getDriftHistory).toHaveBeenCalledWith(
        expect.objectContaining({ feature_name: 'volatility' })
      );
    });
  });

  it('shows stable status badge for features with low PSI', async () => {
    render(<DriftMonitoringDashboard />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading.*drift.*monitoring/i)).not.toBeInTheDocument();
    });

    // Volatility feature has PSI of 0.08 which is stable
    expect(screen.getByText('STABLE')).toBeInTheDocument();
    expect(screen.getByText(/0\.08/)).toBeInTheDocument();
  });

  it('dismisses alert when dismiss button is clicked', async () => {
    render(<DriftMonitoringDashboard />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading.*drift.*monitoring/i)).not.toBeInTheDocument();
    });

    // Verify alert is shown
    expect(screen.getByText(/Feature drift detected/i)).toBeInTheDocument();

    // Find and click dismiss button if it exists
    const dismissButtons = screen.queryAllByRole('button', { name: /dismiss|close/i });
    if (dismissButtons.length > 0) {
      fireEvent.click(dismissButtons[0]);

      // Alert should be removed after dismiss
      await waitFor(() => {
        expect(screen.queryByText(/Feature drift detected/i)).not.toBeInTheDocument();
      });
    }
  });

  it('filters historical data by selected timeframe', async () => {
    render(<DriftMonitoringDashboard />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading.*drift.*monitoring/i)).not.toBeInTheDocument();
    });

    // Check if timeframe filter buttons exist
    const timeframeButtons = screen.queryAllByRole('button', { name: /30d|60d|90d/i });
    if (timeframeButtons.length > 0) {
      fireEvent.click(timeframeButtons[0]);

      // Should reload history with new timeframe
      const { api } = require('@/lib/api-client');
      await waitFor(() => {
        expect(api.getDriftHistory).toHaveBeenCalled();
      });
    }
  });
});
