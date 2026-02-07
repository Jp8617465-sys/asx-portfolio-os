import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsStatus from '../SettingsStatus';
import useSWR from 'swr';
import { getHealth } from '@/lib/api';
import { toast } from '../ui/use-toast';

// Mock SWR
jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock API
jest.mock('@/lib/api', () => ({
  getHealth: jest.fn(),
}));

// Mock toast
jest.mock('../ui/use-toast', () => ({
  toast: jest.fn(),
}));

const mockUseSWR = useSWR as jest.MockedFunction<typeof useSWR>;
const mockGetHealth = getHealth as jest.MockedFunction<typeof getHealth>;
const mockToast = toast as jest.MockedFunction<typeof toast>;

describe('SettingsStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('displays "Checking..." when data is undefined', () => {
      mockUseSWR.mockReturnValue({
        data: undefined,
        error: undefined,
        isLoading: true,
        isValidating: false,
        mutate: jest.fn(),
      } as any);

      render(<SettingsStatus />);

      expect(screen.getByText('Checking...')).toBeInTheDocument();
    });

    it('applies correct styling classes for loading state', () => {
      mockUseSWR.mockReturnValue({
        data: undefined,
        error: undefined,
        isLoading: true,
        isValidating: false,
        mutate: jest.fn(),
      } as any);

      render(<SettingsStatus />);

      const badge = screen.getByText('Checking...');
      expect(badge).toHaveClass('bg-slate-100');
      expect(badge).toHaveClass('text-slate-600');
    });

    it('shows loading indicator on badge during check', () => {
      mockUseSWR.mockReturnValue({
        data: undefined,
        error: undefined,
        isLoading: true,
        isValidating: false,
        mutate: jest.fn(),
      } as any);

      render(<SettingsStatus />);

      const loadingBadge = screen.getByText('Checking...');
      expect(loadingBadge).toBeInTheDocument();
    });
  });

  describe('Success Healthy State', () => {
    it('displays "Healthy" when health check returns ok status', () => {
      mockUseSWR.mockReturnValue({
        data: { status: 'ok' },
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: jest.fn(),
      } as any);

      render(<SettingsStatus />);

      expect(screen.getByText('Healthy')).toBeInTheDocument();
    });

    it('applies green/accent styling for healthy state', () => {
      mockUseSWR.mockReturnValue({
        data: { status: 'ok' },
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: jest.fn(),
      } as any);

      render(<SettingsStatus />);

      const badge = screen.getByText('Healthy');
      expect(badge).toHaveClass('bg-accentSoft');
      expect(badge).toHaveClass('text-accent');
    });

    it('renders card with correct title', () => {
      mockUseSWR.mockReturnValue({
        data: { status: 'ok' },
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: jest.fn(),
      } as any);

      render(<SettingsStatus />);

      expect(screen.getByText('API Test')).toBeInTheDocument();
    });

    it('displays health check description', () => {
      mockUseSWR.mockReturnValue({
        data: { status: 'ok' },
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: jest.fn(),
      } as any);

      render(<SettingsStatus />);

      expect(
        screen.getByText(/This check calls .* to confirm the backend is reachable/i)
      ).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('displays "Offline" when SWR returns error', () => {
      mockUseSWR.mockReturnValue({
        data: undefined,
        error: new Error('Network error'),
        isLoading: false,
        isValidating: false,
        mutate: jest.fn(),
      } as any);

      render(<SettingsStatus />);

      expect(screen.getByText('Offline')).toBeInTheDocument();
    });

    it('applies red styling for offline state', () => {
      mockUseSWR.mockReturnValue({
        data: undefined,
        error: new Error('Network error'),
        isLoading: false,
        isValidating: false,
        mutate: jest.fn(),
      } as any);

      render(<SettingsStatus />);

      const badge = screen.getByText('Offline');
      expect(badge).toHaveClass('bg-red-100');
      expect(badge).toHaveClass('text-red-700');
    });

    it('still renders Test API button when offline', () => {
      mockUseSWR.mockReturnValue({
        data: undefined,
        error: new Error('Network error'),
        isLoading: false,
        isValidating: false,
        mutate: jest.fn(),
      } as any);

      render(<SettingsStatus />);

      expect(screen.getByText('Test API')).toBeInTheDocument();
    });
  });

  describe('Test API Button', () => {
    it('renders Test API button', () => {
      mockUseSWR.mockReturnValue({
        data: { status: 'ok' },
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: jest.fn(),
      } as any);

      render(<SettingsStatus />);

      const button = screen.getByText('Test API');
      expect(button).toBeInTheDocument();
    });

    it('button is enabled by default', () => {
      mockUseSWR.mockReturnValue({
        data: { status: 'ok' },
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: jest.fn(),
      } as any);

      render(<SettingsStatus />);

      const button = screen.getByText('Test API');
      expect(button).not.toBeDisabled();
    });

    it('calls getHealth when Test API button is clicked', async () => {
      mockUseSWR.mockReturnValue({
        data: { status: 'ok' },
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: jest.fn(),
      } as any);

      mockGetHealth.mockResolvedValue({ status: 'ok' });

      render(<SettingsStatus />);

      const button = screen.getByText('Test API');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockGetHealth).toHaveBeenCalledTimes(1);
      });
    });

    it('shows "Testing..." text while test is running', async () => {
      mockUseSWR.mockReturnValue({
        data: { status: 'ok' },
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: jest.fn(),
      } as any);

      // Make getHealth return a promise that doesn't resolve immediately
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockGetHealth.mockReturnValue(promise as any);

      render(<SettingsStatus />);

      const button = screen.getByText('Test API');
      fireEvent.click(button);

      // Button should show "Testing..." immediately
      expect(screen.getByText('Testing...')).toBeInTheDocument();

      // Clean up by resolving the promise
      resolvePromise!({ status: 'ok' });
      await waitFor(() => {
        expect(screen.getByText('Test API')).toBeInTheDocument();
      });
    });

    it('disables button while testing', async () => {
      mockUseSWR.mockReturnValue({
        data: { status: 'ok' },
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: jest.fn(),
      } as any);

      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockGetHealth.mockReturnValue(promise as any);

      render(<SettingsStatus />);

      const button = screen.getByText('Test API');
      fireEvent.click(button);

      await waitFor(() => {
        const testingText = screen.getByText('Testing...');
        const testingButton = testingText.closest('button')!;
        expect(testingButton).toBeDisabled();
      });

      // Clean up
      resolvePromise!({ status: 'ok' });
      await waitFor(() => {
        expect(screen.getByText('Test API')).toBeInTheDocument();
      });
    });

    it('re-enables button after test completes successfully', async () => {
      mockUseSWR.mockReturnValue({
        data: { status: 'ok' },
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: jest.fn(),
      } as any);

      mockGetHealth.mockResolvedValue({ status: 'ok' });

      render(<SettingsStatus />);

      const button = screen.getByText('Test API');
      fireEvent.click(button);

      await waitFor(() => {
        const finalButton = screen.getByText('Test API');
        expect(finalButton).not.toBeDisabled();
      });
    });

    it('re-enables button after test fails', async () => {
      mockUseSWR.mockReturnValue({
        data: { status: 'ok' },
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: jest.fn(),
      } as any);

      mockGetHealth.mockRejectedValue(new Error('API Error'));

      render(<SettingsStatus />);

      const button = screen.getByText('Test API');
      fireEvent.click(button);

      await waitFor(() => {
        const finalButton = screen.getByText('Test API');
        expect(finalButton).not.toBeDisabled();
      });
    });
  });

  describe('Toast Notifications', () => {
    it('shows success toast when API test succeeds', async () => {
      mockUseSWR.mockReturnValue({
        data: { status: 'ok' },
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: jest.fn(),
      } as any);

      mockGetHealth.mockResolvedValue({ status: 'ok' });

      render(<SettingsStatus />);

      fireEvent.click(screen.getByText('Test API'));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'API OK',
          description: 'Health check returned: ok',
        });
      });
    });

    it('shows success toast with custom status', async () => {
      mockUseSWR.mockReturnValue({
        data: { status: 'ok' },
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: jest.fn(),
      } as any);

      mockGetHealth.mockResolvedValue({ status: 'healthy' });

      render(<SettingsStatus />);

      fireEvent.click(screen.getByText('Test API'));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'API OK',
          description: 'Health check returned: healthy',
        });
      });
    });

    it('shows error toast when API test fails', async () => {
      mockUseSWR.mockReturnValue({
        data: { status: 'ok' },
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: jest.fn(),
      } as any);

      mockGetHealth.mockRejectedValue(new Error('Connection refused'));

      render(<SettingsStatus />);

      fireEvent.click(screen.getByText('Test API'));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'API Error',
          description: 'Health check failed. Verify OS_API_KEY and API URL.',
        });
      });
    });

    it('shows success toast when response has no status field', async () => {
      mockUseSWR.mockReturnValue({
        data: { status: 'ok' },
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: jest.fn(),
      } as any);

      mockGetHealth.mockResolvedValue({} as any);

      render(<SettingsStatus />);

      fireEvent.click(screen.getByText('Test API'));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'API OK',
          description: 'Health check returned: ok',
        });
      });
    });
  });

  describe('Status Labels and Colors', () => {
    it('uses correct render status label text', () => {
      mockUseSWR.mockReturnValue({
        data: { status: 'ok' },
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: jest.fn(),
      } as any);

      render(<SettingsStatus />);

      expect(screen.getByText('Render Status')).toBeInTheDocument();
    });

    it('displays all three possible states correctly', () => {
      // Test checking state
      mockUseSWR.mockReturnValue({
        data: undefined,
        error: undefined,
        isLoading: true,
        isValidating: false,
        mutate: jest.fn(),
      } as any);

      const { rerender } = render(<SettingsStatus />);
      expect(screen.getByText('Checking...')).toBeInTheDocument();

      // Test healthy state
      mockUseSWR.mockReturnValue({
        data: { status: 'ok' },
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: jest.fn(),
      } as any);

      rerender(<SettingsStatus />);
      expect(screen.getByText('Healthy')).toBeInTheDocument();

      // Test offline state
      mockUseSWR.mockReturnValue({
        data: undefined,
        error: new Error('Failed'),
        isLoading: false,
        isValidating: false,
        mutate: jest.fn(),
      } as any);

      rerender(<SettingsStatus />);
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });
  });
});
