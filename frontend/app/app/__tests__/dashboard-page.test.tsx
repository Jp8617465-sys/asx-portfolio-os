import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import DashboardPage from '../dashboard/page';

// Mock the api-client module
const mockGetWatchlist = jest.fn();
const mockRemoveFromWatchlist = jest.fn();
jest.mock('@/lib/api-client', () => ({
  api: {
    getWatchlist: () => mockGetWatchlist(),
    removeFromWatchlist: (ticker: string) => mockRemoveFromWatchlist(ticker),
  },
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

jest.mock('@/components/watchlist-table', () => {
  return function MockWatchlistTable({
    data,
    onRemove,
    isLoading,
  }: {
    data: any[];
    onRemove: (ticker: string) => void;
    isLoading: boolean;
  }) {
    return (
      <div data-testid="watchlist-table">
        <span data-testid="watchlist-count">{data.length}</span>
        <span data-testid="watchlist-loading">{isLoading.toString()}</span>
        {data.map((item) => (
          <div key={item.ticker} data-testid={`watchlist-item-${item.ticker}`}>
            <span>{item.ticker}</span>
            <button onClick={() => onRemove(item.ticker)} data-testid={`remove-${item.ticker}`}>
              Remove
            </button>
          </div>
        ))}
      </div>
    );
  };
});

jest.mock('@/components/signal-badge', () => {
  return function MockSignalBadge({ signal, size }: { signal: string; size: string }) {
    return <span data-testid="signal-badge">{signal}</span>;
  };
});

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  TrendingUp: () => <span data-testid="trending-up">TrendingUp</span>,
  TrendingDown: () => <span data-testid="trending-down">TrendingDown</span>,
  Activity: () => <span data-testid="activity-icon">Activity</span>,
  AlertCircle: () => <span data-testid="alert-circle">AlertCircle</span>,
}));

// Sample watchlist data
const mockWatchlistData = [
  {
    ticker: 'CBA.AX',
    companyName: 'Commonwealth Bank',
    signal: 'BUY',
    confidence: 75,
    lastPrice: 100,
    priceChange: 2.5,
    priceChangeAmount: 2.5,
  },
  {
    ticker: 'BHP.AX',
    companyName: 'BHP Group',
    signal: 'STRONG_BUY',
    confidence: 85,
    lastPrice: 45,
    priceChange: 3.5,
    priceChangeAmount: 1.57,
  },
  {
    ticker: 'FMG.AX',
    companyName: 'Fortescue Metals',
    signal: 'STRONG_SELL',
    confidence: 78,
    lastPrice: 20,
    priceChange: -4.2,
    priceChangeAmount: -0.84,
  },
];

describe('DashboardPage', () => {
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
    it('shows loading indicators initially', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockGetWatchlist.mockReturnValue(promise);

      render(<DashboardPage />);

      // Check for loading indicators in stats
      expect(screen.getAllByText('...').length).toBeGreaterThan(0);

      // Resolve and cleanup
      resolvePromise!({ data: { data: [] } });
      await waitFor(() => {
        expect(screen.queryByText('...')).not.toBeInTheDocument();
      });
    });

    it('shows loading skeletons for top signals', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockGetWatchlist.mockReturnValue(promise);

      const { container } = render(<DashboardPage />);

      // Check for animate-pulse skeletons
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);

      resolvePromise!({ data: { data: [] } });
      await waitFor(() => {
        expect(container.querySelectorAll('.animate-pulse').length).toBe(0);
      });
    });
  });

  describe('Error State', () => {
    it('displays error message when API fails', async () => {
      mockGetWatchlist.mockRejectedValue(new Error('Network error'));

      render(<DashboardPage />);

      await waitFor(() => {
        expect(
          screen.getByText('Failed to load dashboard data. Please try again.')
        ).toBeInTheDocument();
      });
    });

    it('displays AlertCircle icon in error state', async () => {
      mockGetWatchlist.mockRejectedValue(new Error('Network error'));

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId('alert-circle')).toBeInTheDocument();
      });
    });
  });

  describe('Success State', () => {
    it('renders header and footer', async () => {
      mockGetWatchlist.mockResolvedValue({ data: { data: mockWatchlistData } });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId('header')).toBeInTheDocument();
        expect(screen.getByTestId('footer')).toBeInTheDocument();
      });
    });

    it('displays page title and subtitle', async () => {
      mockGetWatchlist.mockResolvedValue({ data: { data: mockWatchlistData } });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(
          screen.getByText('Monitor your watchlist and discover top AI-powered signals')
        ).toBeInTheDocument();
      });
    });

    it('renders watchlist table with data', async () => {
      mockGetWatchlist.mockResolvedValue({ data: { data: mockWatchlistData } });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId('watchlist-table')).toBeInTheDocument();
        expect(screen.getByTestId('watchlist-count')).toHaveTextContent('3');
      });
    });
  });

  describe('Stats Calculation', () => {
    it('displays stats card labels', async () => {
      mockGetWatchlist.mockResolvedValue({ data: { data: mockWatchlistData } });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Watchlist Stocks')).toBeInTheDocument();
        expect(screen.getByText('Strong Signals')).toBeInTheDocument();
        expect(screen.getByText('Avg Confidence')).toBeInTheDocument();
        expect(screen.getByText('Big Movers Today')).toBeInTheDocument();
      });
    });

    it('calculates average confidence correctly', async () => {
      mockGetWatchlist.mockResolvedValue({ data: { data: mockWatchlistData } });

      render(<DashboardPage />);

      await waitFor(() => {
        // Avg = (75 + 85 + 78) / 3 = 79.33 → rounded to 79%
        expect(screen.getByText('79%')).toBeInTheDocument();
      });
    });

    it('handles empty watchlist', async () => {
      mockGetWatchlist.mockResolvedValue({ data: { data: [] } });

      render(<DashboardPage />);

      await waitFor(() => {
        // All stats should be 0 - use watchlist-count to verify
        expect(screen.getByTestId('watchlist-count')).toHaveTextContent('0');
      });
    });

    it('handles null data in response', async () => {
      mockGetWatchlist.mockResolvedValue({ data: { data: null } });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId('watchlist-count')).toHaveTextContent('0');
      });
    });
  });

  describe('Top Signals Section', () => {
    it('displays Top Signals Today heading', async () => {
      mockGetWatchlist.mockResolvedValue({ data: { data: mockWatchlistData } });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Top Signals Today')).toBeInTheDocument();
      });
    });

    it('renders mock top signals cards', async () => {
      mockGetWatchlist.mockResolvedValue({ data: { data: mockWatchlistData } });

      render(<DashboardPage />);

      await waitFor(() => {
        // Tickers appear in both top signals and watchlist table
        expect(screen.getAllByText('BHP.AX').length).toBeGreaterThan(0);
        expect(screen.getAllByText('CBA.AX').length).toBeGreaterThan(0);
        expect(screen.getAllByText('FMG.AX').length).toBeGreaterThan(0);
      });
    });

    it('renders company names in top signals', async () => {
      mockGetWatchlist.mockResolvedValue({ data: { data: mockWatchlistData } });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('BHP Group')).toBeInTheDocument();
        expect(screen.getByText('Commonwealth Bank')).toBeInTheDocument();
        expect(screen.getByText('Fortescue Metals')).toBeInTheDocument();
      });
    });

    it('clicking on top signal navigates to stock page', async () => {
      mockGetWatchlist.mockResolvedValue({ data: { data: mockWatchlistData } });

      render(<DashboardPage />);

      await waitFor(() => {
        // BHP.AX appears in both top signals and watchlist
        expect(screen.getAllByText('BHP.AX').length).toBeGreaterThan(0);
      });

      // Find the button (top signals are buttons, watchlist items are not)
      const bhpButtons = screen.getAllByText('BHP.AX');
      const bhpButton = bhpButtons.find((el) => el.closest('button'))?.closest('button');
      fireEvent.click(bhpButton!);

      expect(mockPush).toHaveBeenCalledWith('/stock/BHP.AX');
    });
  });

  describe('Watchlist Section', () => {
    it('displays Your Watchlist heading', async () => {
      mockGetWatchlist.mockResolvedValue({ data: { data: mockWatchlistData } });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Your Watchlist')).toBeInTheDocument();
      });
    });

    it('passes isLoading to WatchlistTable', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockGetWatchlist.mockReturnValue(promise);

      render(<DashboardPage />);

      // While loading
      expect(screen.getByTestId('watchlist-loading')).toHaveTextContent('true');

      resolvePromise!({ data: { data: mockWatchlistData } });

      await waitFor(() => {
        expect(screen.getByTestId('watchlist-loading')).toHaveTextContent('false');
      });
    });
  });

  describe('Remove from Watchlist', () => {
    it('removes item from watchlist on button click', async () => {
      mockGetWatchlist.mockResolvedValue({ data: { data: mockWatchlistData } });
      mockRemoveFromWatchlist.mockResolvedValue({});

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId('watchlist-item-CBA.AX')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('remove-CBA.AX'));

      await waitFor(() => {
        expect(mockRemoveFromWatchlist).toHaveBeenCalledWith('CBA.AX');
      });
    });

    it('updates stats after removing from watchlist', async () => {
      mockGetWatchlist.mockResolvedValue({ data: { data: mockWatchlistData } });
      mockRemoveFromWatchlist.mockResolvedValue({});

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId('watchlist-count')).toHaveTextContent('3'); // Initial count
      });

      fireEvent.click(screen.getByTestId('remove-CBA.AX'));

      await waitFor(() => {
        // Item removed from local state
        expect(screen.queryByTestId('watchlist-item-CBA.AX')).not.toBeInTheDocument();
      });
    });

    it('shows alert on remove failure', async () => {
      mockGetWatchlist.mockResolvedValue({ data: { data: mockWatchlistData } });
      mockRemoveFromWatchlist.mockRejectedValue(new Error('Delete failed'));

      // Mock alert
      const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId('watchlist-item-CBA.AX')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('remove-CBA.AX'));

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Failed to remove stock from watchlist');
      });

      mockAlert.mockRestore();
    });
  });

  describe('Icons', () => {
    it('displays Activity icons in stats cards', async () => {
      mockGetWatchlist.mockResolvedValue({ data: { data: mockWatchlistData } });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getAllByTestId('activity-icon').length).toBeGreaterThan(0);
      });
    });

    it('displays TrendingUp icon in Strong Signals card', async () => {
      mockGetWatchlist.mockResolvedValue({ data: { data: mockWatchlistData } });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getAllByTestId('trending-up').length).toBeGreaterThan(0);
      });
    });

    it('displays TrendingDown icon in Big Movers card', async () => {
      mockGetWatchlist.mockResolvedValue({ data: { data: mockWatchlistData } });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId('trending-down')).toBeInTheDocument();
      });
    });
  });
});
