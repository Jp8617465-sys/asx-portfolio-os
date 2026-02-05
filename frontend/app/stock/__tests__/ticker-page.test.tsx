import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import StockDetailPage from '../[ticker]/page';

// Mock the signals API module
const mockGetSignal = jest.fn();
const mockGetSignalReasoning = jest.fn();

jest.mock('@/features/signals/api', () => ({
  getSignal: (ticker: string) => mockGetSignal(ticker),
  getSignalReasoning: (ticker: string) => mockGetSignalReasoning(ticker),
}));

// Mock the api-client module for remaining API calls
const mockGetWatchlist = jest.fn();
const mockAddToWatchlist = jest.fn();
const mockRemoveFromWatchlist = jest.fn();
const mockGetPriceHistory = jest.fn();
const mockGetAccuracy = jest.fn();

jest.mock('@/lib/api-client', () => ({
  api: {
    getWatchlist: () => mockGetWatchlist(),
    addToWatchlist: (ticker: string) => mockAddToWatchlist(ticker),
    removeFromWatchlist: (ticker: string) => mockRemoveFromWatchlist(ticker),
    getPriceHistory: (ticker: string, params: any) => mockGetPriceHistory(ticker, params),
    getAccuracy: (ticker: string) => mockGetAccuracy(ticker),
  },
}));

// Mock next/navigation
const mockBack = jest.fn();
jest.mock('next/navigation', () => ({
  useParams: () => ({ ticker: 'CBA.AX' }),
  useRouter: () => ({
    push: jest.fn(),
    back: mockBack,
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

// Mock signal feature components
jest.mock('@/features/signals', () => ({
  SignalBadge: function MockSignalBadge({
    signal,
    confidence,
  }: {
    signal: string;
    confidence?: number;
  }) {
    return (
      <span data-testid="signal-badge">
        {signal} {confidence && `(${confidence}%)`}
      </span>
    );
  },
  ConfidenceGauge: function MockConfidenceGauge({
    confidence,
    signal,
  }: {
    confidence: number;
    signal: string;
  }) {
    return (
      <div data-testid="confidence-gauge">
        <span data-testid="gauge-confidence">{confidence}%</span>
        <span data-testid="gauge-signal">{signal}</span>
      </div>
    );
  },
  ReasoningPanel: function MockReasoningPanel({ reasoning }: { reasoning: any }) {
    return <div data-testid="reasoning-panel">{reasoning.summary}</div>;
  },
  AccuracyDisplay: function MockAccuracyDisplay({ accuracy }: { accuracy: any }) {
    return <div data-testid="accuracy-display">Accuracy: {accuracy.accuracyRate}%</div>;
  },
}));

jest.mock('@/components/stock-chart', () => {
  return function MockStockChart({ ticker, data }: { ticker: string; data: any[] }) {
    return (
      <div data-testid="stock-chart">
        <span data-testid="chart-ticker">{ticker}</span>
        <span data-testid="chart-data-count">{data.length}</span>
      </div>
    );
  };
});

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  TrendingUp: () => <span data-testid="trending-up">TrendingUp</span>,
  TrendingDown: () => <span data-testid="trending-down">TrendingDown</span>,
  Bookmark: () => <span data-testid="bookmark">Bookmark</span>,
  BookmarkCheck: () => <span data-testid="bookmark-check">BookmarkCheck</span>,
  AlertCircle: () => <span data-testid="alert-circle">AlertCircle</span>,
  ArrowLeft: () => <span data-testid="arrow-left">ArrowLeft</span>,
}));

// Mock additional components
jest.mock('@/components/FundamentalsTab', () => {
  return function MockFundamentalsTab({ ticker }: { ticker: string }) {
    return <div data-testid="fundamentals-tab">Fundamentals for {ticker}</div>;
  };
});

// Mock model feature components
jest.mock('@/features/models', () => ({
  ModelComparisonPanel: function MockModelComparisonPanel({ ticker }: { ticker: string }) {
    return <div data-testid="model-comparison-panel">Model Comparison for {ticker}</div>;
  },
}));

// Sample signal data
const mockSignalData = {
  ticker: 'CBA.AX',
  companyName: 'Commonwealth Bank',
  signal: 'BUY',
  confidence: 78,
  lastPrice: 102.45,
  priceChange: 2.5,
  priceChangeAmount: 2.56,
  lastUpdated: '2026-02-04T10:00:00Z',
};

const mockReasoningData = {
  summary: 'Strong fundamentals and positive momentum',
  factors: [
    { name: 'Technical', score: 0.8 },
    { name: 'Fundamental', score: 0.7 },
  ],
};

const mockWatchlistData = [{ ticker: 'BHP.AX' }, { ticker: 'FMG.AX' }];

// Generate mock price history data
const mockPriceHistoryData = {
  data: Array.from({ length: 91 }, (_, i) => ({
    date: new Date(Date.now() - (90 - i) * 24 * 60 * 60 * 1000).toISOString(),
    open: 100 + Math.random() * 10,
    high: 105 + Math.random() * 10,
    low: 95 + Math.random() * 10,
    close: 100 + Math.random() * 10,
    volume: Math.floor(Math.random() * 1000000),
  })),
};

const mockAccuracyData = {
  overall_accuracy: 0.708,
  signals_analyzed: 50,
  by_signal: {
    BUY: { count: 20, correct: 15, accuracy: 0.75 },
    SELL: { count: 15, correct: 10, accuracy: 0.67 },
    HOLD: { count: 15, correct: 11, accuracy: 0.73 },
  },
};

describe('StockDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    // Set default mocks for price history and accuracy
    mockGetPriceHistory.mockResolvedValue({ data: mockPriceHistoryData });
    mockGetAccuracy.mockResolvedValue({ data: mockAccuracyData });
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
    (console.warn as jest.Mock).mockRestore();
  });

  describe('Loading State', () => {
    it('shows loading skeleton initially', async () => {
      let resolveSignal: (value: any) => void;
      const signalPromise = new Promise((resolve) => {
        resolveSignal = resolve;
      });
      mockGetSignal.mockReturnValue(signalPromise);
      mockGetSignalReasoning.mockResolvedValue({ data: mockReasoningData });
      mockGetWatchlist.mockResolvedValue({ data: mockWatchlistData });

      const { container } = render(<StockDetailPage />);

      // Check for loading skeletons
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);

      resolveSignal!({ data: mockSignalData });
      await waitFor(() => {
        expect(container.querySelectorAll('.animate-pulse').length).toBe(0);
      });
    });

    it('renders header and footer during loading', async () => {
      let resolveSignal: (value: any) => void;
      const signalPromise = new Promise((resolve) => {
        resolveSignal = resolve;
      });
      mockGetSignal.mockReturnValue(signalPromise);

      render(<StockDetailPage />);

      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('footer')).toBeInTheDocument();

      resolveSignal!({ data: mockSignalData });
      await waitFor(() => {
        // CBA.AX appears in both h1 and chart - use getAllByText
        expect(screen.getAllByText('CBA.AX').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error State', () => {
    it('displays error message when signal API fails', async () => {
      mockGetSignal.mockRejectedValue(new Error('Network error'));

      render(<StockDetailPage />);

      await waitFor(() => {
        expect(
          screen.getByText('Failed to load stock data. Please try again.')
        ).toBeInTheDocument();
      });
    });

    it('displays Go Back button in error state', async () => {
      mockGetSignal.mockRejectedValue(new Error('Network error'));

      render(<StockDetailPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
      });
    });

    it('Go Back button calls router.back()', async () => {
      mockGetSignal.mockRejectedValue(new Error('Network error'));

      render(<StockDetailPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /go back/i }));
      });

      expect(mockBack).toHaveBeenCalled();
    });

    it('displays Stock not found when signal is null', async () => {
      mockGetSignal.mockResolvedValue({ data: null });

      render(<StockDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Stock not found')).toBeInTheDocument();
      });
    });

    it('displays AlertCircle icon in error state', async () => {
      mockGetSignal.mockRejectedValue(new Error('Network error'));

      render(<StockDetailPage />);

      await waitFor(() => {
        expect(screen.getByTestId('alert-circle')).toBeInTheDocument();
      });
    });
  });

  describe('Success State', () => {
    beforeEach(() => {
      mockGetSignal.mockResolvedValue({ data: mockSignalData });
      mockGetSignalReasoning.mockResolvedValue({ data: mockReasoningData });
      mockGetWatchlist.mockResolvedValue({ data: mockWatchlistData });
      // Mock price history with 91 data points for chart
      mockGetPriceHistory.mockResolvedValue({
        data: {
          data: Array.from({ length: 91 }, (_, i) => ({
            date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
            open: 100 + Math.random() * 5,
            high: 105 + Math.random() * 5,
            low: 95 + Math.random() * 5,
            close: 100 + Math.random() * 5,
            volume: 1000000,
          })),
        },
      });
      // Mock accuracy data
      mockGetAccuracy.mockResolvedValue({
        data: {
          signals_analyzed: 120,
          overall_accuracy: 0.708,
          by_signal: {
            BUY: { count: 50, correct: 35, accuracy: 0.7 },
            SELL: { count: 70, correct: 50, accuracy: 0.714 },
          },
        },
      });
    });

    it('renders header and footer', async () => {
      render(<StockDetailPage />);

      await waitFor(() => {
        expect(screen.getByTestId('header')).toBeInTheDocument();
        expect(screen.getByTestId('footer')).toBeInTheDocument();
      });
    });

    it('displays ticker and company name', async () => {
      render(<StockDetailPage />);

      await waitFor(() => {
        // CBA.AX appears in h1 and chart - use getAllByText
        expect(screen.getAllByText('CBA.AX').length).toBeGreaterThan(0);
        expect(screen.getByText('Commonwealth Bank')).toBeInTheDocument();
      });
    });

    it('displays stock price', async () => {
      render(<StockDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('$102.45')).toBeInTheDocument();
      });
    });

    it('displays price change with positive styling', async () => {
      render(<StockDetailPage />);

      await waitFor(() => {
        // Positive change shows + prefix and TrendingUp icon
        expect(screen.getByText(/\+2\.50%/)).toBeInTheDocument();
        expect(screen.getByTestId('trending-up')).toBeInTheDocument();
      });
    });

    it('displays SignalBadge with signal and confidence', async () => {
      render(<StockDetailPage />);

      await waitFor(() => {
        expect(screen.getByTestId('signal-badge')).toBeInTheDocument();
        expect(screen.getByTestId('signal-badge')).toHaveTextContent('BUY');
        expect(screen.getByTestId('signal-badge')).toHaveTextContent('78%');
      });
    });

    it('renders ConfidenceGauge with correct props', async () => {
      render(<StockDetailPage />);

      await waitFor(() => {
        expect(screen.getByTestId('confidence-gauge')).toBeInTheDocument();
        expect(screen.getByTestId('gauge-confidence')).toHaveTextContent('78%');
        expect(screen.getByTestId('gauge-signal')).toHaveTextContent('BUY');
      });
    });

    it('renders StockChart with ticker and data', async () => {
      render(<StockDetailPage />);

      await waitFor(() => {
        expect(screen.getByTestId('stock-chart')).toBeInTheDocument();
        expect(screen.getByTestId('chart-ticker')).toHaveTextContent('CBA.AX');
        // Mock generates 91 data points (90 days)
        expect(screen.getByTestId('chart-data-count')).toHaveTextContent('91');
      });
    });

    it('renders ReasoningPanel when reasoning is available', async () => {
      render(<StockDetailPage />);

      await waitFor(() => {
        expect(screen.getByTestId('reasoning-panel')).toBeInTheDocument();
        expect(screen.getByTestId('reasoning-panel')).toHaveTextContent(
          'Strong fundamentals and positive momentum'
        );
      });
    });

    it('renders AccuracyDisplay', async () => {
      render(<StockDetailPage />);

      await waitFor(() => {
        expect(screen.getByTestId('accuracy-display')).toBeInTheDocument();
        expect(screen.getByTestId('accuracy-display')).toHaveTextContent('70.8%');
      });
    });
  });

  describe('Back Button', () => {
    beforeEach(() => {
      mockGetSignal.mockResolvedValue({ data: mockSignalData });
      mockGetSignalReasoning.mockResolvedValue({ data: mockReasoningData });
      mockGetWatchlist.mockResolvedValue({ data: mockWatchlistData });
    });

    it('displays Back button', async () => {
      render(<StockDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Back')).toBeInTheDocument();
      });
    });

    it('displays ArrowLeft icon', async () => {
      render(<StockDetailPage />);

      await waitFor(() => {
        expect(screen.getByTestId('arrow-left')).toBeInTheDocument();
      });
    });

    it('Back button calls router.back()', async () => {
      render(<StockDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Back')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Back'));
      expect(mockBack).toHaveBeenCalled();
    });
  });

  describe('Watchlist Toggle', () => {
    it('shows Add to Watchlist button when not in watchlist', async () => {
      mockGetSignal.mockResolvedValue({ data: mockSignalData });
      mockGetSignalReasoning.mockResolvedValue({ data: mockReasoningData });
      mockGetWatchlist.mockResolvedValue({ data: [] }); // Empty watchlist

      render(<StockDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Add to Watchlist')).toBeInTheDocument();
        expect(screen.getByTestId('bookmark')).toBeInTheDocument();
      });
    });

    it('shows In Watchlist button when already in watchlist', async () => {
      mockGetSignal.mockResolvedValue({ data: mockSignalData });
      mockGetSignalReasoning.mockResolvedValue({ data: mockReasoningData });
      mockGetWatchlist.mockResolvedValue({
        data: [{ ticker: 'CBA.AX' }], // CBA is in watchlist
      });

      render(<StockDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('In Watchlist')).toBeInTheDocument();
        expect(screen.getByTestId('bookmark-check')).toBeInTheDocument();
      });
    });

    it('adds to watchlist when clicking Add button', async () => {
      mockGetSignal.mockResolvedValue({ data: mockSignalData });
      mockGetSignalReasoning.mockResolvedValue({ data: mockReasoningData });
      mockGetWatchlist.mockResolvedValue({ data: [] });
      mockAddToWatchlist.mockResolvedValue({});

      render(<StockDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Add to Watchlist')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Add to Watchlist'));

      await waitFor(() => {
        expect(mockAddToWatchlist).toHaveBeenCalledWith('CBA.AX');
        expect(screen.getByText('In Watchlist')).toBeInTheDocument();
      });
    });

    it('removes from watchlist when clicking In Watchlist button', async () => {
      mockGetSignal.mockResolvedValue({ data: mockSignalData });
      mockGetSignalReasoning.mockResolvedValue({ data: mockReasoningData });
      mockGetWatchlist.mockResolvedValue({ data: [{ ticker: 'CBA.AX' }] });
      mockRemoveFromWatchlist.mockResolvedValue({});

      render(<StockDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('In Watchlist')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('In Watchlist'));

      await waitFor(() => {
        expect(mockRemoveFromWatchlist).toHaveBeenCalledWith('CBA.AX');
        expect(screen.getByText('Add to Watchlist')).toBeInTheDocument();
      });
    });

    it('shows alert on watchlist toggle failure', async () => {
      mockGetSignal.mockResolvedValue({ data: mockSignalData });
      mockGetSignalReasoning.mockResolvedValue({ data: mockReasoningData });
      mockGetWatchlist.mockResolvedValue({ data: [] });
      mockAddToWatchlist.mockRejectedValue(new Error('Failed'));

      const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});

      render(<StockDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Add to Watchlist')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Add to Watchlist'));

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Failed to update watchlist');
      });

      mockAlert.mockRestore();
    });
  });

  describe('Reasoning unavailable', () => {
    it('does not render ReasoningPanel when reasoning fails', async () => {
      mockGetSignal.mockResolvedValue({ data: mockSignalData });
      mockGetSignalReasoning.mockRejectedValue(new Error('Not available'));
      mockGetWatchlist.mockResolvedValue({ data: [] });

      render(<StockDetailPage />);

      await waitFor(() => {
        // CBA.AX appears in h1 and chart
        expect(screen.getAllByText('CBA.AX').length).toBeGreaterThan(0);
      });

      expect(screen.queryByTestId('reasoning-panel')).not.toBeInTheDocument();
    });
  });

  describe('Negative Price Change', () => {
    it('displays TrendingDown icon for negative price change', async () => {
      const negativeSignal = {
        ...mockSignalData,
        priceChange: -2.5,
        priceChangeAmount: -2.56,
      };
      mockGetSignal.mockResolvedValue({ data: negativeSignal });
      mockGetSignalReasoning.mockResolvedValue({ data: mockReasoningData });
      mockGetWatchlist.mockResolvedValue({ data: [] });

      render(<StockDetailPage />);

      await waitFor(() => {
        expect(screen.getByTestId('trending-down')).toBeInTheDocument();
        expect(screen.getByText(/-2\.50%/)).toBeInTheDocument();
      });
    });
  });

  describe('Watchlist check failure', () => {
    it('defaults to not in watchlist when check fails', async () => {
      mockGetSignal.mockResolvedValue({ data: mockSignalData });
      mockGetSignalReasoning.mockResolvedValue({ data: mockReasoningData });
      mockGetWatchlist.mockRejectedValue(new Error('Watchlist error'));

      render(<StockDetailPage />);

      await waitFor(() => {
        // Should still render the page - CBA.AX appears in h1 and chart
        expect(screen.getAllByText('CBA.AX').length).toBeGreaterThan(0);
        // Default to not in watchlist
        expect(screen.getByText('Add to Watchlist')).toBeInTheDocument();
      });
    });
  });
});
