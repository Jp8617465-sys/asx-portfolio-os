import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PortfolioFusionClient from '../PortfolioFusionClient';

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

function mockJsonResponse(data: any, ok = true, status = 200) {
  return {
    ok,
    status,
    json: jest.fn().mockResolvedValue(data),
  };
}

const mockPortfolioData = {
  status: 'ok',
  computed_at: new Date().toISOString(),
  summary: {
    total_assets: 500000,
    total_liabilities: 200000,
    net_worth: 300000,
    debt_service_ratio: 25.5,
    risk_score: 42,
  },
  equities: { value: 150000, count: 8, allocation_pct: 30 },
  property: { value: 300000, count: 1, allocation_pct: 60 },
  loans: { balance: 200000, count: 2, monthly_payment: 2500, allocation_pct: 40 },
};

beforeEach(() => {
  mockFetch.mockClear();
});

describe('PortfolioFusionClient', () => {
  it('renders loading skeleton initially', () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse(mockPortfolioData));
    const { container } = render(<PortfolioFusionClient />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders error with Retry button on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Connection failed'));
    render(<PortfolioFusionClient />);
    await waitFor(() => {
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  it('Retry button triggers a new fetch', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce(mockJsonResponse(mockPortfolioData));

    render(<PortfolioFusionClient />);
    await waitFor(() => screen.getByText('Retry'));
    fireEvent.click(screen.getByText('Retry'));
    await waitFor(() => {
      expect(screen.getByText('Portfolio Overview')).toBeInTheDocument();
    });
  });

  it('renders no_data warning when status is no_data', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ status: 'no_data' }));
    render(<PortfolioFusionClient />);
    await waitFor(() => {
      expect(screen.getByText(/No portfolio data available/i)).toBeInTheDocument();
    });
  });

  it('renders Portfolio Overview heading on success', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse(mockPortfolioData));
    render(<PortfolioFusionClient />);
    await waitFor(() => {
      expect(screen.getByText('Portfolio Overview')).toBeInTheDocument();
    });
  });

  it('renders Net Worth label', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse(mockPortfolioData));
    render(<PortfolioFusionClient />);
    await waitFor(() => {
      expect(screen.getByText('Net Worth')).toBeInTheDocument();
    });
  });

  it('renders Risk Score with Medium level for score 42', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse(mockPortfolioData));
    render(<PortfolioFusionClient />);
    await waitFor(() => {
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('42.0')).toBeInTheDocument();
    });
  });

  it('renders Low risk level for score < 30', async () => {
    const lowRiskData = {
      ...mockPortfolioData,
      summary: { ...mockPortfolioData.summary, risk_score: 15 },
    };
    mockFetch.mockResolvedValueOnce(mockJsonResponse(lowRiskData));
    render(<PortfolioFusionClient />);
    await waitFor(() => {
      expect(screen.getByText('Low')).toBeInTheDocument();
    });
  });

  it('renders High risk level for score >= 60', async () => {
    const highRiskData = {
      ...mockPortfolioData,
      summary: { ...mockPortfolioData.summary, risk_score: 75 },
    };
    mockFetch.mockResolvedValueOnce(mockJsonResponse(highRiskData));
    render(<PortfolioFusionClient />);
    await waitFor(() => {
      expect(screen.getByText('High')).toBeInTheDocument();
    });
  });

  it('renders Debt Service Ratio', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse(mockPortfolioData));
    render(<PortfolioFusionClient />);
    await waitFor(() => {
      expect(screen.getByText('25.5%')).toBeInTheDocument();
    });
  });

  it('renders Asset Allocation section with Equities, Property, Loans', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse(mockPortfolioData));
    render(<PortfolioFusionClient />);
    await waitFor(() => {
      expect(screen.getByText('Asset Allocation')).toBeInTheDocument();
      expect(screen.getByText('Equities')).toBeInTheDocument();
      expect(screen.getByText('Property')).toBeInTheDocument();
      expect(screen.getByText('Loans (Liabilities)')).toBeInTheDocument();
    });
  });

  it('renders holdings and property counts', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse(mockPortfolioData));
    render(<PortfolioFusionClient />);
    await waitFor(() => {
      expect(screen.getByText('8 holdings')).toBeInTheDocument();
      expect(screen.getByText('1 properties')).toBeInTheDocument();
    });
  });
});
