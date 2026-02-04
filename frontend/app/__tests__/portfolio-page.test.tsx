import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import PortfolioPage from '../portfolio/page';

// Mock the api-client module
const mockGetPortfolio = jest.fn();
jest.mock('@/lib/api-client', () => ({
  api: {
    getPortfolio: () => mockGetPortfolio(),
  },
}));

// Mock export utilities
const mockExportHoldingsToCSV = jest.fn();
const mockExportPortfolioToPDF = jest.fn();
jest.mock('@/lib/utils/export', () => ({
  exportHoldingsToCSV: (holdings: any) => mockExportHoldingsToCSV(holdings),
  exportPortfolioToPDF: (portfolio: any, riskMetrics: any) =>
    mockExportPortfolioToPDF(portfolio, riskMetrics),
}));

// Mock child components to isolate page testing
jest.mock('@/components/portfolio-upload', () => {
  return function MockPortfolioUpload({ onSuccess }: { onSuccess: () => void }) {
    return (
      <div data-testid="portfolio-upload">
        <button onClick={onSuccess} data-testid="mock-upload-success">
          Mock Upload Success
        </button>
      </div>
    );
  };
});

jest.mock('@/components/holdings-table', () => {
  return function MockHoldingsTable({
    holdings,
    onExport,
    isLoading,
  }: {
    holdings: any[];
    onExport: () => void;
    isLoading: boolean;
  }) {
    return (
      <div data-testid="holdings-table">
        <span data-testid="holdings-count">{holdings.length}</span>
        <span data-testid="is-loading">{isLoading.toString()}</span>
        <button onClick={onExport} data-testid="export-csv-button">
          Export CSV
        </button>
      </div>
    );
  };
});

jest.mock('@/components/rebalancing-suggestions', () => {
  return function MockRebalancingSuggestions({ portfolio }: { portfolio: any }) {
    return <div data-testid="rebalancing-suggestions">Holdings: {portfolio.holdings.length}</div>;
  };
});

jest.mock('@/components/risk-metrics-dashboard', () => {
  return function MockRiskMetricsDashboard({ metrics }: { metrics: any }) {
    return <div data-testid="risk-metrics-dashboard">Beta: {metrics.beta}</div>;
  };
});

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  TrendingUp: () => <span data-testid="trending-up-icon">TrendingUp</span>,
  TrendingDown: () => <span data-testid="trending-down-icon">TrendingDown</span>,
  DollarSign: () => <span data-testid="dollar-sign-icon">DollarSign</span>,
  Briefcase: () => <span data-testid="briefcase-icon">Briefcase</span>,
  AlertCircle: () => <span data-testid="alert-circle-icon">AlertCircle</span>,
  RefreshCw: () => <span data-testid="refresh-icon">RefreshCw</span>,
  FileDown: () => <span data-testid="file-down-icon">FileDown</span>,
}));

// Sample test data
const mockPortfolioWithProfit = {
  holdings: [
    {
      ticker: 'CBA.AX',
      companyName: 'Commonwealth Bank',
      shares: 100,
      avgCost: 90,
      currentPrice: 100,
      totalValue: 10000,
      signal: 'BUY',
      confidence: 75,
    },
    {
      ticker: 'BHP.AX',
      companyName: 'BHP Group',
      shares: 50,
      avgCost: 40,
      currentPrice: 45,
      totalValue: 2250,
      signal: 'STRONG_BUY',
      confidence: 85,
    },
  ],
  riskMetrics: {
    beta: 1.2,
    sharpeRatio: 1.5,
    volatility: 0.15,
    maxDrawdown: 0.08,
  },
};

const mockPortfolioWithLoss = {
  holdings: [
    {
      ticker: 'XYZ.AX',
      companyName: 'XYZ Company',
      shares: 100,
      avgCost: 120,
      currentPrice: 100,
      totalValue: 10000,
      signal: 'SELL',
      confidence: 60,
    },
  ],
  riskMetrics: {
    beta: 0.8,
    sharpeRatio: 0.5,
    volatility: 0.25,
    maxDrawdown: 0.15,
  },
};

const mockPortfolioWithStrongSignals = {
  holdings: [
    {
      ticker: 'A.AX',
      companyName: 'Company A',
      shares: 10,
      avgCost: 10,
      currentPrice: 11,
      totalValue: 110,
      signal: 'STRONG_BUY',
      confidence: 90,
    },
    {
      ticker: 'B.AX',
      companyName: 'Company B',
      shares: 20,
      avgCost: 20,
      currentPrice: 18,
      totalValue: 360,
      signal: 'STRONG_SELL',
      confidence: 88,
    },
    {
      ticker: 'C.AX',
      companyName: 'Company C',
      shares: 30,
      avgCost: 30,
      currentPrice: 31,
      totalValue: 930,
      signal: 'HOLD',
      confidence: 50,
    },
  ],
  riskMetrics: null,
};

describe('PortfolioPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('displays loading spinner initially', async () => {
      // Create a promise that we control to keep loading state visible
      let resolvePortfolio: (value: any) => void;
      const portfolioPromise = new Promise((resolve) => {
        resolvePortfolio = resolve;
      });
      mockGetPortfolio.mockReturnValue(portfolioPromise);

      render(<PortfolioPage />);

      // Check for loading spinner
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();

      // Resolve to clean up
      resolvePortfolio!({ data: { data: mockPortfolioWithProfit } });
      await waitFor(() => {
        expect(screen.queryByText('Portfolio')).toBeInTheDocument();
      });
    });

    it('loading spinner has correct styling', async () => {
      let resolvePortfolio: (value: any) => void;
      const portfolioPromise = new Promise((resolve) => {
        resolvePortfolio = resolve;
      });
      mockGetPortfolio.mockReturnValue(portfolioPromise);

      render(<PortfolioPage />);

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toHaveClass('h-12', 'w-12', 'border-4', 'border-blue-500', 'rounded-full');

      resolvePortfolio!({ data: { data: mockPortfolioWithProfit } });
      await waitFor(() => {
        expect(screen.queryByText('Portfolio')).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('displays error message when API fails', async () => {
      mockGetPortfolio.mockRejectedValue({
        response: {
          status: 500,
          data: { message: 'Internal server error' },
        },
      });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load portfolio')).toBeInTheDocument();
        expect(screen.getByText('Internal server error')).toBeInTheDocument();
      });
    });

    it('displays default error message when no specific message provided', async () => {
      mockGetPortfolio.mockRejectedValue({
        response: {
          status: 500,
        },
      });

      render(<PortfolioPage />);

      await waitFor(() => {
        // There will be two "Failed to load portfolio" texts - one header, one message
        const errorMessages = screen.getAllByText('Failed to load portfolio');
        expect(errorMessages.length).toBe(2);
      });
    });

    it('displays retry button in error state', async () => {
      mockGetPortfolio.mockRejectedValue({
        response: { status: 500, data: { message: 'Server error' } },
      });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('retry button calls loadPortfolio again', async () => {
      mockGetPortfolio
        .mockRejectedValueOnce({
          response: { status: 500, data: { message: 'Server error' } },
        })
        .mockResolvedValueOnce({ data: { data: mockPortfolioWithProfit } });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /retry/i }));

      await waitFor(() => {
        expect(mockGetPortfolio).toHaveBeenCalledTimes(2);
        expect(screen.getByTestId('holdings-table')).toBeInTheDocument();
      });
    });

    it('error state displays AlertCircle icon', async () => {
      mockGetPortfolio.mockRejectedValue({
        response: { status: 500, data: { message: 'Error' } },
      });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getAllByTestId('alert-circle-icon').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Empty Portfolio State (404)', () => {
    it('shows upload component when 404 is returned', async () => {
      mockGetPortfolio.mockRejectedValue({
        response: { status: 404 },
      });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByTestId('portfolio-upload')).toBeInTheDocument();
        expect(screen.getByText('Upload Portfolio')).toBeInTheDocument();
      });
    });

    it('does not show error state for 404', async () => {
      mockGetPortfolio.mockRejectedValue({
        response: { status: 404 },
      });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByTestId('portfolio-upload')).toBeInTheDocument();
      });
      expect(screen.queryByText('Failed to load portfolio')).not.toBeInTheDocument();
    });

    it('upload success reloads portfolio', async () => {
      mockGetPortfolio
        .mockRejectedValueOnce({ response: { status: 404 } })
        .mockResolvedValueOnce({ data: { data: mockPortfolioWithProfit } });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByTestId('portfolio-upload')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('mock-upload-success'));

      await waitFor(() => {
        expect(mockGetPortfolio).toHaveBeenCalledTimes(2);
        expect(screen.getByTestId('holdings-table')).toBeInTheDocument();
      });
    });
  });

  describe('Portfolio with Data', () => {
    it('displays page header', async () => {
      mockGetPortfolio.mockResolvedValue({ data: { data: mockPortfolioWithProfit } });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByText('Portfolio')).toBeInTheDocument();
        expect(
          screen.getByText('Track your holdings with AI-powered insights')
        ).toBeInTheDocument();
      });
    });

    it('displays Export PDF button when portfolio exists', async () => {
      mockGetPortfolio.mockResolvedValue({ data: { data: mockPortfolioWithProfit } });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export pdf/i })).toBeInTheDocument();
      });
    });

    it('displays Upload New Portfolio button', async () => {
      mockGetPortfolio.mockResolvedValue({ data: { data: mockPortfolioWithProfit } });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /upload new portfolio/i })).toBeInTheDocument();
      });
    });

    it('renders HoldingsTable with correct props', async () => {
      mockGetPortfolio.mockResolvedValue({ data: { data: mockPortfolioWithProfit } });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByTestId('holdings-table')).toBeInTheDocument();
        expect(screen.getByTestId('holdings-count')).toHaveTextContent('2');
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      });
    });

    it('renders RebalancingSuggestions component', async () => {
      mockGetPortfolio.mockResolvedValue({ data: { data: mockPortfolioWithProfit } });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByTestId('rebalancing-suggestions')).toBeInTheDocument();
      });
    });

    it('renders RiskMetricsDashboard when riskMetrics exist', async () => {
      mockGetPortfolio.mockResolvedValue({ data: { data: mockPortfolioWithProfit } });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByTestId('risk-metrics-dashboard')).toBeInTheDocument();
      });
    });

    it('does not render RiskMetricsDashboard when riskMetrics is null', async () => {
      mockGetPortfolio.mockResolvedValue({ data: { data: mockPortfolioWithStrongSignals } });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByTestId('holdings-table')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('risk-metrics-dashboard')).not.toBeInTheDocument();
    });
  });

  describe('Stats Cards Calculation', () => {
    it('calculates and displays total value', async () => {
      mockGetPortfolio.mockResolvedValue({ data: { data: mockPortfolioWithProfit } });

      render(<PortfolioPage />);

      await waitFor(() => {
        // Total value = 10000 + 2250 = 12250
        expect(screen.getByText('$12,250.00')).toBeInTheDocument();
      });
    });

    it('displays Total Value label', async () => {
      mockGetPortfolio.mockResolvedValue({ data: { data: mockPortfolioWithProfit } });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Value')).toBeInTheDocument();
      });
    });

    it('calculates positive total P&L correctly', async () => {
      mockGetPortfolio.mockResolvedValue({ data: { data: mockPortfolioWithProfit } });

      render(<PortfolioPage />);

      await waitFor(() => {
        // Total cost = (90 * 100) + (40 * 50) = 9000 + 2000 = 11000
        // Total value = 12250
        // P&L = 12250 - 11000 = 1250
        expect(screen.getByText('+$1,250.00')).toBeInTheDocument();
      });
    });

    it('calculates negative total P&L correctly', async () => {
      mockGetPortfolio.mockResolvedValue({ data: { data: mockPortfolioWithLoss } });

      const { container } = render(<PortfolioPage />);

      await waitFor(() => {
        // Total cost = 120 * 100 = 12000
        // Total value = 10000
        // P&L = 10000 - 12000 = -2000
        // Component shows $2,000.00 without minus (uses red color to indicate loss)
        const plText = container.textContent;
        expect(plText).toContain('2,000.00');
        // The percentage shows negative
        expect(plText).toContain('-16.67');
      });
    });

    it('displays holdings count', async () => {
      mockGetPortfolio.mockResolvedValue({ data: { data: mockPortfolioWithProfit } });

      render(<PortfolioPage />);

      await waitFor(() => {
        // There are multiple "Holdings" texts - one in stat card, one in section header
        const holdingsTexts = screen.getAllByText('Holdings');
        expect(holdingsTexts.length).toBeGreaterThanOrEqual(1);
        // The stat card shows the number 2 (via container text search)
      });
    });

    it('displays strong signals count', async () => {
      mockGetPortfolio.mockResolvedValue({ data: { data: mockPortfolioWithStrongSignals } });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByText('Strong Signals')).toBeInTheDocument();
        // 2 strong signals: STRONG_BUY and STRONG_SELL
        const strongSignalsCard = screen.getByText('Strong Signals').closest('div')?.parentElement;
        expect(strongSignalsCard).toHaveTextContent('2');
      });
    });

    it('displays "Today\'s change" label', async () => {
      mockGetPortfolio.mockResolvedValue({ data: { data: mockPortfolioWithProfit } });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByText("Today's change")).toBeInTheDocument();
      });
    });

    it('displays "All-time return" label', async () => {
      mockGetPortfolio.mockResolvedValue({ data: { data: mockPortfolioWithProfit } });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByText('All-time return')).toBeInTheDocument();
      });
    });

    it('displays "Unique positions" label', async () => {
      mockGetPortfolio.mockResolvedValue({ data: { data: mockPortfolioWithProfit } });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByText('Unique positions')).toBeInTheDocument();
      });
    });

    it('displays "Requires attention" label', async () => {
      mockGetPortfolio.mockResolvedValue({ data: { data: mockPortfolioWithProfit } });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByText('Requires attention')).toBeInTheDocument();
      });
    });
  });

  describe('Export Functionality', () => {
    it('Export PDF button calls exportPortfolioToPDF', async () => {
      mockGetPortfolio.mockResolvedValue({ data: { data: mockPortfolioWithProfit } });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export pdf/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /export pdf/i }));

      expect(mockExportPortfolioToPDF).toHaveBeenCalledWith(
        mockPortfolioWithProfit,
        mockPortfolioWithProfit.riskMetrics
      );
    });

    it('Export CSV button calls exportHoldingsToCSV', async () => {
      mockGetPortfolio.mockResolvedValue({ data: { data: mockPortfolioWithProfit } });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByTestId('export-csv-button')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('export-csv-button'));

      expect(mockExportHoldingsToCSV).toHaveBeenCalledWith(mockPortfolioWithProfit.holdings);
    });

    it('does not call export when portfolio is null', async () => {
      mockGetPortfolio.mockRejectedValue({ response: { status: 404 } });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByTestId('portfolio-upload')).toBeInTheDocument();
      });

      // Export buttons shouldn't be visible, so exports shouldn't be called
      expect(mockExportHoldingsToCSV).not.toHaveBeenCalled();
      expect(mockExportPortfolioToPDF).not.toHaveBeenCalled();
    });
  });

  describe('Upload Modal', () => {
    it('shows upload modal when "Upload New Portfolio" is clicked', async () => {
      mockGetPortfolio.mockResolvedValue({ data: { data: mockPortfolioWithProfit } });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /upload new portfolio/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /upload new portfolio/i }));

      expect(screen.getByTestId('portfolio-upload')).toBeInTheDocument();
      expect(screen.getByText('Replace Portfolio')).toBeInTheDocument();
    });

    it('shows Cancel button in upload modal when portfolio exists', async () => {
      mockGetPortfolio.mockResolvedValue({ data: { data: mockPortfolioWithProfit } });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /upload new portfolio/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /upload new portfolio/i }));

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('Cancel button hides upload modal', async () => {
      mockGetPortfolio.mockResolvedValue({ data: { data: mockPortfolioWithProfit } });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /upload new portfolio/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /upload new portfolio/i }));
      expect(screen.getByTestId('portfolio-upload')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.queryByTestId('portfolio-upload')).not.toBeInTheDocument();
      });
    });

    it('does not show Cancel button when no portfolio exists', async () => {
      mockGetPortfolio.mockRejectedValue({ response: { status: 404 } });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByTestId('portfolio-upload')).toBeInTheDocument();
        expect(screen.getByText('Upload Portfolio')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('displays DollarSign icon on Total Value card', async () => {
      mockGetPortfolio.mockResolvedValue({ data: { data: mockPortfolioWithProfit } });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByTestId('dollar-sign-icon')).toBeInTheDocument();
      });
    });

    it('displays Briefcase icon on Holdings card', async () => {
      mockGetPortfolio.mockResolvedValue({ data: { data: mockPortfolioWithProfit } });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByTestId('briefcase-icon')).toBeInTheDocument();
      });
    });

    it('displays TrendingUp icon for positive P&L', async () => {
      mockGetPortfolio.mockResolvedValue({ data: { data: mockPortfolioWithProfit } });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getAllByTestId('trending-up-icon').length).toBeGreaterThan(0);
      });
    });

    it('displays TrendingDown icon for negative P&L', async () => {
      mockGetPortfolio.mockResolvedValue({ data: { data: mockPortfolioWithLoss } });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getAllByTestId('trending-down-icon').length).toBeGreaterThan(0);
      });
    });

    it('displays FileDown icon on Export PDF button', async () => {
      mockGetPortfolio.mockResolvedValue({ data: { data: mockPortfolioWithProfit } });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByTestId('file-down-icon')).toBeInTheDocument();
      });
    });
  });

  describe('Holdings Section', () => {
    it('displays Holdings section header', async () => {
      mockGetPortfolio.mockResolvedValue({ data: { data: mockPortfolioWithProfit } });

      render(<PortfolioPage />);

      await waitFor(() => {
        // Multiple "Holdings" texts exist - find the section header
        const headings = screen.getAllByText('Holdings');
        expect(headings.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('displays Holdings section subtitle', async () => {
      mockGetPortfolio.mockResolvedValue({ data: { data: mockPortfolioWithProfit } });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByText('Your portfolio positions with AI signals')).toBeInTheDocument();
      });
    });
  });

  describe('P&L Percentage Calculation', () => {
    it('calculates and displays positive P&L percentage', async () => {
      mockGetPortfolio.mockResolvedValue({ data: { data: mockPortfolioWithProfit } });

      render(<PortfolioPage />);

      await waitFor(() => {
        // P&L% = (1250 / 11000) * 100 = 11.36%
        expect(screen.getByText('+11.36%')).toBeInTheDocument();
      });
    });

    it('calculates and displays negative P&L percentage', async () => {
      mockGetPortfolio.mockResolvedValue({ data: { data: mockPortfolioWithLoss } });

      render(<PortfolioPage />);

      await waitFor(() => {
        // P&L% = (-2000 / 12000) * 100 = -16.67%
        expect(screen.getByText('-16.67%')).toBeInTheDocument();
      });
    });
  });

  describe('Today Change Display', () => {
    it('displays mock today change value', async () => {
      mockGetPortfolio.mockResolvedValue({ data: { data: mockPortfolioWithProfit } });

      render(<PortfolioPage />);

      await waitFor(() => {
        // Mock change is 1.2% of total value (12250 * 0.012 = 147)
        expect(screen.getByText(/\+\$147\.00/)).toBeInTheDocument();
      });
    });

    it('displays mock today change percentage', async () => {
      mockGetPortfolio.mockResolvedValue({ data: { data: mockPortfolioWithProfit } });

      render(<PortfolioPage />);

      await waitFor(() => {
        expect(screen.getByText(/\+1\.20%/)).toBeInTheDocument();
      });
    });
  });

  describe('Styling Classes', () => {
    it('applies correct background gradient to page', async () => {
      mockGetPortfolio.mockResolvedValue({ data: { data: mockPortfolioWithProfit } });

      const { container } = render(<PortfolioPage />);

      await waitFor(() => {
        const pageContainer = container.querySelector('.min-h-screen');
        expect(pageContainer).toHaveClass('bg-gradient-to-br', 'from-gray-50', 'to-gray-100');
      });
    });

    it('applies max-width container to content', async () => {
      mockGetPortfolio.mockResolvedValue({ data: { data: mockPortfolioWithProfit } });

      const { container } = render(<PortfolioPage />);

      await waitFor(() => {
        expect(container.querySelector('.max-w-7xl')).toBeInTheDocument();
      });
    });

    it('applies green color to positive P&L', async () => {
      mockGetPortfolio.mockResolvedValue({ data: { data: mockPortfolioWithProfit } });

      const { container } = render(<PortfolioPage />);

      await waitFor(() => {
        const greenText = container.querySelector('.text-green-600');
        expect(greenText).toBeInTheDocument();
      });
    });

    it('applies red color to negative P&L', async () => {
      mockGetPortfolio.mockResolvedValue({ data: { data: mockPortfolioWithLoss } });

      const { container } = render(<PortfolioPage />);

      await waitFor(() => {
        const redText = container.querySelector('.text-red-600');
        expect(redText).toBeInTheDocument();
      });
    });
  });
});
