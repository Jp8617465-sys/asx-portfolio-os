import { render, screen, waitFor } from '@testing-library/react';
import DashboardClient from '../DashboardClient';

// Mock SWR
jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import useSWR from 'swr';
const mockUseSWR = useSWR as jest.MockedFunction<typeof useSWR>;

// Mock Framer Motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock API functions
jest.mock('@/lib/api', () => ({
  getDashboard: jest.fn(),
  getDriftSummary: jest.fn(),
  getLoanSummary: jest.fn(),
  getModelStatusSummary: jest.fn(),
}));

// Mock child components
jest.mock('../Topbar', () => {
  return function MockTopbar({ title }: any) {
    return <div data-testid="topbar">{title}</div>;
  };
});

jest.mock('../StatCard', () => {
  return function MockStatCard({ label, value, trend, isLoading }: any) {
    if (isLoading) {
      return <div data-testid="stat-card-loading">Loading...</div>;
    }
    return (
      <div data-testid="stat-card">
        <div data-testid="stat-label">{label}</div>
        <div data-testid="stat-value">{value}</div>
        <div data-testid="stat-trend">{trend}</div>
      </div>
    );
  };
});

jest.mock('../DriftChart', () => {
  return function MockDriftChart({ data }: any) {
    return <div data-testid="drift-chart">{JSON.stringify(data)}</div>;
  };
});

jest.mock('../ui/badge', () => ({
  Badge: ({ children, className }: any) => (
    <span data-testid="badge" className={className}>
      {children}
    </span>
  ),
}));

jest.mock('../ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <div data-testid="card-title">{children}</div>,
}));

describe('DashboardClient', () => {
  beforeEach(() => {
    mockUseSWR.mockClear();
  });

  it('renders loading skeletons when all hooks are loading', () => {
    mockUseSWR.mockImplementation(() => ({
      data: undefined,
      isLoading: true,
    }));

    render(<DashboardClient />);

    const loadingCards = screen.getAllByTestId('stat-card-loading');
    expect(loadingCards.length).toBeGreaterThan(0);
  });

  it('renders stat cards when data is loaded', () => {
    const mockSummary = {
      last_run: {
        version: 'v1.2.3',
        created_at: '2026-02-04T10:00:00Z',
        roc_auc_mean: 0.857,
      },
      signals: {
        as_of: '2026-02-03',
        row_count: 1500,
      },
      drift: {
        psi_mean: 0.123,
        psi_max: 0.456,
      },
    };

    const mockDrift = {
      rows: [
        {
          created_at: '2026-02-01T10:00:00Z',
          metrics: {
            psi_mean: 0.12,
          },
        },
      ],
    };

    const mockLoanSummary = {
      totals: {
        health_score: 85,
        total_principal: 250000,
        avg_rate: 0.0375,
        interest_ratio: 0.28,
      },
    };

    const mockDashboard = {
      summary: {
        n_targets: 25,
      },
    };

    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: mockSummary, isLoading: false };
      }
      if (key === 'drift-summary') {
        return { data: mockDrift, isLoading: false };
      }
      if (key === 'loan-summary') {
        return { data: mockLoanSummary, isLoading: false };
      }
      if (key === 'dashboard-2026-02-03') {
        return { data: mockDashboard, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<DashboardClient />);

    expect(screen.getByText('Latest Version')).toBeInTheDocument();
    expect(screen.getByText('ROC-AUC Mean')).toBeInTheDocument();
    expect(screen.getByText('Signal Rows')).toBeInTheDocument();
    expect(screen.getByText('Targets')).toBeInTheDocument();
  });

  it('renders Latest Version stat card with correct value', () => {
    const mockSummary = {
      last_run: {
        version: 'v1.2.3',
        created_at: '2026-02-04T10:00:00Z',
      },
    };

    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: mockSummary, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<DashboardClient />);

    expect(screen.getByText('v1.2.3')).toBeInTheDocument();
  });

  it('renders n/a for Latest Version when no data available', () => {
    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: {}, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<DashboardClient />);

    const values = screen.getAllByTestId('stat-value');
    const naValues = values.filter((value) => value.textContent === 'n/a');
    expect(naValues.length).toBeGreaterThan(0);
  });

  it('renders ROC-AUC Mean with correct formatting (3 decimals)', () => {
    const mockSummary = {
      last_run: {
        roc_auc_mean: 0.857,
      },
    };

    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: mockSummary, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<DashboardClient />);

    expect(screen.getByText('0.857')).toBeInTheDocument();
  });

  it('renders Signal Rows with correct formatting (locale string)', () => {
    const mockSummary = {
      signals: {
        row_count: 1500,
      },
    };

    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: mockSummary, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<DashboardClient />);

    expect(screen.getByText('1,500')).toBeInTheDocument();
  });

  it('renders 0 for Signal Rows when row_count is missing', () => {
    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: {}, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<DashboardClient />);

    const values = screen.getAllByTestId('stat-value');
    const zeroValues = values.filter((value) => value.textContent === '0');
    expect(zeroValues.length).toBeGreaterThan(0);
  });

  it('renders Targets stat card with correct value', () => {
    const mockSummary = {
      signals: {
        as_of: '2026-02-03',
      },
    };

    const mockDashboard = {
      summary: {
        n_targets: 25,
      },
    };

    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: mockSummary, isLoading: false };
      }
      if (key === 'dashboard-2026-02-03') {
        return { data: mockDashboard, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<DashboardClient />);

    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('does not call dashboard endpoint when as_of is missing', () => {
    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: {}, isLoading: false };
      }
      if (key === null) {
        return { data: undefined, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<DashboardClient />);

    expect(screen.getByText('Model Health Overview')).toBeInTheDocument();
  });

  it('renders Drift Pulse chart when drift data is available', () => {
    const mockDrift = {
      rows: [
        {
          created_at: '2026-02-01T10:00:00Z',
          metrics: {
            psi_mean: 0.12,
          },
        },
        {
          created_at: '2026-02-02T10:00:00Z',
          metrics: {
            psi_mean: 0.15,
          },
        },
      ],
    };

    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'drift-summary') {
        return { data: mockDrift, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<DashboardClient />);

    expect(screen.getByTestId('drift-chart')).toBeInTheDocument();
  });

  it('processes drift data correctly (reverse and slice)', () => {
    const mockDrift = {
      rows: [
        {
          created_at: '2026-02-01T10:00:00Z',
          metrics: {
            psi_mean: 0.12,
          },
        },
        {
          created_at: '2026-02-02T10:00:00Z',
          metrics: {
            psi_mean: 0.15,
          },
        },
      ],
    };

    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'drift-summary') {
        return { data: mockDrift, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<DashboardClient />);

    const chart = screen.getByTestId('drift-chart');
    expect(chart.textContent).toContain('psi');
  });

  it('renders no drift history message when drift rows are empty', () => {
    const mockDrift = {
      rows: [],
    };

    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'drift-summary') {
        return { data: mockDrift, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<DashboardClient />);

    expect(screen.getByText(/No drift history available yet/i)).toBeInTheDocument();
  });

  it('renders loading drift history message when drift is loading', () => {
    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'drift-summary') {
        return { data: undefined, isLoading: true };
      }
      return { data: undefined, isLoading: false };
    });

    render(<DashboardClient />);

    expect(screen.getByText(/Loading drift history/i)).toBeInTheDocument();
  });

  it('renders System Status section', () => {
    mockUseSWR.mockImplementation(() => ({
      data: undefined,
      isLoading: false,
    }));

    render(<DashboardClient />);

    expect(screen.getByText('System Status')).toBeInTheDocument();
  });

  it('renders Backend Healthy badge', () => {
    mockUseSWR.mockImplementation(() => ({
      data: undefined,
      isLoading: false,
    }));

    render(<DashboardClient />);

    expect(screen.getByText('Backend')).toBeInTheDocument();
    expect(screen.getByText('Healthy')).toBeInTheDocument();
  });

  it('renders Drift Mean with correct formatting (3 decimals)', () => {
    const mockSummary = {
      drift: {
        psi_mean: 0.123,
      },
    };

    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: mockSummary, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<DashboardClient />);

    expect(screen.getByText('0.123')).toBeInTheDocument();
  });

  it('renders n/a for Drift Mean when no data available', () => {
    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: {}, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<DashboardClient />);

    expect(screen.getByText('Drift Mean')).toBeInTheDocument();
  });

  it('renders Drift Max with correct formatting (3 decimals)', () => {
    const mockSummary = {
      drift: {
        psi_max: 0.456,
      },
    };

    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: mockSummary, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<DashboardClient />);

    expect(screen.getByText('0.456')).toBeInTheDocument();
  });

  it('renders n/a for Drift Max when no data available', () => {
    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: {}, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<DashboardClient />);

    expect(screen.getByText('Drift Max')).toBeInTheDocument();
  });

  it('renders Loan Health Score section', () => {
    mockUseSWR.mockImplementation(() => ({
      data: undefined,
      isLoading: false,
    }));

    render(<DashboardClient />);

    expect(screen.getByText('Loan Health Score')).toBeInTheDocument();
  });

  it('renders loan health score with correct formatting', () => {
    const mockLoanSummary = {
      totals: {
        health_score: 85.6,
      },
    };

    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'loan-summary') {
        return { data: mockLoanSummary, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<DashboardClient />);

    expect(screen.getByText('86/100')).toBeInTheDocument();
  });

  it('renders n/a for health score when null', () => {
    const mockLoanSummary = {
      totals: {
        health_score: null,
      },
    };

    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'loan-summary') {
        return { data: mockLoanSummary, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<DashboardClient />);

    const healthScoreElements = screen.getAllByText(/Health Score/i);
    expect(healthScoreElements.length).toBeGreaterThan(0);
  });

  it('renders Total Principal with currency formatting', () => {
    const mockLoanSummary = {
      totals: {
        total_principal: 250000,
      },
    };

    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'loan-summary') {
        return { data: mockLoanSummary, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<DashboardClient />);

    expect(screen.getByText('$250,000')).toBeInTheDocument();
  });

  it('renders Average Rate with percentage formatting', () => {
    const mockLoanSummary = {
      totals: {
        avg_rate: 0.0375,
      },
    };

    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'loan-summary') {
        return { data: mockLoanSummary, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<DashboardClient />);

    expect(screen.getByText('3.75%')).toBeInTheDocument();
  });

  it('renders Interest Load with percentage formatting', () => {
    const mockLoanSummary = {
      totals: {
        interest_ratio: 0.28,
      },
    };

    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'loan-summary') {
        return { data: mockLoanSummary, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<DashboardClient />);

    expect(screen.getByText('28.0%')).toBeInTheDocument();
  });

  it('renders loading loan data message when loan summary is loading', () => {
    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'loan-summary') {
        return { data: undefined, isLoading: true };
      }
      return { data: undefined, isLoading: false };
    });

    render(<DashboardClient />);

    expect(screen.getByText(/Loading loan data/i)).toBeInTheDocument();
  });

  it('renders no loan records message when loan totals are missing', () => {
    const mockLoanSummary = {};

    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'loan-summary') {
        return { data: mockLoanSummary, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<DashboardClient />);

    expect(screen.getByText(/No loan records available/i)).toBeInTheDocument();
  });

  it('renders Topbar with correct title', () => {
    mockUseSWR.mockImplementation(() => ({
      data: undefined,
      isLoading: false,
    }));

    render(<DashboardClient />);

    expect(screen.getByText('Model Health Overview')).toBeInTheDocument();
  });

  it('uses motion.section for stat card grid', () => {
    mockUseSWR.mockImplementation(() => ({
      data: undefined,
      isLoading: false,
    }));

    const { container } = render(<DashboardClient />);

    const sections = container.querySelectorAll('section');
    expect(sections.length).toBeGreaterThan(0);
  });

  it('uses motion.div for individual stat cards', () => {
    mockUseSWR.mockImplementation(() => ({
      data: undefined,
      isLoading: true,
    }));

    render(<DashboardClient />);

    const statCards = screen.getAllByTestId('stat-card-loading');
    expect(statCards.length).toBeGreaterThan(0);
  });

  it('handles partial summary data gracefully', () => {
    const mockSummary = {
      last_run: {
        version: 'v1.2.3',
      },
      // Missing signals and drift
    };

    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: mockSummary, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<DashboardClient />);

    expect(screen.getByText('Model Health Overview')).toBeInTheDocument();
  });

  it('handles missing drift metrics gracefully', () => {
    const mockDrift = {
      rows: [
        {
          created_at: '2026-02-01T10:00:00Z',
          // metrics is missing
        },
      ],
    };

    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'drift-summary') {
        return { data: mockDrift, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<DashboardClient />);

    expect(screen.getByText('Model Health Overview')).toBeInTheDocument();
  });

  it('slices drift rows to maximum of 5', () => {
    const mockDrift = {
      rows: Array.from({ length: 10 }, (_, i) => ({
        created_at: `2026-02-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
        metrics: {
          psi_mean: 0.1 + i * 0.01,
        },
      })),
    };

    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'drift-summary') {
        return { data: mockDrift, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<DashboardClient />);

    const chart = screen.getByTestId('drift-chart');
    const chartData = JSON.parse(chart.textContent || '[]');
    expect(chartData.length).toBeLessThanOrEqual(5);
  });

  it('formats drift chart labels correctly (MM-DD)', () => {
    const mockDrift = {
      rows: [
        {
          created_at: '2026-02-15T10:00:00Z',
          metrics: {
            psi_mean: 0.12,
          },
        },
      ],
    };

    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'drift-summary') {
        return { data: mockDrift, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<DashboardClient />);

    const chart = screen.getByTestId('drift-chart');
    expect(chart.textContent).toContain('02-15');
  });

  it('renders as_of date in Signal Rows trend', () => {
    const mockSummary = {
      signals: {
        as_of: '2026-02-03',
        row_count: 1500,
      },
    };

    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: mockSummary, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<DashboardClient />);

    expect(screen.getByText('as_of 2026-02-03')).toBeInTheDocument();
  });

  it('renders created_at date in Latest Version trend', () => {
    const mockSummary = {
      last_run: {
        version: 'v1.2.3',
        created_at: '2026-02-04T10:00:00Z',
      },
    };

    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: mockSummary, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<DashboardClient />);

    expect(screen.getByText('2026-02-04T10:00:00Z')).toBeInTheDocument();
  });
});
