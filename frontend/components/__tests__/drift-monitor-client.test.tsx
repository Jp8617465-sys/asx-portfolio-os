import { render, screen, waitFor } from '@testing-library/react';
import DriftMonitorClient from '../DriftMonitorClient';

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

function mockJsonResponse(data: any, ok = true, status = 200) {
  return {
    ok,
    status,
    json: jest.fn().mockResolvedValue(data),
  };
}

const healthyData = {
  status: 'ok',
  last_check: new Date().toISOString(),
  summary: {
    total_features: 20,
    features_with_drift: 0,
    features_with_warning: 2,
    features_stable: 18,
    max_psi_score: 0.05,
  },
  drift_alerts: [],
  warning_alerts: [{ feature_name: 'rsi_14', psi_score: 0.12, status: 'WARNING' }],
  trend: [{ date: new Date().toISOString(), avg_psi: 0.04, max_psi: 0.1, drift_count: 0 }],
};

const criticalData = {
  ...healthyData,
  summary: {
    ...healthyData.summary,
    features_with_drift: 5,
    features_stable: 13,
    max_psi_score: 0.45,
  },
  drift_alerts: [
    { feature_name: 'volume_ratio', psi_score: 0.45, status: 'DRIFT' },
    { feature_name: 'close_price', psi_score: 0.32, status: 'DRIFT' },
  ],
};

beforeEach(() => {
  mockFetch.mockClear();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('DriftMonitorClient', () => {
  it('renders loading skeleton initially', () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse(healthyData));
    const { container } = render(<DriftMonitorClient />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders error message on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    render(<DriftMonitorClient />);
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('renders no_data warning when status is no_data', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ status: 'no_data' }));
    render(<DriftMonitorClient />);
    await waitFor(() => {
      expect(screen.getByText(/No drift monitoring data/i)).toBeInTheDocument();
    });
  });

  it('renders Healthy status when drift < 5%', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse(healthyData));
    render(<DriftMonitorClient />);
    await waitFor(() => {
      expect(screen.getByText('Healthy')).toBeInTheDocument();
    });
  });

  it('renders total features count', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse(healthyData));
    render(<DriftMonitorClient />);
    await waitFor(() => {
      expect(screen.getByText('20')).toBeInTheDocument();
    });
  });

  it('renders max PSI score', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse(healthyData));
    render(<DriftMonitorClient />);
    await waitFor(() => {
      expect(screen.getByText('0.050')).toBeInTheDocument();
    });
  });

  it('renders Critical status when drift >= 15%', async () => {
    // 5 / 20 = 25% > 15% → Critical
    mockFetch.mockResolvedValueOnce(mockJsonResponse(criticalData));
    render(<DriftMonitorClient />);
    await waitFor(() => {
      expect(screen.getByText('Critical')).toBeInTheDocument();
    });
  });

  it('renders drift alerts when present', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse(criticalData));
    render(<DriftMonitorClient />);
    await waitFor(() => {
      expect(screen.getByText('volume_ratio')).toBeInTheDocument();
      expect(screen.getByText('close_price')).toBeInTheDocument();
    });
  });

  it('renders warning alerts when present', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse(healthyData));
    render(<DriftMonitorClient />);
    await waitFor(() => {
      expect(screen.getByText('rsi_14')).toBeInTheDocument();
    });
  });

  it('renders the 7-Day Drift Trend section', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse(healthyData));
    render(<DriftMonitorClient />);
    await waitFor(() => {
      expect(screen.getByText('7-Day Drift Trend')).toBeInTheDocument();
    });
  });
});
