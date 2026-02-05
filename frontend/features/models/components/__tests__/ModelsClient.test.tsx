import { render, screen, waitFor } from '@testing-library/react';
import useSWR from 'swr';
import ModelsClient from '../ModelsClient';

// Mock SWR
jest.mock('swr', () => {
  return {
    __esModule: true,
    default: jest.fn(),
  };
});

// Get typed mock reference
const mockUseSWR = useSWR as jest.MockedFunction<typeof useSWR>;

// Mock API functions
jest.mock('@/lib/api', () => ({
  getModelStatusSummary: jest.fn(),
  getDriftSummary: jest.fn(),
  getFeatureImportance: jest.fn(),
  getModelCompare: jest.fn(),
  getSignalsLive: jest.fn(),
  getPortfolioAttribution: jest.fn(),
  getPortfolioPerformance: jest.fn(),
  getEnsembleSignalsLatest: jest.fn(),
}));

// Mock child components
jest.mock('@/components/Topbar', () => {
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

jest.mock('@/features/models/components/DriftChart', () => {
  return function MockDriftChart({ data }: any) {
    return <div data-testid="drift-chart">{data.length} data points</div>;
  };
});

jest.mock('@/features/models/components/FeatureImpactChart', () => {
  return function MockFeatureImpactChart({ data }: any) {
    return <div data-testid="feature-impact-chart">{data.length} features</div>;
  };
});

jest.mock('@/features/models/components/EnsembleSignalsTable', () => {
  return function MockEnsembleSignalsTable({ data, isLoading }: any) {
    if (isLoading) return <div data-testid="ensemble-signals-loading">Loading...</div>;
    return <div data-testid="ensemble-signals-table">Ensemble Signals</div>;
  };
});

jest.mock('@/components/ModelBDashboard', () => {
  return function MockModelBDashboard() {
    return <div data-testid="model-b-dashboard">Model B Dashboard</div>;
  };
});

jest.mock('@/components/SentimentDashboard', () => {
  return function MockSentimentDashboard() {
    return <div data-testid="sentiment-dashboard">Sentiment Dashboard</div>;
  };
});

// Mock data fixtures
const mockModelStatusSummary = {
  status: 'ok',
  model: 'model_a_ml',
  last_run: {
    version: 'v1.1',
    created_at: '2026-01-15T10:00:00Z',
    roc_auc_mean: 0.851,
    rmse_mean: 0.234,
  },
  signals: {
    as_of: '2026-02-04',
    row_count: 150,
  },
  drift: {
    psi_mean: 0.052,
    psi_max: 0.082,
    created_at: '2026-02-03T12:00:00Z',
  },
};

const mockDriftSummary = {
  status: 'ok',
  count: 6,
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
  ],
};

const mockFeatureImportance = {
  status: 'ok',
  model: 'model_a_ml',
  updated_at: '2026-01-15T10:00:00Z',
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

const mockModelCompare = {
  status: 'ok',
  model: 'model_a_ml',
  left: {
    version: 'v1.0',
    created_at: '2025-12-01T10:00:00Z',
    metrics: {
      roc_auc_mean: 0.82,
      rmse_mean: 0.256,
    },
  },
  right: {
    version: 'v1.1',
    created_at: '2026-01-15T10:00:00Z',
    metrics: {
      roc_auc_mean: 0.851,
      rmse_mean: 0.234,
    },
  },
  delta: {
    roc_auc_mean: 0.031,
    rmse_mean: -0.022,
  },
};

const mockSignalsLive = {
  status: 'ok',
  model: 'model_a_ml',
  as_of: '2026-02-04T09:30:00Z',
  count: 20,
  signals: [
    { symbol: 'CBA', rank: 1, score: 0.9245, ml_prob: 0.8756, ml_expected_return: 0.0234 },
    { symbol: 'BHP', rank: 2, score: 0.9012, ml_prob: 0.8523, ml_expected_return: 0.0198 },
    { symbol: 'CSL', rank: 3, score: 0.8789, ml_prob: 0.8301, ml_expected_return: 0.0187 },
    { symbol: 'WBC', rank: 4, score: 0.8567, ml_prob: 0.8145, ml_expected_return: 0.0176 },
    { symbol: 'NAB', rank: 5, score: 0.8456, ml_prob: 0.8034, ml_expected_return: 0.0165 },
    { symbol: 'ANZ', rank: 6, score: 0.8234, ml_prob: 0.7912, ml_expected_return: 0.0154 },
    { symbol: 'WES', rank: 7, score: 0.8123, ml_prob: 0.7834, ml_expected_return: 0.0148 },
    { symbol: 'MQG', rank: 8, score: 0.8012, ml_prob: 0.7756, ml_expected_return: 0.0142 },
    { symbol: 'WOW', rank: 9, score: 0.7901, ml_prob: 0.7678, ml_expected_return: 0.0136 },
    { symbol: 'TLS', rank: 10, score: 0.7789, ml_prob: 0.7589, ml_expected_return: 0.0129 },
    { symbol: 'RIO', rank: 11, score: 0.7678, ml_prob: 0.7501, ml_expected_return: 0.0123 },
    { symbol: 'GMG', rank: 12, score: 0.7567, ml_prob: 0.7423, ml_expected_return: 0.0117 },
  ],
};

const mockPortfolioAttribution = {
  status: 'ok',
  model: 'model_a_v1_1',
  as_of: '2026-02-04',
  items: [
    { symbol: 'CBA', weight: 0.1234, return_1d: 0.0056, contribution: 0.0007 },
    { symbol: 'BHP', weight: 0.1123, return_1d: 0.0034, contribution: 0.0004 },
    { symbol: 'CSL', weight: 0.1056, return_1d: 0.0012, contribution: 0.0001 },
    { symbol: 'WBC', weight: 0.0945, return_1d: -0.0023, contribution: -0.0002 },
    { symbol: 'NAB', weight: 0.0834, return_1d: 0.0045, contribution: 0.0004 },
    { symbol: 'ANZ', weight: 0.0723, return_1d: 0.0067, contribution: 0.0005 },
    { symbol: 'WES', weight: 0.0612, return_1d: -0.0012, contribution: -0.0001 },
    { symbol: 'MQG', weight: 0.0501, return_1d: 0.0089, contribution: 0.0004 },
  ],
  summary: {
    portfolio_return: 0.0024,
    volatility: 0.0156,
    sharpe: 1.234,
  },
};

const mockPortfolioPerformance = {
  status: 'ok',
  model: 'model_a_v1_1',
  series: [
    {
      as_of: '2026-01-20',
      portfolio_return: 0.0012,
      volatility: 0.0145,
      sharpe: 1.123,
      created_at: '2026-01-20T16:00:00Z',
    },
    {
      as_of: '2026-01-21',
      portfolio_return: 0.0015,
      volatility: 0.0148,
      sharpe: 1.156,
      created_at: '2026-01-21T16:00:00Z',
    },
    {
      as_of: '2026-01-22',
      portfolio_return: 0.0019,
      volatility: 0.0151,
      sharpe: 1.189,
      created_at: '2026-01-22T16:00:00Z',
    },
    {
      as_of: '2026-01-23',
      portfolio_return: 0.0021,
      volatility: 0.0153,
      sharpe: 1.212,
      created_at: '2026-01-23T16:00:00Z',
    },
    {
      as_of: '2026-01-24',
      portfolio_return: 0.0024,
      volatility: 0.0156,
      sharpe: 1.234,
      created_at: '2026-01-24T16:00:00Z',
    },
  ],
};

const mockEnsembleSignals = {
  status: 'ok',
  as_of: '2026-02-04',
  signals: [
    { symbol: 'CBA', rank: 1, ensemble_score: 0.92 },
    { symbol: 'BHP', rank: 2, ensemble_score: 0.88 },
  ],
};

beforeEach(() => {
  mockUseSWR.mockClear();
});

describe('ModelsClient', () => {
  describe('Loading States', () => {
    it('renders loading skeleton for model versions section', () => {
      mockUseSWR.mockImplementation(() => ({
        data: undefined,
        isLoading: true,
      }));

      const { container } = render(<ModelsClient />);
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('renders loading skeleton for model compare section', () => {
      mockUseSWR.mockImplementation((key: string) => {
        if (key === 'model-compare') {
          return { data: undefined, isLoading: true };
        }
        return { data: undefined, isLoading: false };
      });

      const { container } = render(<ModelsClient />);
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('renders loading skeleton for feature importance section', () => {
      mockUseSWR.mockImplementation((key: string) => {
        if (key === 'feature-importance') {
          return { data: undefined, isLoading: true };
        }
        return { data: undefined, isLoading: false };
      });

      const { container } = render(<ModelsClient />);
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('Success States', () => {
    beforeEach(() => {
      mockUseSWR.mockImplementation((key: string) => {
        if (key === 'model-status-summary') {
          return { data: mockModelStatusSummary, isLoading: false };
        }
        if (key === 'drift-summary') {
          return { data: mockDriftSummary, isLoading: false };
        }
        if (key === 'feature-importance') {
          return { data: mockFeatureImportance, isLoading: false };
        }
        if (key === 'model-compare') {
          return { data: mockModelCompare, isLoading: false };
        }
        if (key === 'signals-live') {
          return { data: mockSignalsLive, isLoading: false };
        }
        if (key === 'portfolio-attribution') {
          return { data: mockPortfolioAttribution, isLoading: false };
        }
        if (key === 'portfolio-performance') {
          return { data: mockPortfolioPerformance, isLoading: false };
        }
        if (key === 'ensemble-signals') {
          return { data: mockEnsembleSignals, isLoading: false };
        }
        return { data: undefined, isLoading: false };
      });
    });

    it('renders model status summary data', () => {
      render(<ModelsClient />);
      expect(screen.getAllByText('v1.1')[0]).toBeInTheDocument();
      expect(screen.getByText('0.851')).toBeInTheDocument();
      expect(screen.getByText('0.234')).toBeInTheDocument();
      expect(screen.getAllByText('0.052')[0]).toBeInTheDocument();
    });

    it('renders Active badge for model status', () => {
      render(<ModelsClient />);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders model compare versions', () => {
      render(<ModelsClient />);
      expect(screen.getByText('v1.0')).toBeInTheDocument();
      expect(screen.getAllByText('v1.1').length).toBeGreaterThan(0);
    });

    it('renders model compare delta metrics', () => {
      render(<ModelsClient />);
      expect(screen.getByText('0.031')).toBeInTheDocument();
      expect(screen.getByText('-0.022')).toBeInTheDocument();
    });

    it('renders live signals data in table', () => {
      render(<ModelsClient />);
      expect(screen.getAllByText('CBA').length).toBeGreaterThan(0);
      expect(screen.getAllByText('BHP').length).toBeGreaterThan(0);
      expect(screen.getAllByText('CSL').length).toBeGreaterThan(0);
      expect(screen.getByText('0.9245')).toBeInTheDocument();
      expect(screen.getByText('0.8756')).toBeInTheDocument();
    });

    it('renders signal ranks correctly', () => {
      render(<ModelsClient />);
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('renders portfolio attribution data', () => {
      render(<ModelsClient />);
      expect(screen.getByText('0.1234')).toBeInTheDocument();
      expect(screen.getByText('0.0056')).toBeInTheDocument();
      expect(screen.getByText('0.0007')).toBeInTheDocument();
    });

    it('renders portfolio performance summary', () => {
      render(<ModelsClient />);
      expect(screen.getAllByText('0.0024').length).toBeGreaterThan(0);
      expect(screen.getAllByText('0.0156').length).toBeGreaterThan(0);
      expect(screen.getAllByText('1.234').length).toBeGreaterThan(0);
      expect(screen.getAllByText('5')[0]).toBeInTheDocument(); // observations count
    });

    it('renders feature impact chart with correct data', () => {
      render(<ModelsClient />);
      expect(screen.getByTestId('feature-impact-chart')).toHaveTextContent('8 features');
    });

    it('renders drift chart with correct data', () => {
      render(<ModelsClient />);
      expect(screen.getByTestId('drift-chart')).toHaveTextContent('3 data points');
    });
  });

  describe('Empty States', () => {
    it('renders "No feature importance available" when features array is empty', () => {
      mockUseSWR.mockImplementation((key: string) => {
        if (key === 'feature-importance') {
          return { data: { ...mockFeatureImportance, features: [] }, isLoading: false };
        }
        return { data: undefined, isLoading: false };
      });

      render(<ModelsClient />);
      expect(screen.getByText('No feature importance available.')).toBeInTheDocument();
    });

    it('renders "No drift data yet" when drift rows are empty', () => {
      mockUseSWR.mockImplementation((key: string) => {
        if (key === 'drift-summary') {
          return { data: { ...mockDriftSummary, rows: [] }, isLoading: false };
        }
        return { data: undefined, isLoading: false };
      });

      render(<ModelsClient />);
      expect(screen.getByText('No drift data yet.')).toBeInTheDocument();
    });

    it('renders "No signals loaded yet" when signals array is empty', () => {
      mockUseSWR.mockImplementation((key: string) => {
        if (key === 'signals-live') {
          return { data: { ...mockSignalsLive, signals: [] }, isLoading: false };
        }
        return { data: undefined, isLoading: false };
      });

      render(<ModelsClient />);
      expect(screen.getByText('No signals loaded yet.')).toBeInTheDocument();
    });

    it('renders "No attribution data yet" when attribution items are empty', () => {
      mockUseSWR.mockImplementation((key: string) => {
        if (key === 'portfolio-attribution') {
          return { data: { ...mockPortfolioAttribution, items: [] }, isLoading: false };
        }
        return { data: undefined, isLoading: false };
      });

      render(<ModelsClient />);
      expect(screen.getByText('No attribution data yet.')).toBeInTheDocument();
    });
  });

  describe('Missing Data Handling', () => {
    it('renders "n/a" when model version is undefined', () => {
      mockUseSWR.mockImplementation((key: string) => {
        if (key === 'model-status-summary') {
          return { data: { last_run: {} }, isLoading: false };
        }
        return { data: undefined, isLoading: false };
      });

      render(<ModelsClient />);
      const naCells = screen.getAllByText('n/a');
      expect(naCells.length).toBeGreaterThan(0);
    });

    it('renders "n/a" when compare versions are undefined', () => {
      mockUseSWR.mockImplementation((key: string) => {
        if (key === 'model-compare') {
          return { data: { status: 'ok', model: 'model_a_ml' }, isLoading: false };
        }
        return { data: undefined, isLoading: false };
      });

      render(<ModelsClient />);
      const naCells = screen.getAllByText('n/a');
      expect(naCells.length).toBeGreaterThan(0);
    });

    it('handles null values in attribution data', () => {
      mockUseSWR.mockImplementation((key: string) => {
        if (key === 'portfolio-attribution') {
          return {
            data: {
              ...mockPortfolioAttribution,
              items: [{ symbol: 'TEST', weight: null, return_1d: null, contribution: null }],
            },
            isLoading: false,
          };
        }
        return { data: undefined, isLoading: false };
      });

      render(<ModelsClient />);
      expect(screen.getByText('TEST')).toBeInTheDocument();
      const naCells = screen.getAllByText('n/a');
      expect(naCells.length).toBeGreaterThan(0);
    });

    it('handles null values in portfolio summary', () => {
      mockUseSWR.mockImplementation((key: string) => {
        if (key === 'portfolio-attribution') {
          return {
            data: {
              ...mockPortfolioAttribution,
              summary: {
                portfolio_return: null,
                volatility: null,
                sharpe: null,
              },
            },
            isLoading: false,
          };
        }
        return { data: undefined, isLoading: false };
      });

      render(<ModelsClient />);
      const naCells = screen.getAllByText('n/a');
      expect(naCells.length).toBeGreaterThan(0);
    });
  });

  describe('UI Elements', () => {
    beforeEach(() => {
      mockUseSWR.mockImplementation(() => ({
        data: undefined,
        isLoading: false,
      }));
    });

    it('renders Model Registry title', () => {
      render(<ModelsClient />);
      expect(screen.getByText('Model Registry')).toBeInTheDocument();
    });

    it('renders Phase 2 Live badge', () => {
      render(<ModelsClient />);
      expect(screen.getByText('Phase 2 Live')).toBeInTheDocument();
    });

    it('renders Model A tab button', () => {
      render(<ModelsClient />);
      expect(screen.getByText('Model A (ML Signals)')).toBeInTheDocument();
    });

    it('renders all section titles', () => {
      render(<ModelsClient />);
      expect(screen.getByText('Model Versions')).toBeInTheDocument();
      expect(screen.getByText('Model Compare')).toBeInTheDocument();
      expect(screen.getByText('Feature Importance')).toBeInTheDocument();
      expect(screen.getByText('Drift Snapshot')).toBeInTheDocument();
      expect(screen.getByText('Top Signals (Latest)')).toBeInTheDocument();
      expect(screen.getByText('Portfolio Attribution (Latest)')).toBeInTheDocument();
      expect(screen.getByText('Portfolio Performance')).toBeInTheDocument();
      expect(screen.getByText('Retrain Controls')).toBeInTheDocument();
    });

    it('renders disabled Retrain Model button', () => {
      render(<ModelsClient />);
      const retrainButton = screen.getByText('Retrain Model');
      expect(retrainButton).toBeInTheDocument();
      expect(retrainButton.closest('button')).toBeDisabled();
    });
  });

  describe('Table Headers', () => {
    beforeEach(() => {
      mockUseSWR.mockImplementation(() => ({
        data: undefined,
        isLoading: false,
      }));
    });

    it('renders model versions table headers', () => {
      render(<ModelsClient />);
      expect(screen.getByText('Version')).toBeInTheDocument();
      expect(screen.getByText('ROC-AUC')).toBeInTheDocument();
      expect(screen.getByText('RMSE')).toBeInTheDocument();
      expect(screen.getByText('Drift')).toBeInTheDocument();
      // Status header may appear multiple times in different tables
      expect(screen.getAllByText('Status').length).toBeGreaterThan(0);
    });

    it('renders signals table headers', () => {
      render(<ModelsClient />);
      // Headers may appear multiple times in different tables
      expect(screen.getAllByText('Rank').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Symbol').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Score').length).toBeGreaterThan(0);
      expect(screen.getAllByText('ML Prob').length).toBeGreaterThan(0);
    });

    it('renders attribution table headers', () => {
      render(<ModelsClient />);
      const weights = screen.getAllByText('Weight');
      const returns = screen.getAllByText('Return');
      const contributions = screen.getAllByText('Contribution');
      expect(weights.length).toBeGreaterThan(0);
      expect(returns.length).toBeGreaterThan(0);
      expect(contributions.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Labels', () => {
    beforeEach(() => {
      mockUseSWR.mockImplementation(() => ({
        data: undefined,
        isLoading: false,
      }));
    });

    it('renders performance metric labels', () => {
      render(<ModelsClient />);
      expect(screen.getByText('Latest Return')).toBeInTheDocument();
      expect(screen.getByText('Volatility')).toBeInTheDocument();
      expect(screen.getByText('Sharpe')).toBeInTheDocument();
      expect(screen.getByText('Observations')).toBeInTheDocument();
    });

    it('renders compare metric labels', () => {
      render(<ModelsClient />);
      expect(screen.getByText('Left')).toBeInTheDocument();
      expect(screen.getByText('Right')).toBeInTheDocument();
      expect(screen.getByText('Δ ROC-AUC')).toBeInTheDocument();
      expect(screen.getByText('Δ RMSE')).toBeInTheDocument();
    });
  });
});
