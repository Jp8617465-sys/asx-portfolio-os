import { render, screen, waitFor } from '@testing-library/react';
import JobsClient from '../JobsClient';

// Mock SWR
jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import useSWR from 'swr';
const mockUseSWR = useSWR as jest.MockedFunction<typeof useSWR>;

// Mock API functions
jest.mock('@/lib/api', () => ({
  getModelStatusSummary: jest.fn(),
  getDriftSummary: jest.fn(),
}));

// Mock child components
jest.mock('../Topbar', () => {
  return function MockTopbar({ title }: any) {
    return <div data-testid="topbar">{title}</div>;
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

jest.mock('../ui/skeleton', () => ({
  Skeleton: ({ className }: any) => (
    <div data-testid="skeleton" className={`animate-pulse ${className}`} />
  ),
}));

jest.mock('../ui/table', () => ({
  Table: ({ children }: any) => <table data-testid="table">{children}</table>,
  TableBody: ({ children }: any) => <tbody data-testid="table-body">{children}</tbody>,
  TableCell: ({ children, className, colSpan }: any) => (
    <td data-testid="table-cell" className={className} colSpan={colSpan}>
      {children}
    </td>
  ),
  TableHead: ({ children }: any) => <th data-testid="table-head">{children}</th>,
  TableHeader: ({ children }: any) => <thead data-testid="table-header">{children}</thead>,
  TableRow: ({ children }: any) => <tr data-testid="table-row">{children}</tr>,
}));

describe('JobsClient', () => {
  beforeEach(() => {
    mockUseSWR.mockClear();
  });

  it('renders loading skeleton when both hooks are loading', () => {
    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: undefined, isLoading: true };
      }
      if (key === 'drift-summary') {
        return { data: undefined, isLoading: true };
      }
      return { data: undefined, isLoading: false };
    });

    const { container } = render(<JobsClient />);

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('renders jobs when only summary is loading', () => {
    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: undefined, isLoading: true };
      }
      if (key === 'drift-summary') {
        return { data: {}, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<JobsClient />);

    // Should render jobs since loading requires BOTH to be true
    expect(screen.getByText('Model Training')).toBeInTheDocument();
  });

  it('renders jobs when only drift is loading', () => {
    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: {}, isLoading: false };
      }
      if (key === 'drift-summary') {
        return { data: undefined, isLoading: true };
      }
      return { data: undefined, isLoading: false };
    });

    render(<JobsClient />);

    // Should render jobs since loading requires BOTH to be true
    expect(screen.getByText('Model Training')).toBeInTheDocument();
  });

  it('renders job list with data when both hooks return data', () => {
    const mockSummary = {
      last_run: {
        created_at: '2026-02-04T10:00:00Z',
      },
      signals: {
        as_of: '2026-02-03',
        row_count: 1500,
      },
    };

    const mockDrift = {
      rows: [
        {
          created_at: '2026-02-01T02:30:00Z',
        },
      ],
    };

    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: mockSummary, isLoading: false };
      }
      if (key === 'drift-summary') {
        return { data: mockDrift, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<JobsClient />);

    const automationJobsElements = screen.getAllByText('Automation Jobs');
    expect(automationJobsElements.length).toBeGreaterThan(0);
    expect(screen.getByText('Model Training')).toBeInTheDocument();
    expect(screen.getByText('Signals Persist')).toBeInTheDocument();
    expect(screen.getByText('Weekly Drift Audit')).toBeInTheDocument();
    expect(screen.getByText('Extended Feature Build')).toBeInTheDocument();
  });

  it('renders Success status when last_run.created_at exists', () => {
    const mockSummary = {
      last_run: {
        created_at: '2026-02-04T10:00:00Z',
      },
    };

    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: mockSummary, isLoading: false };
      }
      if (key === 'drift-summary') {
        return { data: {}, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<JobsClient />);

    const badges = screen.getAllByTestId('badge');
    const successBadges = badges.filter((badge) => badge.className.includes('bg-emerald-100'));
    expect(successBadges.length).toBeGreaterThan(0);
  });

  it('renders Queued status when last_run.created_at does not exist', () => {
    const mockSummary = {
      last_run: {},
    };

    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: mockSummary, isLoading: false };
      }
      if (key === 'drift-summary') {
        return { data: {}, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<JobsClient />);

    const badges = screen.getAllByTestId('badge');
    const queuedBadges = badges.filter((badge) => badge.className.includes('bg-amber-100'));
    expect(queuedBadges.length).toBeGreaterThan(0);
  });

  it('renders correct schedule for Model Training', () => {
    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: {}, isLoading: false };
      }
      if (key === 'drift-summary') {
        return { data: {}, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<JobsClient />);

    expect(screen.getByText('Manual')).toBeInTheDocument();
  });

  it('renders correct schedule for Signals Persist', () => {
    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: {}, isLoading: false };
      }
      if (key === 'drift-summary') {
        return { data: {}, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<JobsClient />);

    expect(screen.getByText('Triggered after training')).toBeInTheDocument();
  });

  it('renders correct schedule for Weekly Drift Audit', () => {
    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: {}, isLoading: false };
      }
      if (key === 'drift-summary') {
        return { data: {}, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<JobsClient />);

    expect(screen.getByText('Sundays 02:30')).toBeInTheDocument();
  });

  it('renders correct schedule for Extended Feature Build', () => {
    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: {}, isLoading: false };
      }
      if (key === 'drift-summary') {
        return { data: {}, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<JobsClient />);

    expect(screen.getByText('Daily 03:00')).toBeInTheDocument();
  });

  it('renders n/a for last run when no data available for Model Training', () => {
    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: {}, isLoading: false };
      }
      if (key === 'drift-summary') {
        return { data: {}, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<JobsClient />);

    const cells = screen.getAllByTestId('table-cell');
    const naCells = cells.filter((cell) => cell.textContent === 'n/a');
    expect(naCells.length).toBeGreaterThan(0);
  });

  it('renders last_run.created_at when available for Model Training', () => {
    const mockSummary = {
      last_run: {
        created_at: '2026-02-04T10:00:00Z',
      },
    };

    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: mockSummary, isLoading: false };
      }
      if (key === 'drift-summary') {
        return { data: {}, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<JobsClient />);

    expect(screen.getByText('2026-02-04T10:00:00Z')).toBeInTheDocument();
  });

  it('renders signals.as_of when available for Signals Persist', () => {
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
      if (key === 'drift-summary') {
        return { data: {}, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<JobsClient />);

    expect(screen.getByText('2026-02-03')).toBeInTheDocument();
  });

  it('renders Success status when signals.row_count exists', () => {
    const mockSummary = {
      signals: {
        row_count: 1500,
      },
    };

    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: mockSummary, isLoading: false };
      }
      if (key === 'drift-summary') {
        return { data: {}, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<JobsClient />);

    const badges = screen.getAllByTestId('badge');
    const successBadges = badges.filter((badge) => badge.className.includes('bg-emerald-100'));
    expect(successBadges.length).toBeGreaterThan(0);
  });

  it('renders drift rows created_at when available for Weekly Drift Audit', () => {
    const mockDrift = {
      rows: [
        {
          created_at: '2026-02-01T02:30:00Z',
        },
      ],
    };

    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: {}, isLoading: false };
      }
      if (key === 'drift-summary') {
        return { data: mockDrift, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<JobsClient />);

    expect(screen.getByText('2026-02-01T02:30:00Z')).toBeInTheDocument();
  });

  it('renders Success status when drift rows exist', () => {
    const mockDrift = {
      rows: [
        {
          created_at: '2026-02-01T02:30:00Z',
        },
      ],
    };

    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: {}, isLoading: false };
      }
      if (key === 'drift-summary') {
        return { data: mockDrift, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<JobsClient />);

    const badges = screen.getAllByTestId('badge');
    const successBadges = badges.filter((badge) => badge.className.includes('bg-emerald-100'));
    expect(successBadges.length).toBeGreaterThan(0);
  });

  it('renders Pending for Extended Feature Build last run', () => {
    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: {}, isLoading: false };
      }
      if (key === 'drift-summary') {
        return { data: {}, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<JobsClient />);

    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders Queued status for Extended Feature Build', () => {
    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: {}, isLoading: false };
      }
      if (key === 'drift-summary') {
        return { data: {}, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<JobsClient />);

    const badges = screen.getAllByTestId('badge');
    const queuedBadges = badges.filter((badge) => badge.textContent === 'Queued');
    expect(queuedBadges.length).toBeGreaterThan(0);
  });

  it('renders Topbar with correct title', () => {
    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: {}, isLoading: false };
      }
      if (key === 'drift-summary') {
        return { data: {}, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<JobsClient />);

    const automationJobsElements = screen.getAllByText('Automation Jobs');
    expect(automationJobsElements.length).toBeGreaterThan(0);
  });

  it('renders table headers correctly', () => {
    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: {}, isLoading: false };
      }
      if (key === 'drift-summary') {
        return { data: {}, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<JobsClient />);

    expect(screen.getByText('Job')).toBeInTheDocument();
    expect(screen.getByText('Schedule')).toBeInTheDocument();
    expect(screen.getByText('Last Run')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders all four job rows when data is loaded', () => {
    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: {}, isLoading: false };
      }
      if (key === 'drift-summary') {
        return { data: {}, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<JobsClient />);

    const rows = screen.getAllByTestId('table-row');
    // 1 header row + 4 data rows = 5 total
    expect(rows.length).toBeGreaterThan(4);
  });

  it('applies correct styling for Success badge', () => {
    const mockSummary = {
      last_run: {
        created_at: '2026-02-04T10:00:00Z',
      },
    };

    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: mockSummary, isLoading: false };
      }
      if (key === 'drift-summary') {
        return { data: {}, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<JobsClient />);

    const badges = screen.getAllByTestId('badge');
    const successBadges = badges.filter((badge) => badge.className.includes('bg-emerald-100'));
    expect(successBadges.length).toBeGreaterThan(0);
    expect(successBadges[0].className).toContain('text-emerald-700');
  });

  it('applies correct styling for Queued badge', () => {
    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: {}, isLoading: false };
      }
      if (key === 'drift-summary') {
        return { data: {}, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<JobsClient />);

    const badges = screen.getAllByTestId('badge');
    const queuedBadges = badges.filter((badge) => badge.className.includes('bg-amber-100'));
    expect(queuedBadges.length).toBeGreaterThan(0);
    expect(queuedBadges[0].className).toContain('text-amber-700');
  });

  it('handles partial summary data gracefully', () => {
    const mockSummary = {
      last_run: {
        created_at: '2026-02-04T10:00:00Z',
      },
      // signals is missing
    };

    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: mockSummary, isLoading: false };
      }
      if (key === 'drift-summary') {
        return { data: {}, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<JobsClient />);

    const automationJobsElements = screen.getAllByText('Automation Jobs');
    expect(automationJobsElements.length).toBeGreaterThan(0);
  });

  it('handles empty drift rows array', () => {
    const mockDrift = {
      rows: [],
    };

    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: {}, isLoading: false };
      }
      if (key === 'drift-summary') {
        return { data: mockDrift, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    render(<JobsClient />);

    const automationJobsElements = screen.getAllByText('Automation Jobs');
    expect(automationJobsElements.length).toBeGreaterThan(0);
  });

  it('renders job names with semibold font weight', () => {
    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'model-status-summary') {
        return { data: {}, isLoading: false };
      }
      if (key === 'drift-summary') {
        return { data: {}, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    const { container } = render(<JobsClient />);

    const cells = container.querySelectorAll('.font-semibold');
    expect(cells.length).toBeGreaterThan(0);
  });
});
