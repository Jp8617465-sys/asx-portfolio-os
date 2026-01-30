/**
 * Model B Dashboard Component Tests
 */

import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ModelBDashboard from '@/components/ModelBDashboard';

// Mock API client
jest.mock('@/lib/api-client', () => ({
  api: {
    getModelBSignals: jest.fn(() =>
      Promise.resolve({
        data: {
          signals: [
            {
              symbol: 'BHP.AX',
              signal: 'BUY',
              quality_score: 85,
              quality_grade: 'A',
              pe_ratio: 12.5,
              roe: 0.18,
              debt_to_equity: 0.4,
              confidence: 0.78,
            },
            {
              symbol: 'CBA.AX',
              signal: 'HOLD',
              quality_score: 72,
              quality_grade: 'B',
              pe_ratio: 15.2,
              roe: 0.14,
              debt_to_equity: 0.6,
              confidence: 0.65,
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
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ScatterChart: ({ children }: any) => <div data-testid="scatter-chart">{children}</div>,
  Scatter: () => null,
  Cell: () => null,
}));

describe('ModelBDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<ModelBDashboard />);
    expect(container).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    render(<ModelBDashboard />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('loads and displays Model B signals', async () => {
    render(<ModelBDashboard />);

    await waitFor(() => {
      expect(screen.getByText('BHP.AX')).toBeInTheDocument();
      expect(screen.getByText('CBA.AX')).toBeInTheDocument();
    });
  });

  it('displays quality grade distribution chart', async () => {
    render(<ModelBDashboard />);

    await waitFor(() => {
      const barChart = screen.getByTestId('bar-chart');
      expect(barChart).toBeInTheDocument();
    });
  });

  it('displays scatter plot for P/E vs ROE', async () => {
    render(<ModelBDashboard />);

    await waitFor(() => {
      const scatterChart = screen.getByTestId('scatter-chart');
      expect(scatterChart).toBeInTheDocument();
    });
  });

  it('shows quality scores correctly', async () => {
    render(<ModelBDashboard />);

    await waitFor(() => {
      // Grade A and B should be visible
      const grades = screen.getAllByText(/[AB]/);
      expect(grades.length).toBeGreaterThan(0);
    });
  });

  it('handles empty state gracefully', async () => {
    // Mock empty response
    const { api } = require('@/lib/api-client');
    api.getModelBSignals.mockResolvedValueOnce({
      data: { signals: [] },
    });

    render(<ModelBDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/no.*signal|no.*data/i)).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    // Mock API error
    const { api } = require('@/lib/api-client');
    api.getModelBSignals.mockRejectedValueOnce(new Error('API Error'));

    render(<ModelBDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/failed.*load|error/i)).toBeInTheDocument();
    });
  });

  it('displays fundamental metrics', async () => {
    render(<ModelBDashboard />);

    await waitFor(() => {
      // Should show P/E, ROE, or other metrics
      const metrics = screen.getAllByText(/P\/E|ROE|Quality/i);
      expect(metrics.length).toBeGreaterThan(0);
    });
  });
});
