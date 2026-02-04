import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import JobHistoryClient from '../JobHistoryClient';

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

function mockJsonResponse(data: any, ok = true) {
  return {
    ok,
    status: ok ? 200 : 500,
    json: jest.fn().mockResolvedValue(data),
  };
}

const mockSummary = {
  status: 'ok',
  time_window: '24h',
  overall: {
    total_jobs: 10,
    successful: 8,
    failed: 1,
    running: 1,
    success_rate: 80.0,
    avg_duration_seconds: 125.5,
  },
};

const mockHistoryJobs = {
  jobs: [
    {
      id: 1,
      job_name: 'daily_prices',
      job_type: 'ingest',
      status: 'success',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      duration_seconds: 45.2,
      records_processed: 500,
      error_message: null,
    },
    {
      id: 2,
      job_name: 'drift_audit',
      job_type: 'analysis',
      status: 'failed',
      started_at: new Date().toISOString(),
      completed_at: null,
      duration_seconds: null,
      records_processed: null,
      error_message: 'Connection timeout',
    },
  ],
};

beforeEach(() => {
  mockFetch.mockClear();
});

describe('JobHistoryClient', () => {
  it('renders loading text initially', () => {
    // Return promises that never resolve so loading state persists
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<JobHistoryClient />);
    expect(screen.getByText('Loading job history...')).toBeInTheDocument();
  });

  it('renders error message on API failure', async () => {
    mockFetch.mockResolvedValue(mockJsonResponse(null, false));
    render(<JobHistoryClient />);
    await waitFor(() => {
      expect(screen.getByText('API error')).toBeInTheDocument();
    });
  });

  it('renders summary stats on success', async () => {
    mockFetch
      .mockResolvedValueOnce(mockJsonResponse(mockHistoryJobs)) // history
      .mockResolvedValueOnce(mockJsonResponse(mockSummary)); // summary
    render(<JobHistoryClient />);
    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument(); // total jobs
      expect(screen.getByText('80.0%')).toBeInTheDocument(); // success rate
      expect(screen.getByText('1')).toBeInTheDocument(); // failed
    });
  });

  it('formats avg duration in minutes', async () => {
    // 125.5 seconds → 2.1m
    mockFetch
      .mockResolvedValueOnce(mockJsonResponse(mockHistoryJobs))
      .mockResolvedValueOnce(mockJsonResponse(mockSummary));
    render(<JobHistoryClient />);
    await waitFor(() => {
      expect(screen.getByText('2.1m')).toBeInTheDocument();
    });
  });

  it('renders job names in the table', async () => {
    mockFetch
      .mockResolvedValueOnce(mockJsonResponse(mockHistoryJobs))
      .mockResolvedValueOnce(mockJsonResponse(mockSummary));
    render(<JobHistoryClient />);
    await waitFor(() => {
      expect(screen.getByText('daily_prices')).toBeInTheDocument();
      expect(screen.getByText('drift_audit')).toBeInTheDocument();
    });
  });

  it('renders job status badges', async () => {
    mockFetch
      .mockResolvedValueOnce(mockJsonResponse(mockHistoryJobs))
      .mockResolvedValueOnce(mockJsonResponse(mockSummary));
    render(<JobHistoryClient />);
    await waitFor(() => {
      expect(screen.getByText('success')).toBeInTheDocument();
      expect(screen.getByText('failed')).toBeInTheDocument();
    });
  });

  it('renders duration for completed jobs', async () => {
    mockFetch
      .mockResolvedValueOnce(mockJsonResponse(mockHistoryJobs))
      .mockResolvedValueOnce(mockJsonResponse(mockSummary));
    render(<JobHistoryClient />);
    await waitFor(() => {
      // 45.2 seconds → "45.2s"
      expect(screen.getByText('45.2s')).toBeInTheDocument();
    });
  });

  it('renders em dash for null duration', async () => {
    mockFetch
      .mockResolvedValueOnce(mockJsonResponse(mockHistoryJobs))
      .mockResolvedValueOnce(mockJsonResponse(mockSummary));
    render(<JobHistoryClient />);
    await waitFor(() => {
      // The failed job has null duration → "—"
      const dashes = screen.getAllByText('—');
      expect(dashes.length).toBeGreaterThan(0);
    });
  });

  it('filter buttons are rendered', async () => {
    mockFetch
      .mockResolvedValueOnce(mockJsonResponse(mockHistoryJobs))
      .mockResolvedValueOnce(mockJsonResponse(mockSummary));
    render(<JobHistoryClient />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Success' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Failed' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Running' })).toBeInTheDocument();
    });
  });

  it('clicking Failed filter triggers new fetch with status param', async () => {
    mockFetch
      .mockResolvedValueOnce(mockJsonResponse(mockHistoryJobs))
      .mockResolvedValueOnce(mockJsonResponse(mockSummary))
      .mockResolvedValueOnce(mockJsonResponse({ jobs: [] })) // filtered history
      .mockResolvedValueOnce(mockJsonResponse(mockSummary)); // summary again
    render(<JobHistoryClient />);
    await waitFor(() => screen.getByRole('button', { name: 'Failed' }));
    fireEvent.click(screen.getByRole('button', { name: 'Failed' }));
    await waitFor(() => {
      // Verify fetch was called with status=failed
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('status=failed'),
        expect.any(Object)
      );
    });
  });
});
