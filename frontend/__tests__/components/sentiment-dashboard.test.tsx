/**
 * Sentiment Dashboard Component Tests
 */

import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SentimentDashboard from '@/components/SentimentDashboard';

// Mock API client
jest.mock('@/lib/api-client', () => ({
  api: {
    getModelCSignals: jest.fn(() =>
      Promise.resolve({
        data: {
          signals: [
            {
              symbol: 'BHP.AX',
              signal: 'BUY',
              confidence: 0.75,
              sentiment_score: 0.65,
              bullish_count: 5,
              bearish_count: 1,
              neutral_count: 2,
              event_types: ['earnings', 'guidance'],
            },
          ],
        },
      })
    ),
    get: jest.fn(() =>
      Promise.resolve({
        data: {
          distribution: {
            positive: 45,
            negative: 15,
            neutral: 40,
          },
          distribution_pct: {
            positive: 45,
            negative: 15,
            neutral: 40,
          },
          top_movers: [
            {
              symbol: 'BHP.AX',
              sentiment_score: 0.65,
              confidence: 0.75,
              bullish_count: 5,
              bearish_count: 1,
              signal: 'BUY',
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
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

describe('SentimentDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<SentimentDashboard />);
    expect(container).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    render(<SentimentDashboard />);
    expect(screen.getByText(/loading.*sentiment/i)).toBeInTheDocument();
  });

  it('loads and displays sentiment signals', async () => {
    render(<SentimentDashboard />);

    await waitFor(() => {
      expect(screen.getByText('BHP.AX')).toBeInTheDocument();
    });
  });

  it('displays sentiment distribution pie chart', async () => {
    render(<SentimentDashboard />);

    await waitFor(() => {
      const pieChart = screen.getByTestId('pie-chart');
      expect(pieChart).toBeInTheDocument();
    });
  });

  it('shows bullish and bearish counts', async () => {
    render(<SentimentDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/5.*bullish/i)).toBeInTheDocument();
      expect(screen.getByText(/1.*bearish/i)).toBeInTheDocument();
    });
  });

  it('displays sentiment percentages', async () => {
    render(<SentimentDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/45.*%/)).toBeInTheDocument(); // Positive %
    });
  });

  it('shows event types', async () => {
    render(<SentimentDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/earnings|guidance/i)).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    const { api } = require('@/lib/api-client');
    api.getModelCSignals.mockRejectedValueOnce(new Error('API Error'));

    render(<SentimentDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/failed|error/i)).toBeInTheDocument();
    });
  });

  it('displays total signal count', async () => {
    render(<SentimentDashboard />);

    await waitFor(() => {
      // Should show total number of signals
      expect(screen.getByText(/1/)).toBeInTheDocument();
    });
  });

  it('handles empty signals gracefully', async () => {
    const { api } = require('@/lib/api-client');
    api.getModelCSignals.mockResolvedValueOnce({
      data: { signals: [] },
    });

    render(<SentimentDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/no.*sentiment.*signal/i)).toBeInTheDocument();
    });
  });
});
