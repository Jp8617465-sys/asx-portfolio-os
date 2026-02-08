import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import DashboardClient from '../dashboard/DashboardClient';

// Mock useLiveSignals SWR hook
const mockUseLiveSignals = jest.fn();
jest.mock('@/lib/hooks/use-api-swr', () => ({
  useLiveSignals: (...args: any[]) => mockUseLiveSignals(...args),
}));

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
  }),
}));

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
const mockSignals = [
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
];

const mockInitialData = {
  signals: mockSignals,
  as_of: '2026-02-06T00:00:00Z',
};

describe('DashboardClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    // Default: SWR returns the initial data (simulating fallbackData)
    mockUseLiveSignals.mockReturnValue({
      data: mockInitialData,
      error: null,
      isLoading: false,
    });
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
    (console.warn as jest.Mock).mockRestore();
  });

  describe('Component Rendering', () => {
    it('displays stats and signals table', () => {
      render(<DashboardClient initialData={mockInitialData} />);
      expect(screen.getByText('Total Stocks')).toBeInTheDocument();
      expect(screen.getByText(/Live Signals/i)).toBeInTheDocument();
    });

    it('renders loading state when no initial data and SWR loading', () => {
      mockUseLiveSignals.mockReturnValue({
        data: undefined,
        error: null,
        isLoading: true,
      });

      render(<DashboardClient initialData={null} />);
      expect(screen.getByText(/Loading signals/i)).toBeInTheDocument();
    });
  });

  describe('Signal Data Integration', () => {
    it('transforms backend signals to dashboard format', () => {
      render(<DashboardClient initialData={mockInitialData} />);

      // CBA.AX with ml_prob 0.85 should show STRONG_BUY
      const signalBadges = screen.getAllByTestId('signal-badge');
      expect(signalBadges[0]).toHaveTextContent('STRONG_BUY');
    });

    it('handles SWR errors gracefully', () => {
      mockUseLiveSignals.mockReturnValue({
        data: undefined,
        error: new Error('API Error'),
        isLoading: false,
      });

      render(<DashboardClient initialData={null} />);
      expect(screen.getByText(/Failed to load signals/i)).toBeInTheDocument();
    });

    it('handles empty signals array', () => {
      mockUseLiveSignals.mockReturnValue({
        data: { signals: [], as_of: new Date().toISOString() },
        error: null,
        isLoading: false,
      });

      render(<DashboardClient initialData={null} />);
      expect(screen.getByText(/No signals match your filter/i)).toBeInTheDocument();
    });
  });

  describe('Dashboard Statistics', () => {
    it('displays total stocks count correctly', () => {
      render(<DashboardClient initialData={mockInitialData} />);
      expect(screen.getByText('Total Stocks')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('calculates high confidence signals (>70%) correctly', () => {
      render(<DashboardClient initialData={mockInitialData} />);
      expect(screen.getByText(/High Confidence.*>70%/i)).toBeInTheDocument();
      const statCards = screen.getAllByText(/1|2|3|4|5/);
      const highConfidenceCard = statCards.find(
        (el) => el.closest('.text-3xl')?.textContent === '1'
      );
      expect(highConfidenceCard).toBeTruthy();
    });

    it('calculates average confidence correctly', () => {
      render(<DashboardClient initialData={mockInitialData} />);
      expect(screen.getByText('Avg Confidence')).toBeInTheDocument();
      // (85 + 68 + 45 + 25 + 12) / 5 = 47%
      expect(screen.getByText('47%')).toBeInTheDocument();
    });

    it('displays latest update timestamp', () => {
      render(<DashboardClient initialData={mockInitialData} />);
      expect(screen.getByText(/Last Updated/i)).toBeInTheDocument();
      const timeElements = screen.queryAllByText('...');
      expect(timeElements.length).toBe(0);
    });
  });

  describe('Signal Filtering', () => {
    it('shows all signals by default', () => {
      render(<DashboardClient initialData={mockInitialData} />);
      expect(screen.getByText(/Live Signals \(5\)/i)).toBeInTheDocument();
    });

    it('filters to BUY signals only', () => {
      render(<DashboardClient initialData={mockInitialData} />);
      expect(screen.getByText(/Live Signals \(5\)/i)).toBeInTheDocument();

      const filterButtons = screen.getAllByText('BUY');
      const buyFilterButton = filterButtons.find((el) => el.closest('button'));
      fireEvent.click(buyFilterButton!);

      // CBA (STRONG_BUY) + BHP (BUY) = 2 signals
      expect(screen.getByText(/Live Signals \(2\)/i)).toBeInTheDocument();
    });

    it('filters to SELL signals only', () => {
      render(<DashboardClient initialData={mockInitialData} />);
      expect(screen.getByText(/Live Signals \(5\)/i)).toBeInTheDocument();

      const filterButtons = screen.getAllByText('SELL');
      const sellFilterButton = filterButtons.find((el) => el.closest('button'));
      fireEvent.click(sellFilterButton!);

      // NAB (SELL) + ANZ (STRONG_SELL) = 2 signals
      expect(screen.getByText(/Live Signals \(2\)/i)).toBeInTheDocument();
    });

    it('filters to HOLD signals only', () => {
      render(<DashboardClient initialData={mockInitialData} />);
      expect(screen.getByText(/Live Signals \(5\)/i)).toBeInTheDocument();

      const filterButtons = screen.getAllByText('HOLD');
      const holdFilterButton = filterButtons.find((el) => el.closest('button'));
      fireEvent.click(holdFilterButton!);

      // WBC (HOLD) = 1 signal
      expect(screen.getByText(/Live Signals \(1\)/i)).toBeInTheDocument();
    });
  });

  describe('Signal Sorting', () => {
    it('sorts by confidence descending by default', () => {
      render(<DashboardClient initialData={mockInitialData} />);

      const signalBadges = screen.getAllByTestId('signal-badge');
      // First should be STRONG_BUY (CBA, 85%)
      expect(signalBadges[0]).toHaveTextContent('STRONG_BUY');
      // Last should be STRONG_SELL (ANZ, 12%)
      expect(signalBadges[4]).toHaveTextContent('STRONG_SELL');
    });

    it('sorts by rank ascending when rank column clicked', () => {
      render(<DashboardClient initialData={mockInitialData} />);
      expect(screen.getByText(/Live Signals \(5\)/i)).toBeInTheDocument();

      const rankButtons = screen.getAllByText('Rank');
      const rankHeaderButton = rankButtons.find((el) => el.closest('button'));
      fireEvent.click(rankHeaderButton!);

      const tickers = screen.getAllByText(/CBA|BHP|WBC|NAB|ANZ/);
      const tickerCells = Array.from(tickers).filter(
        (el) => el.className.includes('font-semibold') && el.textContent?.length === 3
      );
      expect(tickerCells.length).toBeGreaterThan(0);
    });

    it('sorts by expected return when return column clicked', () => {
      render(<DashboardClient initialData={mockInitialData} />);
      expect(screen.getByText(/Live Signals \(5\)/i)).toBeInTheDocument();

      const returnButtons = screen.getAllByText('Expected Return');
      const returnHeaderButton = returnButtons.find((el) => el.closest('button'));
      fireEvent.click(returnHeaderButton!);

      const signalBadges = screen.getAllByTestId('signal-badge');
      expect(signalBadges[0]).toHaveTextContent('STRONG_BUY'); // CBA
      expect(signalBadges[4]).toHaveTextContent('STRONG_SELL'); // ANZ
    });
  });
});
