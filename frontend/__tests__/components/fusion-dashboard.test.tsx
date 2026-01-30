/**
 * Fusion Dashboard Component Tests
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FusionDashboard from '@/components/FusionDashboard';

// Mock API client
jest.mock('@/lib/api-client', () => ({
  api: {
    getPortfolioFusion: jest.fn(() =>
      Promise.resolve({
        data: {
          status: 'success',
          computed_at: '2024-01-31T10:00:00Z',
          summary: {
            total_assets: 150000,
            total_liabilities: 50000,
            net_worth: 100000,
            debt_service_ratio: 0.25,
            risk_score: 35,
          },
          equities: {
            value: 100000,
            count: 10,
            allocation_pct: 66.67,
          },
          property: {
            value: 50000,
            count: 1,
            allocation_pct: 33.33,
          },
          loans: {
            balance: 50000,
            count: 1,
            monthly_payment: 1500,
            allocation_pct: 33.33,
          },
        },
      })
    ),
    getPortfolioRisk: jest.fn(() =>
      Promise.resolve({
        data: {
          status: 'success',
          risk_score: 35,
          risk_level: 'medium',
          debt_service_ratio: 0.25,
          leverage_ratio: 33.33,
          metrics: {
            portfolio_volatility: 0.15,
            max_drawdown: 0.12,
          },
        },
      })
    ),
    getPortfolioAllocation: jest.fn(() =>
      Promise.resolve({
        data: {
          status: 'success',
          total_assets: 150000,
          asset_classes: [
            {
              name: 'Equities',
              value: 100000,
              percentage: 66.67,
            },
            {
              name: 'Property',
              value: 50000,
              percentage: 33.33,
            },
          ],
        },
      })
    ),
    refreshPortfolioFusion: jest.fn(() => Promise.resolve({ data: { status: 'success' } })),
  },
}));

// Mock recharts
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

describe('FusionDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container} = render(<FusionDashboard />);
    expect(container).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    render(<FusionDashboard />);
    expect(screen.getByText(/loading.*fusion/i)).toBeInTheDocument();
  });

  it('loads and displays net worth', async () => {
    render(<FusionDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/\\$100,000/)).toBeInTheDocument();
    });
  });

  it('shows total assets and liabilities', async () => {
    render(<FusionDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/\\$150,000/)).toBeInTheDocument(); // Total assets
      expect(screen.getByText(/\\$50,000/)).toBeInTheDocument(); // Total liabilities
    });
  });

  it('displays risk level badge', async () => {
    render(<FusionDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/MEDIUM/i)).toBeInTheDocument();
    });
  });

  it('shows asset allocation pie chart', async () => {
    render(<FusionDashboard />);

    await waitFor(() => {
      const pieChart = screen.getByTestId('pie-chart');
      expect(pieChart).toBeInTheDocument();
    });
  });

  it('displays equities breakdown', async () => {
    render(<FusionDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Equities')).toBeInTheDocument();
      expect(screen.getByText(/10/)).toBeInTheDocument(); // Count
    });
  });

  it('shows property breakdown', async () => {
    render(<FusionDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Property')).toBeInTheDocument();
    });
  });

  it('displays loans information', async () => {
    render(<FusionDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Loans')).toBeInTheDocument();
      expect(screen.getByText(/\\$1,500/)).toBeInTheDocument(); // Monthly payment
    });
  });

  it('shows risk metrics', async () => {
    render(<FusionDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Debt Service Ratio/i)).toBeInTheDocument();
      expect(screen.getByText(/25\\.00%/)).toBeInTheDocument();
    });
  });

  it('displays leverage ratio', async () => {
    render(<FusionDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Leverage Ratio/i)).toBeInTheDocument();
      expect(screen.getByText(/33\\.33%/)).toBeInTheDocument();
    });
  });

  it('handles refresh button click', async () => {
    render(<FusionDashboard />);

    await waitFor(() => {
      const refreshButton = screen.getByText(/Refresh/i);
      fireEvent.click(refreshButton);
    });

    const { api } = require('@/lib/api-client');
    expect(api.refreshPortfolioFusion).toHaveBeenCalled();
  });

  it('handles no data state gracefully', async () => {
    const { api } = require('@/lib/api-client');
    api.getPortfolioFusion.mockResolvedValueOnce({
      data: {
        status: 'no_data',
        message: 'No portfolio fusion data available',
      },
    });

    render(<FusionDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/No.*data.*available/i)).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    const { api } = require('@/lib/api-client');
    api.getPortfolioFusion.mockRejectedValueOnce(new Error('API Error'));

    render(<FusionDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/failed|error/i)).toBeInTheDocument();
    });
  });

  it('displays last updated timestamp', async () => {
    render(<FusionDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Last updated/i)).toBeInTheDocument();
    });
  });
});
