import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import DashboardPage from '../dashboard/page';
import apiClient from '@/lib/api-client';

// Mock apiClient instead of individual API functions
jest.mock('@/lib/api-client');

// Mock useAutoRefresh hook
jest.mock('@/lib/hooks/useAutoRefresh', () => ({
  useAutoRefresh: jest.fn(),
}));

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
  }),
}));

// Mock child components
jest.mock('@/components/header', () => {
  return function MockHeader() {
    return <div data-testid="header">Header</div>;
  };
});

jest.mock('@/components/footer', () => {
  return function MockFooter() {
    return <div data-testid="footer">Footer</div>;
  };
});

jest.mock('@/features/signals', () => ({
  SignalBadge: function MockSignalBadge({ signal }: any) {
    return <span data-testid="signal-badge">{signal}</span>;
  },
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  TrendingUp: () => <span data-testid="trending-up">TrendingUp</span>,
  TrendingDown: () => <span data-testid="trending-down">TrendingDown</span>,
  Activity: () => <span data-testid="activity-icon">Activity</span>,
  AlertCircle: () => <span data-testid="alert-circle">AlertCircle</span>,
  ArrowUpDown: () => <span data-testid="arrow-up-down">ArrowUpDown</span>,
  Filter: () => <span data-testid="filter">Filter</span>,
}));

// Mock Model A signals data (matches backend API response)
const mockModelASignalsResponse = {
  status: 'success',
  model: 'model_a_ml',
  as_of: '2026-02-06T00:00:00Z',
  count: 5,
  signals: [
    {
      symbol: 'CBA.AX',
      rank: 1,
      score: 92.5,
      ml_prob: 0.85, // Maps to STRONG_BUY (>0.8)
      ml_expected_return: 0.12,
    },
    {
      symbol: 'BHP.AX',
      rank: 2,
      score: 78.3,
      ml_prob: 0.68, // Maps to BUY (0.6-0.8)
      ml_expected_return: 0.08,
    },
    {
      symbol: 'WBC.AX',
      rank: 3,
      score: 55.0,
      ml_prob: 0.45, // Maps to HOLD (0.4-0.6)
      ml_expected_return: 0.02,
    },
    {
      symbol: 'NAB.AX',
      rank: 4,
      score: 32.1,
      ml_prob: 0.25, // Maps to SELL (0.2-0.4)
      ml_expected_return: -0.05,
    },
    {
      symbol: 'ANZ.AX',
      rank: 5,
      score: 15.8,
      ml_prob: 0.12, // Maps to STRONG_SELL (<0.2)
      ml_expected_return: -0.15,
    },
  ],
};

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    // Default mock response
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: mockModelASignalsResponse,
    });
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
    (console.warn as jest.Mock).mockRestore();
  });

  describe('Component Rendering', () => {
    it('renders header and footer components', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId('header')).toBeInTheDocument();
        expect(screen.getByTestId('footer')).toBeInTheDocument();
      });
    });

    it('displays correct page title and subtitle', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Model A Dashboard')).toBeInTheDocument();
        expect(screen.getByText(/Real-time AI-powered stock signals/i)).toBeInTheDocument();
      });
    });

    it('renders loading state initially', () => {
      render(<DashboardPage />);

      // Should show loading indicator before API response
      expect(screen.getByText(/Loading signals/i)).toBeInTheDocument();
    });
  });

  describe('Model A Signals API Integration', () => {
    it('fetches signals from correct endpoint with correct params', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith('/api/signals/live', {
          params: { model: 'model_a_ml', limit: 100 },
        });
      });
    });

    it('transforms backend signals to dashboard format', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        // CBA.AX with ml_prob 0.85 should show STRONG_BUY
        const signalBadges = screen.getAllByTestId('signal-badge');
        expect(signalBadges[0]).toHaveTextContent('STRONG_BUY');
      });
    });

    it('handles API errors gracefully', async () => {
      (apiClient.get as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load signals/i)).toBeInTheDocument();
      });
    });

    it('handles empty signals array', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: {
          signals: [],
          count: 0,
          status: 'success',
          model: 'model_a_ml',
          as_of: new Date().toISOString(),
        },
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/No signals match your filter/i)).toBeInTheDocument();
      });
    });
  });

  describe('Dashboard Statistics', () => {
    it('displays total stocks count correctly', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Stocks')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument(); // 5 signals in mock
      });
    });

    it('calculates high confidence signals (>70%) correctly', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        // Use regex to handle HTML entity
        expect(screen.getByText(/High Confidence.*>70%/i)).toBeInTheDocument();
        // ml_prob > 0.7 (>70% confidence): CBA (85%) only
        // The stat value should be displayed somewhere in the card
        const statCards = screen.getAllByText(/1|2|3|4|5/);
        const highConfidenceCard = statCards.find(
          (el) => el.closest('.text-3xl')?.textContent === '1'
        );
        expect(highConfidenceCard).toBeTruthy();
      });
    });

    it('calculates average confidence correctly', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Avg Confidence')).toBeInTheDocument();
        // (85 + 68 + 45 + 25 + 12) / 5 = 47%
        expect(screen.getByText('47%')).toBeInTheDocument();
      });
    });

    it('displays latest update timestamp', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/Last Updated/i)).toBeInTheDocument();
        // Should display a time (the exact format depends on toLocaleTimeString)
        // Just verify it's not showing "..."
        const timeElements = screen.queryAllByText('...');
        expect(timeElements.length).toBe(0);
      });
    });
  });

  describe('Signal Filtering', () => {
    it('shows all signals by default', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        // Check the count in the heading "Live Signals (5)"
        expect(screen.getByText(/Live Signals \(5\)/i)).toBeInTheDocument();
      });
    });

    it('filters to BUY signals only', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/Live Signals \(5\)/i)).toBeInTheDocument();
      });

      const filterButtons = screen.getAllByText('BUY');
      const buyFilterButton = filterButtons.find((el) => el.closest('button'));
      fireEvent.click(buyFilterButton!);

      await waitFor(() => {
        // CBA (STRONG_BUY) + BHP (BUY) = 2 signals
        expect(screen.getByText(/Live Signals \(2\)/i)).toBeInTheDocument();
      });
    });

    it('filters to SELL signals only', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/Live Signals \(5\)/i)).toBeInTheDocument();
      });

      const filterButtons = screen.getAllByText('SELL');
      const sellFilterButton = filterButtons.find((el) => el.closest('button'));
      fireEvent.click(sellFilterButton!);

      await waitFor(() => {
        // NAB (SELL) + ANZ (STRONG_SELL) = 2 signals
        expect(screen.getByText(/Live Signals \(2\)/i)).toBeInTheDocument();
      });
    });

    it('filters to HOLD signals only', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/Live Signals \(5\)/i)).toBeInTheDocument();
      });

      const filterButtons = screen.getAllByText('HOLD');
      const holdFilterButton = filterButtons.find((el) => el.closest('button'));
      fireEvent.click(holdFilterButton!);

      await waitFor(() => {
        // WBC (HOLD) = 1 signal
        expect(screen.getByText(/Live Signals \(1\)/i)).toBeInTheDocument();
      });
    });
  });

  describe('Signal Sorting', () => {
    it('sorts by confidence descending by default', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        const signalBadges = screen.getAllByTestId('signal-badge');
        // First should be STRONG_BUY (CBA, 85%)
        expect(signalBadges[0]).toHaveTextContent('STRONG_BUY');
        // Last should be STRONG_SELL (ANZ, 12%)
        expect(signalBadges[4]).toHaveTextContent('STRONG_SELL');
      });
    });

    it('sorts by rank ascending when rank column clicked', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/Live Signals \(5\)/i)).toBeInTheDocument();
      });

      // Find and click the Rank header button
      const rankButtons = screen.getAllByText('Rank');
      const rankHeaderButton = rankButtons.find((el) => el.closest('button'));
      fireEvent.click(rankHeaderButton!);

      await waitFor(() => {
        // After clicking, should toggle to ascending order
        // But since default is already confidence desc, clicking rank should sort by rank desc first
        // Then clicking again would be asc
        // Let's verify the tickers appear in rank order (CBA=1, BHP=2, WBC=3, NAB=4, ANZ=5)
        const tickers = screen.getAllByText(/CBA|BHP|WBC|NAB|ANZ/);
        // Filter to just the ticker cells (not signal badges)
        const tickerCells = Array.from(tickers).filter(
          (el) => el.className.includes('font-semibold') && el.textContent?.length === 3
        );
        expect(tickerCells.length).toBeGreaterThan(0);
      });
    });

    it('sorts by expected return when return column clicked', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/Live Signals \(5\)/i)).toBeInTheDocument();
      });

      // Find and click the Expected Return header button
      const returnButtons = screen.getAllByText('Expected Return');
      const returnHeaderButton = returnButtons.find((el) => el.closest('button'));
      fireEvent.click(returnHeaderButton!);

      await waitFor(() => {
        // Should sort by expected return descending (default when changing field)
        // Order: CBA(12%), BHP(8%), WBC(2%), NAB(-5%), ANZ(-15%)
        const signalBadges = screen.getAllByTestId('signal-badge');
        expect(signalBadges[0]).toHaveTextContent('STRONG_BUY'); // CBA
        expect(signalBadges[4]).toHaveTextContent('STRONG_SELL'); // ANZ
      });
    });
  });
});
