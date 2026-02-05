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

describe('FusionDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<FusionDashboard />);
    expect(container).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    render(<FusionDashboard />);
    expect(screen.getByText(/loading.*portfolio.*fusion/i)).toBeInTheDocument();
  });

  it('loads and displays net worth', async () => {
    render(<FusionDashboard />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading.*portfolio.*fusion/i)).not.toBeInTheDocument();
    });

    // Currency values may be split across elements, use getAllByText
    const netWorthElements = screen.getAllByText(/100,000/);
    expect(netWorthElements.length).toBeGreaterThan(0);
  });

  it('shows total assets and liabilities', async () => {
    render(<FusionDashboard />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading.*portfolio.*fusion/i)).not.toBeInTheDocument();
    });

    // Currency values may be split across elements, use getAllByText
    const assetsElements = screen.getAllByText(/150,000/);
    expect(assetsElements.length).toBeGreaterThan(0);

    const liabilitiesElements = screen.getAllByText(/50,000/);
    expect(liabilitiesElements.length).toBeGreaterThan(0);
  });

  it('displays risk level badge', async () => {
    render(<FusionDashboard />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading.*portfolio.*fusion/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/MEDIUM/i)).toBeInTheDocument();
  });

  it('shows asset allocation pie chart section', async () => {
    render(<FusionDashboard />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading.*portfolio.*fusion/i)).not.toBeInTheDocument();
    });

    // Check for the chart section title instead of chart testid
    expect(screen.getByText('Asset Allocation')).toBeInTheDocument();
  });

  it('displays equities breakdown', async () => {
    render(<FusionDashboard />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading.*portfolio.*fusion/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText('Equities')).toBeInTheDocument();
    // Count value may appear multiple times, use getAllByText
    const countElements = screen.getAllByText(/10/);
    expect(countElements.length).toBeGreaterThan(0);
  });

  it('shows property breakdown', async () => {
    render(<FusionDashboard />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading.*portfolio.*fusion/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText('Property')).toBeInTheDocument();
  });

  it('displays loans information', async () => {
    render(<FusionDashboard />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading.*portfolio.*fusion/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText('Loans')).toBeInTheDocument();
    // Currency values may be split across elements, use getAllByText
    const paymentElements = screen.getAllByText(/1,500/);
    expect(paymentElements.length).toBeGreaterThan(0);
  });

  it('shows risk metrics', async () => {
    render(<FusionDashboard />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading.*portfolio.*fusion/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/Debt Service Ratio/i)).toBeInTheDocument();
    // DSR percentage may be formatted differently, use flexible matcher
    const dsrElements = screen.getAllByText(/25\.0/);
    expect(dsrElements.length).toBeGreaterThan(0);
  });

  it('displays leverage ratio', async () => {
    render(<FusionDashboard />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading.*portfolio.*fusion/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/Leverage Ratio/i)).toBeInTheDocument();
    // Leverage ratio may appear multiple times, use getAllByText
    const leverageElements = screen.getAllByText(/33\.33/);
    expect(leverageElements.length).toBeGreaterThan(0);
  });

  it('handles refresh button click', async () => {
    render(<FusionDashboard />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading.*portfolio.*fusion/i)).not.toBeInTheDocument();
    });

    const refreshButton = screen.getByText(/Refresh/i);
    fireEvent.click(refreshButton);

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

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading.*portfolio.*fusion/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/No.*data.*available/i)).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    const { api } = require('@/lib/api-client');
    api.getPortfolioFusion.mockRejectedValueOnce(new Error('API Error'));

    render(<FusionDashboard />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading.*portfolio.*fusion/i)).not.toBeInTheDocument();
    });

    // Component shows "No Portfolio Fusion Data Available" for errors
    expect(screen.getByText(/No Portfolio Fusion Data Available/i)).toBeInTheDocument();
  });

  it('displays last updated timestamp', async () => {
    render(<FusionDashboard />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading.*portfolio.*fusion/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/Last updated/i)).toBeInTheDocument();
  });

  // Additional coverage tests for business logic
  it('displays high risk badge when risk score above 60', async () => {
    const { api } = require('@/lib/api-client');
    api.getPortfolioFusion.mockResolvedValueOnce({
      data: {
        status: 'success',
        computed_at: '2024-01-31T10:00:00Z',
        summary: {
          total_assets: 150000,
          total_liabilities: 100000,
          net_worth: 50000,
          debt_service_ratio: 0.65,
          risk_score: 75,
        },
        equities: { value: 50000, count: 5, allocation_pct: 33.33 },
        property: { value: 100000, count: 1, allocation_pct: 66.67 },
        loans: { balance: 100000, count: 1, monthly_payment: 2500, allocation_pct: 66.67 },
      },
    });
    api.getPortfolioRisk.mockResolvedValueOnce({
      data: {
        status: 'success',
        risk_score: 75,
        risk_level: 'high',
        debt_service_ratio: 0.65,
        leverage_ratio: 66.67,
        metrics: { portfolio_volatility: 0.25, max_drawdown: 0.2 },
      },
    });

    render(<FusionDashboard />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading.*portfolio.*fusion/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/HIGH/i)).toBeInTheDocument();
  });

  it('calculates and displays correct asset allocation percentages', async () => {
    render(<FusionDashboard />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading.*portfolio.*fusion/i)).not.toBeInTheDocument();
    });

    // Verify allocation percentages are displayed (may appear multiple times)
    const equitiesPercent = screen.getAllByText(/66\.67/);
    expect(equitiesPercent.length).toBeGreaterThan(0);

    const propertyPercent = screen.getAllByText(/33\.33/);
    expect(propertyPercent.length).toBeGreaterThan(0);
  });

  it('displays loan monthly payment schedule correctly', async () => {
    render(<FusionDashboard />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading.*portfolio.*fusion/i)).not.toBeInTheDocument();
    });

    // Verify monthly payment is formatted correctly
    expect(screen.getByText(/\$1,500/)).toBeInTheDocument();
  });

  it('displays low risk badge when risk score below 40', async () => {
    const { api } = require('@/lib/api-client');
    api.getPortfolioFusion.mockResolvedValueOnce({
      data: {
        status: 'success',
        computed_at: '2024-01-31T10:00:00Z',
        summary: {
          total_assets: 200000,
          total_liabilities: 10000,
          net_worth: 190000,
          debt_service_ratio: 0.05,
          risk_score: 25,
        },
        equities: { value: 150000, count: 15, allocation_pct: 75.0 },
        property: { value: 50000, count: 1, allocation_pct: 25.0 },
        loans: { balance: 10000, count: 1, monthly_payment: 500, allocation_pct: 5.0 },
      },
    });
    api.getPortfolioRisk.mockResolvedValueOnce({
      data: {
        status: 'success',
        risk_score: 25,
        risk_level: 'low',
        debt_service_ratio: 0.05,
        leverage_ratio: 5.0,
        metrics: { portfolio_volatility: 0.08, max_drawdown: 0.05 },
      },
    });

    render(<FusionDashboard />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading.*portfolio.*fusion/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/LOW/i)).toBeInTheDocument();
  });
});
