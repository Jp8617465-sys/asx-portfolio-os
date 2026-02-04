import { render, screen } from '@testing-library/react';
import InsightsClient from '../InsightsClient';

// Mock SWR
jest.mock('swr', () => {
  return {
    __esModule: true,
    default: jest.fn(),
  };
});

// Mock API functions
jest.mock('@/lib/api', () => ({
  getDriftSummary: jest.fn(),
  getModelExplainability: jest.fn(),
  getAsxAnnouncements: jest.fn(),
}));

// Mock child components
jest.mock('../Topbar', () => {
  return function MockTopbar({ title, subtitle, eyebrow, actions }: any) {
    return (
      <div data-testid="topbar">
        <div data-testid="topbar-eyebrow">{eyebrow}</div>
        <div data-testid="topbar-title">{title}</div>
        <div data-testid="topbar-subtitle">{subtitle}</div>
        <div data-testid="topbar-actions">{actions}</div>
      </div>
    );
  };
});

jest.mock('../DriftChart', () => {
  return function MockDriftChart({ data }: any) {
    return <div data-testid="drift-chart">{data.length} data points</div>;
  };
});

jest.mock('../FeatureImpactChart', () => {
  return function MockFeatureImpactChart({ data }: any) {
    return <div data-testid="feature-impact-chart">{data.length} features</div>;
  };
});

// Mock data fixtures
const mockDriftSummary = {
  status: 'ok',
  count: 8,
  rows: [
    {
      id: 1,
      model: 'model_a_ml',
      baseline_label: 'baseline_v1',
      current_label: 'current_v1',
      metrics: { psi_mean: 0.052, psi_max: 0.082 },
      created_at: '2026-02-04T10:00:00Z',
    },
    {
      id: 2,
      model: 'model_a_ml',
      baseline_label: 'baseline_v1',
      current_label: 'current_v1',
      metrics: { psi_mean: 0.048, psi_max: 0.075 },
      created_at: '2026-02-03T10:00:00Z',
    },
    {
      id: 3,
      model: 'model_a_ml',
      baseline_label: 'baseline_v1',
      current_label: 'current_v1',
      metrics: { psi_mean: 0.045, psi_max: 0.071 },
      created_at: '2026-02-02T10:00:00Z',
    },
    {
      id: 4,
      model: 'model_a_ml',
      baseline_label: 'baseline_v1',
      current_label: 'current_v1',
      metrics: { psi_mean: 0.043, psi_max: 0.068 },
      created_at: '2026-02-01T10:00:00Z',
    },
    {
      id: 5,
      model: 'model_a_ml',
      baseline_label: 'baseline_v1',
      current_label: 'current_v1',
      metrics: { psi_mean: 0.041, psi_max: 0.065 },
      created_at: '2026-01-31T10:00:00Z',
    },
    {
      id: 6,
      model: 'model_a_ml',
      baseline_label: 'baseline_v1',
      current_label: 'current_v1',
      metrics: { psi_mean: 0.039, psi_max: 0.062 },
      created_at: '2026-01-30T10:00:00Z',
    },
    {
      id: 7,
      model: 'model_a_ml',
      baseline_label: 'baseline_v1',
      current_label: 'current_v1',
      metrics: { psi_mean: 0.037, psi_max: 0.059 },
      created_at: '2026-01-29T10:00:00Z',
    },
    {
      id: 8,
      model: 'model_a_ml',
      baseline_label: 'baseline_v1',
      current_label: 'current_v1',
      metrics: { psi_mean: 0.035, psi_max: 0.056 },
      created_at: '2026-01-28T10:00:00Z',
    },
  ],
};

const mockModelExplainability = {
  status: 'ok',
  model_version: 'v1_2',
  path: '/models/v1_2/explainability.json',
  features: [
    { feature: 'momentum_7d', importance: 0.25 },
    { feature: 'volume_ratio', importance: 0.18 },
    { feature: 'rsi_14', importance: 0.15 },
    { feature: 'macd', importance: 0.12 },
    { feature: 'atr', importance: 0.1 },
    { feature: 'bollinger_width', importance: 0.08 },
    { feature: 'ema_50', importance: 0.07 },
    { feature: 'obv', importance: 0.05 },
  ],
};

const mockAsxAnnouncements = {
  status: 'ok',
  limit: 8,
  lookback_days: 30,
  items: [
    {
      dt: '2026-02-04T09:00:00Z',
      code: 'CBA',
      headline: 'CBA announces Q2 earnings beat expectations',
      sentiment: 'positive',
      event_type: 'earnings',
      confidence: 0.89,
      stance: 'bullish',
      relevance_score: 0.92,
      source: 'ASX',
    },
    {
      dt: '2026-02-03T14:30:00Z',
      code: 'BHP',
      headline: 'BHP reports record iron ore production',
      sentiment: 'positive',
      event_type: 'production',
      confidence: 0.85,
      stance: 'bullish',
      relevance_score: 0.88,
      source: 'ASX',
    },
    {
      dt: '2026-02-03T11:15:00Z',
      code: 'WBC',
      headline: 'Westpac faces regulatory review',
      sentiment: 'negative',
      event_type: 'regulatory',
      confidence: 0.82,
      stance: 'bearish',
      relevance_score: 0.75,
      source: 'ASX',
    },
    {
      dt: '2026-02-02T10:00:00Z',
      code: 'CSL',
      headline: 'CSL expands vaccine manufacturing capacity',
      sentiment: 'neutral',
      event_type: 'expansion',
      confidence: 0.78,
      stance: 'neutral',
      relevance_score: 0.7,
      source: 'ASX',
    },
    {
      dt: '2026-02-01T15:45:00Z',
      code: 'NAB',
      headline: 'NAB launches new digital banking platform',
      sentiment: 'positive',
      event_type: 'product_launch',
      confidence: 0.8,
      stance: 'bullish',
      relevance_score: 0.73,
      source: 'ASX',
    },
    {
      dt: '2026-02-01T09:30:00Z',
      code: 'RIO',
      headline: 'Rio Tinto announces dividend increase',
      sentiment: 'positive',
      event_type: 'dividend',
      confidence: 0.91,
      stance: 'bullish',
      relevance_score: 0.95,
      source: 'ASX',
    },
    {
      dt: '2026-01-31T13:20:00Z',
      code: 'WES',
      headline: 'Wesfarmers reports strong retail sales',
      sentiment: 'positive',
      event_type: 'sales',
      confidence: 0.87,
      stance: 'bullish',
      relevance_score: 0.84,
      source: 'ASX',
    },
    {
      dt: '2026-01-30T11:00:00Z',
      code: 'MQG',
      headline: 'Macquarie Group warns of market headwinds',
      sentiment: 'negative',
      event_type: 'outlook',
      confidence: 0.76,
      stance: 'bearish',
      relevance_score: 0.68,
      source: 'ASX',
    },
  ],
  summary: {
    sentiment_counts: {
      positive: 5,
      negative: 2,
      neutral: 1,
    },
    event_counts: {
      earnings: 1,
      production: 1,
      regulatory: 1,
      expansion: 1,
      product_launch: 1,
      dividend: 1,
      sales: 1,
      outlook: 1,
    },
  },
};

// Get the mocked SWR function
let mockSWR: jest.MockedFunction<any>;

beforeAll(() => {
  mockSWR = require('swr').default;
});

beforeEach(() => {
  mockSWR.mockClear();
});

describe('InsightsClient', () => {
  describe('Loading States', () => {
    it('renders loading skeleton for drift timeline', () => {
      mockSWR.mockImplementation((key: string) => {
        if (key === 'drift-summary') {
          return { data: undefined, isLoading: true };
        }
        return { data: undefined, isLoading: false };
      });

      const { container } = render(<InsightsClient />);
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('renders loading skeleton for feature importance', () => {
      mockSWR.mockImplementation((key: string) => {
        if (key === 'feature-importance') {
          return { data: undefined, isLoading: true };
        }
        return { data: undefined, isLoading: false };
      });

      const { container } = render(<InsightsClient />);
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('renders loading skeleton for announcements', () => {
      mockSWR.mockImplementation((key: string) => {
        if (key === 'asx-announcements') {
          return { data: undefined, isLoading: true };
        }
        return { data: undefined, isLoading: false };
      });

      const { container } = render(<InsightsClient />);
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('Success States', () => {
    beforeEach(() => {
      mockSWR.mockImplementation((key: string) => {
        if (key === 'drift-summary') {
          return { data: mockDriftSummary, isLoading: false };
        }
        if (key === 'feature-importance') {
          return { data: mockModelExplainability, isLoading: false };
        }
        if (key === 'asx-announcements') {
          return { data: mockAsxAnnouncements, isLoading: false };
        }
        return { data: undefined, isLoading: false };
      });
    });

    it('renders drift timeline with data', () => {
      render(<InsightsClient />);
      expect(screen.getByText('Drift Timeline')).toBeInTheDocument();
      expect(screen.getByTestId('drift-chart')).toHaveTextContent('8 data points');
    });

    it('renders latest drift read data', () => {
      render(<InsightsClient />);
      expect(screen.getByText('baseline_v1')).toBeInTheDocument();
      expect(screen.getByText('current_v1')).toBeInTheDocument();
      expect(screen.getByText('0.052')).toBeInTheDocument();
      expect(screen.getByText('0.082')).toBeInTheDocument();
    });

    it('renders drift metrics labels', () => {
      render(<InsightsClient />);
      expect(screen.getByText('Baseline')).toBeInTheDocument();
      expect(screen.getByText('Current')).toBeInTheDocument();
      expect(screen.getByText('PSI Mean')).toBeInTheDocument();
      expect(screen.getByText('PSI Max')).toBeInTheDocument();
    });

    it('renders feature pulse chart with data', () => {
      render(<InsightsClient />);
      expect(screen.getByText('Feature Pulse')).toBeInTheDocument();
      expect(screen.getByTestId('feature-impact-chart')).toHaveTextContent('8 features');
    });

    it('renders announcements data in table', () => {
      render(<InsightsClient />);
      expect(screen.getByText('CBA')).toBeInTheDocument();
      expect(screen.getByText('BHP')).toBeInTheDocument();
      expect(screen.getByText('WBC')).toBeInTheDocument();
      expect(screen.getByText('CSL')).toBeInTheDocument();
    });

    it('renders announcement headlines', () => {
      render(<InsightsClient />);
      expect(screen.getByText('CBA announces Q2 earnings beat expectations')).toBeInTheDocument();
      expect(screen.getByText('BHP reports record iron ore production')).toBeInTheDocument();
    });

    it('renders sentiment badges', () => {
      render(<InsightsClient />);
      const positiveBadges = screen.getAllByText('positive');
      const negativeBadges = screen.getAllByText('negative');
      expect(positiveBadges.length).toBeGreaterThan(0);
      expect(negativeBadges.length).toBeGreaterThan(0);
    });

    it('renders sentiment counts summary', () => {
      render(<InsightsClient />);
      expect(screen.getByText('positive: 5')).toBeInTheDocument();
      expect(screen.getByText('negative: 2')).toBeInTheDocument();
      expect(screen.getByText('neutral: 1')).toBeInTheDocument();
    });

    it('renders event counts summary', () => {
      render(<InsightsClient />);
      expect(screen.getByText('earnings: 1')).toBeInTheDocument();
      expect(screen.getByText('production: 1')).toBeInTheDocument();
      expect(screen.getByText('regulatory: 1')).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('renders "No drift history available yet" when drift rows are empty', () => {
      mockSWR.mockImplementation((key: string) => {
        if (key === 'drift-summary') {
          return { data: { ...mockDriftSummary, rows: [] }, isLoading: false };
        }
        return { data: undefined, isLoading: false };
      });

      render(<InsightsClient />);
      expect(screen.getByText('No drift history available yet.')).toBeInTheDocument();
    });

    it('renders "No feature importance available" when features array is empty', () => {
      mockSWR.mockImplementation((key: string) => {
        if (key === 'feature-importance') {
          return { data: { ...mockModelExplainability, features: [] }, isLoading: false };
        }
        return { data: undefined, isLoading: false };
      });

      render(<InsightsClient />);
      expect(screen.getByText('No feature importance available.')).toBeInTheDocument();
    });

    it('renders "No announcements ingested yet" when announcements array is empty', () => {
      mockSWR.mockImplementation((key: string) => {
        if (key === 'asx-announcements') {
          return { data: { ...mockAsxAnnouncements, items: [] }, isLoading: false };
        }
        return { data: undefined, isLoading: false };
      });

      render(<InsightsClient />);
      expect(screen.getByText('No announcements ingested yet.')).toBeInTheDocument();
    });

    it('renders "No sentiment summary yet" when sentiment counts are empty', () => {
      mockSWR.mockImplementation((key: string) => {
        if (key === 'asx-announcements') {
          return {
            data: { ...mockAsxAnnouncements, summary: { sentiment_counts: {}, event_counts: {} } },
            isLoading: false,
          };
        }
        return { data: undefined, isLoading: false };
      });

      render(<InsightsClient />);
      expect(screen.getByText('No sentiment summary yet.')).toBeInTheDocument();
    });

    it('renders "No event summary yet" when event counts are empty', () => {
      mockSWR.mockImplementation((key: string) => {
        if (key === 'asx-announcements') {
          return {
            data: { ...mockAsxAnnouncements, summary: { sentiment_counts: {}, event_counts: {} } },
            isLoading: false,
          };
        }
        return { data: undefined, isLoading: false };
      });

      render(<InsightsClient />);
      expect(screen.getByText('No event summary yet.')).toBeInTheDocument();
    });
  });

  describe('Missing Data Handling', () => {
    it('renders "n/a" when drift metrics are undefined', () => {
      mockSWR.mockImplementation((key: string) => {
        if (key === 'drift-summary') {
          return { data: { rows: [{ id: 1, model: 'model_a_ml' }] }, isLoading: false };
        }
        return { data: undefined, isLoading: false };
      });

      render(<InsightsClient />);
      const naCells = screen.getAllByText('n/a');
      expect(naCells.length).toBeGreaterThan(0);
    });

    it('handles undefined baseline and current labels', () => {
      mockSWR.mockImplementation((key: string) => {
        if (key === 'drift-summary') {
          return {
            data: {
              rows: [
                {
                  id: 1,
                  model: 'model_a_ml',
                  metrics: { psi_mean: 0.052, psi_max: 0.082 },
                  created_at: '2026-02-04T10:00:00Z',
                },
              ],
            },
            isLoading: false,
          };
        }
        return { data: undefined, isLoading: false };
      });

      render(<InsightsClient />);
      const naCells = screen.getAllByText('n/a');
      expect(naCells.length).toBeGreaterThan(0);
    });

    it('handles undefined announcement fields', () => {
      mockSWR.mockImplementation((key: string) => {
        if (key === 'asx-announcements') {
          return {
            data: {
              ...mockAsxAnnouncements,
              items: [{ dt: '2026-02-04T09:00:00Z' }],
            },
            isLoading: false,
          };
        }
        return { data: undefined, isLoading: false };
      });

      render(<InsightsClient />);
      const naCells = screen.getAllByText('n/a');
      expect(naCells.length).toBeGreaterThan(0);
    });
  });

  describe('UI Elements', () => {
    beforeEach(() => {
      mockSWR.mockImplementation(() => ({
        data: undefined,
        isLoading: false,
      }));
    });

    it('renders Insights & Explainability title', () => {
      render(<InsightsClient />);
      expect(screen.getByText('Insights & Explainability')).toBeInTheDocument();
    });

    it('renders subtitle text', () => {
      render(<InsightsClient />);
      expect(
        screen.getByText('Monitor drift posture and feature influence trends.')
      ).toBeInTheDocument();
    });

    it('renders Drift Live badge', () => {
      render(<InsightsClient />);
      expect(screen.getByText('Drift Live')).toBeInTheDocument();
    });

    it('renders all section titles', () => {
      render(<InsightsClient />);
      expect(screen.getByText('Drift Timeline')).toBeInTheDocument();
      expect(screen.getByText('Latest Drift Read')).toBeInTheDocument();
      expect(screen.getByText('Feature Pulse')).toBeInTheDocument();
      expect(screen.getByText('Explainability Notes')).toBeInTheDocument();
      expect(screen.getByText('Model C • ASX Announcements')).toBeInTheDocument();
      expect(screen.getByText('Event Pulse (30d)')).toBeInTheDocument();
    });

    it('renders explainability notes text', () => {
      render(<InsightsClient />);
      expect(
        screen.getByText(/Momentum and trend factors continue to dominate/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/SHAP exports can be streamed here/i)).toBeInTheDocument();
    });
  });

  describe('Table Headers', () => {
    beforeEach(() => {
      mockSWR.mockImplementation(() => ({
        data: undefined,
        isLoading: false,
      }));
    });

    it('renders announcements table headers', () => {
      mockSWR.mockImplementation((key: string) => {
        if (key === 'asx-announcements') {
          return { data: mockAsxAnnouncements, isLoading: false };
        }
        return { data: undefined, isLoading: false };
      });

      render(<InsightsClient />);
      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('Code')).toBeInTheDocument();
      expect(screen.getByText('Headline')).toBeInTheDocument();
      expect(screen.getAllByText('Sentiment').length).toBeGreaterThan(0);
    });
  });

  describe('Date Formatting', () => {
    it('formats announcement dates correctly', () => {
      mockSWR.mockImplementation((key: string) => {
        if (key === 'asx-announcements') {
          return { data: mockAsxAnnouncements, isLoading: false };
        }
        return { data: undefined, isLoading: false };
      });

      render(<InsightsClient />);
      // Dates should be sliced to MM-DD format
      expect(screen.getAllByText('02-04').length).toBeGreaterThan(0);
      expect(screen.getAllByText('02-03').length).toBeGreaterThan(0);
    });
  });

  describe('Event Pulse Section', () => {
    beforeEach(() => {
      mockSWR.mockImplementation((key: string) => {
        if (key === 'asx-announcements') {
          return { data: mockAsxAnnouncements, isLoading: false };
        }
        return { data: undefined, isLoading: false };
      });
    });

    it('renders Sentiment section header', () => {
      render(<InsightsClient />);
      expect(screen.getAllByText('Sentiment').length).toBeGreaterThan(0);
    });

    it('renders Event Types section header', () => {
      render(<InsightsClient />);
      expect(screen.getByText('Event Types')).toBeInTheDocument();
    });

    it('renders all event type badges', () => {
      render(<InsightsClient />);
      expect(screen.getByText('dividend: 1')).toBeInTheDocument();
      expect(screen.getByText('sales: 1')).toBeInTheDocument();
      expect(screen.getByText('outlook: 1')).toBeInTheDocument();
    });
  });

  describe('Conditional Rendering', () => {
    beforeEach(() => {
      mockSWR.mockImplementation((key: string) => {
        if (key === 'drift-summary') {
          return { data: mockDriftSummary, isLoading: false };
        }
        if (key === 'feature-importance') {
          return { data: mockModelExplainability, isLoading: false };
        }
        if (key === 'asx-announcements') {
          return { data: mockAsxAnnouncements, isLoading: false };
        }
        return { data: undefined, isLoading: false };
      });
    });

    it('shows drift data when available', () => {
      render(<InsightsClient />);
      expect(screen.queryByText('No drift history available yet.')).not.toBeInTheDocument();
    });

    it('shows feature data when available', () => {
      render(<InsightsClient />);
      expect(screen.queryByText('No feature importance available.')).not.toBeInTheDocument();
    });

    it('shows announcements table when data is available', () => {
      render(<InsightsClient />);
      expect(screen.queryByText('No announcements ingested yet.')).not.toBeInTheDocument();
    });
  });

  describe('Data Limits', () => {
    it('limits drift series to 8 rows', () => {
      const manyRows = {
        ...mockDriftSummary,
        rows: Array.from({ length: 20 }, (_, i) => ({
          id: i + 1,
          model: 'model_a_ml',
          baseline_label: 'baseline_v1',
          current_label: 'current_v1',
          metrics: { psi_mean: 0.05, psi_max: 0.08 },
          created_at: `2026-01-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
        })),
      };

      mockSWR.mockImplementation((key: string) => {
        if (key === 'drift-summary') {
          return { data: manyRows, isLoading: false };
        }
        return { data: undefined, isLoading: false };
      });

      render(<InsightsClient />);
      // Component should only process 8 rows even though 20 are provided
      expect(screen.getByTestId('drift-chart')).toHaveTextContent('8 data points');
    });

    it('renders all 8 announcement items', () => {
      mockSWR.mockImplementation((key: string) => {
        if (key === 'asx-announcements') {
          return { data: mockAsxAnnouncements, isLoading: false };
        }
        return { data: undefined, isLoading: false };
      });

      render(<InsightsClient />);
      expect(screen.getByText('CBA')).toBeInTheDocument();
      expect(screen.getByText('BHP')).toBeInTheDocument();
      expect(screen.getByText('WBC')).toBeInTheDocument();
      expect(screen.getByText('CSL')).toBeInTheDocument();
      expect(screen.getByText('NAB')).toBeInTheDocument();
      expect(screen.getByText('RIO')).toBeInTheDocument();
      expect(screen.getByText('WES')).toBeInTheDocument();
      expect(screen.getByText('MQG')).toBeInTheDocument();
    });
  });

  describe('Feature Pulse Section', () => {
    beforeEach(() => {
      mockSWR.mockImplementation(() => ({
        data: undefined,
        isLoading: false,
      }));
    });

    it('renders Feature Pulse title', () => {
      render(<InsightsClient />);
      expect(screen.getByText('Feature Pulse')).toBeInTheDocument();
    });

    it('renders Feature Pulse description', () => {
      render(<InsightsClient />);
      expect(
        screen.getByText('Relative feature influence snapshot from latest training summary.')
      ).toBeInTheDocument();
    });
  });

  describe('Multiple Endpoint Integration', () => {
    it('successfully fetches data from all three endpoints', () => {
      mockSWR.mockImplementation((key: string) => {
        if (key === 'drift-summary') {
          return { data: mockDriftSummary, isLoading: false };
        }
        if (key === 'feature-importance') {
          return { data: mockModelExplainability, isLoading: false };
        }
        if (key === 'asx-announcements') {
          return { data: mockAsxAnnouncements, isLoading: false };
        }
        return { data: undefined, isLoading: false };
      });

      render(<InsightsClient />);

      // Verify data from all 3 endpoints is rendered
      expect(screen.getAllByText('0.052')[0]).toBeInTheDocument(); // drift
      expect(screen.getAllByText('CBA').length).toBeGreaterThan(0); // announcements
      expect(screen.getByText('Feature Pulse')).toBeInTheDocument(); // explainability

      expect(mockSWR).toHaveBeenCalled();
    });
  });
});
