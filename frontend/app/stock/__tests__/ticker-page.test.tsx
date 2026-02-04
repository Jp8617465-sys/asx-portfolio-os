import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import StockDetailPage from '../[ticker]/page';

// Mock the api-client module
const mockGetSignal = jest.fn();
const mockGetSignalReasoning = jest.fn();
const mockGetWatchlist = jest.fn();
const mockAddToWatchlist = jest.fn();
const mockRemoveFromWatchlist = jest.fn();

jest.mock('@/lib/api-client', () => ({
  api: {
    getSignal: (ticker: string) => mockGetSignal(ticker),
    getSignalReasoning: (ticker: string) => mockGetSignalReasoning(ticker),
    getWatchlist: () => mockGetWatchlist(),
    addToWatchlist: (ticker: string) => mockAddToWatchlist(ticker),
    removeFromWatchlist: (ticker: string) => mockRemoveFromWatchlist(ticker),
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

jest.mock('@/components/confidence-gauge', () => {
  return function MockConfidenceGauge({
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
  };
});

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

jest.mock('@/components/reasoning-panel', () => {
  return function MockReasoningPanel({ reasoning }: { reasoning: any }) {
    return <div data-testid="reasoning-panel">{reasoning.summary}</div>;
  };
});

jest.mock('@/components/accuracy-display', () => {
  return function MockAccuracyDisplay({ accuracy }: { accuracy: any }) {
    return <div data-testid="accuracy-display">Accuracy: {accuracy.accuracyRate}%</div>;
  };
});

jest.mock('@/components/signal-badge', () => {
  return function MockSignalBadge({ signal, confidence }: { signal: string; confidence?: number }) {
    return (
      <span data-testid="signal-badge">
        {signal} {confidence && `(${confidence}%)`}
      </span>
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

describe('StockDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
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
      mockGetSignalReasoning.mockResolvedValue({ data: { data: mockReasoningData } });
      mockGetWatchlist.mockResolvedValue({ data: { data: mockWatchlistData } });

      const { container } = render(<StockDetailPage />);

      // Check for loading skeletons
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);

      resolveSignal!({ data: { data: mockSignalData } });
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

      resolveSignal!({ data: { data: mockSignalData } });
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
      mockGetSignal.mockResolvedValue({ data: { data: null } });

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
      mockGetSignal.mockResolvedValue({ data: { data: mockSignalData } });
      mockGetSignalReasoning.mockResolvedValue({ data: { data: mockReasoningData } });
      mockGetWatchlist.mockResolvedValue({ data: { data: mockWatchlistData } });
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
      mockGetSignal.mockResolvedValue({ data: { data: mockSignalData } });
      mockGetSignalReasoning.mockResolvedValue({ data: { data: mockReasoningData } });
      mockGetWatchlist.mockResolvedValue({ data: { data: mockWatchlistData } });
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
      mockGetSignal.mockResolvedValue({ data: { data: mockSignalData } });
      mockGetSignalReasoning.mockResolvedValue({ data: { data: mockReasoningData } });
      mockGetWatchlist.mockResolvedValue({ data: { data: [] } }); // Empty watchlist

      render(<StockDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Add to Watchlist')).toBeInTheDocument();
        expect(screen.getByTestId('bookmark')).toBeInTheDocument();
      });
    });

    it('shows In Watchlist button when already in watchlist', async () => {
      mockGetSignal.mockResolvedValue({ data: { data: mockSignalData } });
      mockGetSignalReasoning.mockResolvedValue({ data: { data: mockReasoningData } });
      mockGetWatchlist.mockResolvedValue({
        data: { data: [{ ticker: 'CBA.AX' }] }, // CBA is in watchlist
      });

      render(<StockDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('In Watchlist')).toBeInTheDocument();
        expect(screen.getByTestId('bookmark-check')).toBeInTheDocument();
      });
    });

    it('adds to watchlist when clicking Add button', async () => {
      mockGetSignal.mockResolvedValue({ data: { data: mockSignalData } });
      mockGetSignalReasoning.mockResolvedValue({ data: { data: mockReasoningData } });
      mockGetWatchlist.mockResolvedValue({ data: { data: [] } });
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
      mockGetSignal.mockResolvedValue({ data: { data: mockSignalData } });
      mockGetSignalReasoning.mockResolvedValue({ data: { data: mockReasoningData } });
      mockGetWatchlist.mockResolvedValue({ data: { data: [{ ticker: 'CBA.AX' }] } });
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
      mockGetSignal.mockResolvedValue({ data: { data: mockSignalData } });
      mockGetSignalReasoning.mockResolvedValue({ data: { data: mockReasoningData } });
      mockGetWatchlist.mockResolvedValue({ data: { data: [] } });
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
      mockGetSignal.mockResolvedValue({ data: { data: mockSignalData } });
      mockGetSignalReasoning.mockRejectedValue(new Error('Not available'));
      mockGetWatchlist.mockResolvedValue({ data: { data: [] } });

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
      mockGetSignal.mockResolvedValue({ data: { data: negativeSignal } });
      mockGetSignalReasoning.mockResolvedValue({ data: { data: mockReasoningData } });
      mockGetWatchlist.mockResolvedValue({ data: { data: [] } });

      render(<StockDetailPage />);

      await waitFor(() => {
        expect(screen.getByTestId('trending-down')).toBeInTheDocument();
        expect(screen.getByText(/-2\.50%/)).toBeInTheDocument();
      });
    });
  });

  describe('Watchlist check failure', () => {
    it('defaults to not in watchlist when check fails', async () => {
      mockGetSignal.mockResolvedValue({ data: { data: mockSignalData } });
      mockGetSignalReasoning.mockResolvedValue({ data: { data: mockReasoningData } });
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
