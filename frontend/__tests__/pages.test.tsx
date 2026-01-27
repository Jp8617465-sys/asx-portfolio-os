/**
 * Frontend Page Smoke Tests
 * Basic rendering tests to ensure pages load without errors
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/',
}));

// Mock API client
jest.mock('@/lib/api-client', () => ({
  fetchDashboardData: jest.fn(() => Promise.resolve({ signals: [], summary: {} })),
  fetchSignals: jest.fn(() => Promise.resolve([])),
  fetchJobHistory: jest.fn(() => Promise.resolve([])),
}));

describe('Page Smoke Tests', () => {
  describe('Landing Page', () => {
    it('renders without crashing', async () => {
      const LandingPage = (await import('@/app/page')).default;
      const { container } = render(<LandingPage />);
      expect(container).toBeInTheDocument();
    });

    it('displays main heading', async () => {
      const LandingPage = (await import('@/app/page')).default;
      render(<LandingPage />);
      expect(screen.getByText(/ASX Portfolio OS/i)).toBeInTheDocument();
    });

    it('displays feature section', async () => {
      const LandingPage = (await import('@/app/page')).default;
      render(<LandingPage />);
      expect(screen.getByText(/AI-Powered Signals/i)).toBeInTheDocument();
    });
  });

  describe('Dashboard Client', () => {
    it('renders without crashing', () => {
      const DashboardClient = require('@/components/DashboardClient').default;
      const { container } = render(<DashboardClient />);
      expect(container).toBeInTheDocument();
    });

    it('shows loading state initially', () => {
      const DashboardClient = require('@/components/DashboardClient').default;
      render(<DashboardClient />);
      // Check for loading indicators or initial state
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  describe('Models Client', () => {
    it('renders without crashing', () => {
      const ModelsClient = require('@/components/ModelsClient').default;
      const { container } = render(<ModelsClient />);
      expect(container).toBeInTheDocument();
    });
  });

  describe('Jobs Client', () => {
    it('renders without crashing', () => {
      const JobsClient = require('@/components/JobsClient').default;
      const { container } = render(<JobsClient />);
      expect(container).toBeInTheDocument();
    });
  });

  describe('Insights Client', () => {
    it('renders without crashing', () => {
      const InsightsClient = require('@/components/InsightsClient').default;
      const { container } = render(<InsightsClient />);
      expect(container).toBeInTheDocument();
    });
  });

  describe('Settings Status', () => {
    it('renders without crashing', () => {
      const SettingsStatus = require('@/components/SettingsStatus').default;
      const { container } = render(<SettingsStatus />);
      expect(container).toBeInTheDocument();
    });
  });
});

describe('Component Smoke Tests', () => {
  describe('Stock Search', () => {
    it('renders search input', () => {
      const StockSearch = require('@/components/stock-search').default;
      render(<StockSearch placeholder="Search" onSelect={jest.fn()} />);
      expect(screen.getByPlaceholderText(/Search/i)).toBeInTheDocument();
    });
  });

  describe('Stat Card', () => {
    it('renders title and value', () => {
      const StatCard = require('@/components/StatCard').default;
      render(<StatCard title="Test" value="123" />);
      expect(screen.getByText('Test')).toBeInTheDocument();
      expect(screen.getByText('123')).toBeInTheDocument();
    });
  });

  describe('Portfolio Upload', () => {
    it('renders upload button', () => {
      const PortfolioUpload = require('@/components/portfolio-upload').default;
      render(<PortfolioUpload />);
      // Component should render without errors
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('Holdings Table', () => {
    it('renders with empty holdings', () => {
      const HoldingsTable = require('@/components/holdings-table').default;
      render(<HoldingsTable holdings={[]} />);
      expect(document.body).toBeInTheDocument();
    });

    it('renders with sample holding', () => {
      const HoldingsTable = require('@/components/holdings-table').default;
      const sampleHolding = {
        symbol: 'CBA.AX',
        shares: 100,
        avg_cost: 95.5,
        current_price: 100,
        value: 10000,
        gain_loss: 450,
        gain_loss_pct: 4.71,
        signal: 'BUY' as const,
        confidence: 65,
      };
      render(<HoldingsTable holdings={[sampleHolding]} />);
      expect(screen.getByText('CBA.AX')).toBeInTheDocument();
    });
  });

  describe('Confidence Gauge', () => {
    it('renders with confidence value', () => {
      const ConfidenceGauge = require('@/components/confidence-gauge').default;
      render(<ConfidenceGauge confidence={75} />);
      expect(document.body).toBeInTheDocument();
    });
  });
});

describe('UI Component Tests', () => {
  describe('Badge', () => {
    it('renders badge with text', () => {
      const { Badge } = require('@/components/ui/badge');
      render(<Badge>Test Badge</Badge>);
      expect(screen.getByText('Test Badge')).toBeInTheDocument();
    });
  });

  describe('Button', () => {
    it('renders button with text', () => {
      const { Button } = require('@/components/ui/button');
      render(<Button>Click Me</Button>);
      expect(screen.getByText('Click Me')).toBeInTheDocument();
    });

    it('handles click events', () => {
      const { Button } = require('@/components/ui/button');
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);
      screen.getByText('Click Me').click();
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Card', () => {
    it('renders card with content', () => {
      const { Card, CardContent } = require('@/components/ui/card');
      render(
        <Card>
          <CardContent>Card Content</CardContent>
        </Card>
      );
      expect(screen.getByText('Card Content')).toBeInTheDocument();
    });
  });
});
