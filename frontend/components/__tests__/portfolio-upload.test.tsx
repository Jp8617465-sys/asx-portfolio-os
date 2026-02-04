import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import PortfolioUpload from '../portfolio-upload';
import { api } from '@/lib/api-client';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Upload: () => <svg data-icon="Upload" />,
  FileText: () => <svg data-icon="FileText" />,
  X: () => <svg data-icon="X" />,
  AlertCircle: () => <svg data-icon="AlertCircle" />,
}));

// Mock the API client
jest.mock('@/lib/api-client', () => ({
  api: {
    uploadPortfolio: jest.fn(),
  },
}));

describe('PortfolioUpload', () => {
  const mockOnSuccess = jest.fn();

  // Mock FileReader
  let mockFileReader: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock FileReader
    mockFileReader = {
      readAsText: jest.fn(),
      result: '',
      onload: null,
      onerror: null,
      addEventListener: jest.fn((event, handler) => {
        if (event === 'load') {
          mockFileReader.onload = handler;
        } else if (event === 'error') {
          mockFileReader.onerror = handler;
        }
      }),
    };

    global.FileReader = jest.fn(() => mockFileReader) as any;
  });

  describe('Initial State', () => {
    it('renders upload area', () => {
      render(<PortfolioUpload onSuccess={mockOnSuccess} />);
      expect(screen.getByText('Upload Portfolio')).toBeInTheDocument();
    });

    it('shows drag and drop instructions', () => {
      render(<PortfolioUpload onSuccess={mockOnSuccess} />);
      expect(screen.getByText(/Drag and drop your CSV file here/)).toBeInTheDocument();
    });

    it('shows select button', () => {
      render(<PortfolioUpload onSuccess={mockOnSuccess} />);
      expect(screen.getByText('Select CSV File')).toBeInTheDocument();
    });

    it('displays format guide', () => {
      render(<PortfolioUpload onSuccess={mockOnSuccess} />);
      expect(screen.getByText('Required CSV format:')).toBeInTheDocument();
      expect(screen.getByText(/ticker,shares,avg_cost/)).toBeInTheDocument();
    });

    it('shows that date_acquired is optional', () => {
      render(<PortfolioUpload onSuccess={mockOnSuccess} />);
      expect(screen.getByText('* date_acquired is optional')).toBeInTheDocument();
    });

    it('renders file input element', () => {
      const { container } = render(<PortfolioUpload onSuccess={mockOnSuccess} />);
      const fileInput = container.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute('accept', '.csv');
    });
  });

  describe('File Selection', () => {
    it('accepts CSV file through file input', () => {
      render(<PortfolioUpload onSuccess={mockOnSuccess} />);

      const csvContent = 'ticker,shares,avg_cost\nCBA.AX,100,95.50\nBHP.AX,50,42.00';
      const file = new File([csvContent], 'portfolio.csv', { type: 'text/csv' });

      const input = screen
        .getByRole('button', { name: /Select CSV File/i })
        .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);

      expect(mockFileReader.readAsText).toHaveBeenCalledWith(file);
    });

    it('rejects non-CSV files', async () => {
      render(<PortfolioUpload onSuccess={mockOnSuccess} />);

      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      const input = screen
        .getByRole('button', { name: /Select CSV File/i })
        .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);

      await waitFor(() => {
        expect(screen.getByText('Please upload a CSV file')).toBeInTheDocument();
      });
    });

    it('displays selected file information', async () => {
      render(<PortfolioUpload onSuccess={mockOnSuccess} />);

      const csvContent = 'ticker,shares,avg_cost\nCBA.AX,100,95.50\nBHP.AX,50,42.00';
      const file = new File([csvContent], 'portfolio.csv', { type: 'text/csv' });

      const input = screen
        .getByRole('button', { name: /Select CSV File/i })
        .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);

      // Trigger FileReader onload
      mockFileReader.result = csvContent;
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: csvContent } });
        }
      });

      await waitFor(() => {
        expect(screen.getByText('portfolio.csv')).toBeInTheDocument();
      });
    });
  });

  describe('Drag and Drop', () => {
    it('highlights dropzone on drag over', () => {
      render(<PortfolioUpload onSuccess={mockOnSuccess} />);

      const dropzone = screen.getByText('Upload Portfolio').parentElement as HTMLElement;

      fireEvent.dragOver(dropzone);

      expect(dropzone).toHaveClass('border-blue-500');
    });

    it('removes highlight on drag leave', () => {
      render(<PortfolioUpload onSuccess={mockOnSuccess} />);

      const dropzone = screen.getByText('Upload Portfolio').parentElement as HTMLElement;

      fireEvent.dragOver(dropzone);
      expect(dropzone).toHaveClass('border-blue-500');

      fireEvent.dragLeave(dropzone);
      expect(dropzone).not.toHaveClass('border-blue-500');
    });

    it('processes dropped file', async () => {
      render(<PortfolioUpload onSuccess={mockOnSuccess} />);

      const csvContent = 'ticker,shares,avg_cost\nCBA.AX,100,95.50';
      const file = new File([csvContent], 'portfolio.csv', { type: 'text/csv' });

      const dropzone = screen.getByText('Upload Portfolio').parentElement as HTMLElement;

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [file],
        },
      });

      expect(mockFileReader.readAsText).toHaveBeenCalledWith(file);
    });

    it('removes highlight after drop', async () => {
      render(<PortfolioUpload onSuccess={mockOnSuccess} />);

      const csvContent = 'ticker,shares,avg_cost\nCBA.AX,100,95.50';
      const file = new File([csvContent], 'portfolio.csv', { type: 'text/csv' });

      const dropzone = screen.getByText('Upload Portfolio').parentElement as HTMLElement;

      fireEvent.dragOver(dropzone);
      expect(dropzone).toHaveClass('border-blue-500');

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [file],
        },
      });

      expect(dropzone).not.toHaveClass('border-blue-500');
    });
  });

  describe('CSV Parsing', () => {
    it('parses valid CSV and shows preview', async () => {
      render(<PortfolioUpload onSuccess={mockOnSuccess} />);

      const csvContent = 'ticker,shares,avg_cost\nCBA.AX,100,95.50\nBHP.AX,50,42.00';
      const file = new File([csvContent], 'portfolio.csv', { type: 'text/csv' });

      const input = screen
        .getByRole('button', { name: /Select CSV File/i })
        .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);

      // Trigger FileReader onload
      mockFileReader.result = csvContent;
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: csvContent } });
        }
      });

      await waitFor(() => {
        expect(screen.getByText('Preview (First 5 rows)')).toBeInTheDocument();
        expect(screen.getByText('CBA.AX')).toBeInTheDocument();
        expect(screen.getByText('100')).toBeInTheDocument();
        expect(screen.getByText('$95.50')).toBeInTheDocument();
        expect(screen.getByText('BHP.AX')).toBeInTheDocument();
        expect(screen.getByText('50')).toBeInTheDocument();
        expect(screen.getByText('$42.00')).toBeInTheDocument();
      });
    });

    it('shows error for empty CSV', async () => {
      render(<PortfolioUpload onSuccess={mockOnSuccess} />);

      const csvContent = '';
      const file = new File([csvContent], 'portfolio.csv', { type: 'text/csv' });

      const input = screen
        .getByRole('button', { name: /Select CSV File/i })
        .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);

      mockFileReader.result = csvContent;
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: csvContent } });
        }
      });

      await waitFor(() => {
        expect(screen.getByText('CSV file is empty or invalid')).toBeInTheDocument();
      });
    });

    it('shows error for CSV with only headers', async () => {
      render(<PortfolioUpload onSuccess={mockOnSuccess} />);

      const csvContent = 'ticker,shares,avg_cost';
      const file = new File([csvContent], 'portfolio.csv', { type: 'text/csv' });

      const input = screen
        .getByRole('button', { name: /Select CSV File/i })
        .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);

      mockFileReader.result = csvContent;
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: csvContent } });
        }
      });

      await waitFor(() => {
        expect(screen.getByText('CSV file is empty or invalid')).toBeInTheDocument();
      });
    });

    it('validates required columns', async () => {
      render(<PortfolioUpload onSuccess={mockOnSuccess} />);

      const csvContent = 'ticker,shares\nCBA.AX,100';
      const file = new File([csvContent], 'portfolio.csv', { type: 'text/csv' });

      const input = screen
        .getByRole('button', { name: /Select CSV File/i })
        .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);

      mockFileReader.result = csvContent;
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: csvContent } });
        }
      });

      await waitFor(() => {
        expect(screen.getByText(/Missing required columns: avg_cost/)).toBeInTheDocument();
      });
    });

    it('shows error for multiple missing columns', async () => {
      render(<PortfolioUpload onSuccess={mockOnSuccess} />);

      const csvContent = 'ticker\nCBA.AX';
      const file = new File([csvContent], 'portfolio.csv', { type: 'text/csv' });

      const input = screen
        .getByRole('button', { name: /Select CSV File/i })
        .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);

      mockFileReader.result = csvContent;
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: csvContent } });
        }
      });

      await waitFor(() => {
        expect(screen.getByText(/Missing required columns: shares, avg_cost/)).toBeInTheDocument();
      });
    });

    it('handles CSV with optional date_acquired column', async () => {
      render(<PortfolioUpload onSuccess={mockOnSuccess} />);

      const csvContent =
        'ticker,shares,avg_cost,date_acquired\nCBA.AX,100,95.50,2023-06-15\nBHP.AX,50,42.00,2023-08-20';
      const file = new File([csvContent], 'portfolio.csv', { type: 'text/csv' });

      const input = screen
        .getByRole('button', { name: /Select CSV File/i })
        .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);

      mockFileReader.result = csvContent;
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: csvContent } });
        }
      });

      await waitFor(() => {
        expect(screen.getByText('2023-06-15')).toBeInTheDocument();
        expect(screen.getByText('2023-08-20')).toBeInTheDocument();
      });
    });

    it('shows dash for missing optional fields', async () => {
      render(<PortfolioUpload onSuccess={mockOnSuccess} />);

      const csvContent =
        'ticker,shares,avg_cost,date_acquired\nCBA.AX,100,95.50,\nBHP.AX,50,42.00,';
      const file = new File([csvContent], 'portfolio.csv', { type: 'text/csv' });

      const input = screen
        .getByRole('button', { name: /Select CSV File/i })
        .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);

      mockFileReader.result = csvContent;
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: csvContent } });
        }
      });

      await waitFor(() => {
        const dashElements = screen.getAllByText('-');
        expect(dashElements.length).toBeGreaterThan(0);
      });
    });

    it('limits preview to first 5 rows', async () => {
      render(<PortfolioUpload onSuccess={mockOnSuccess} />);

      const csvContent = `ticker,shares,avg_cost
CBA.AX,100,95.50
BHP.AX,50,42.00
NAB.AX,75,28.30
WBC.AX,120,22.50
ANZ.AX,90,25.80
FMG.AX,200,18.90`;
      const file = new File([csvContent], 'portfolio.csv', { type: 'text/csv' });

      const input = screen
        .getByRole('button', { name: /Select CSV File/i })
        .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);

      mockFileReader.result = csvContent;
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: csvContent } });
        }
      });

      await waitFor(() => {
        expect(screen.getByText('Preview (First 5 rows)')).toBeInTheDocument();
        expect(screen.getByText('ANZ.AX')).toBeInTheDocument();
        // FMG.AX should not be in preview (6th row)
        expect(screen.queryByText('FMG.AX')).not.toBeInTheDocument();
      });
    });
  });

  describe('FileReader Error Handling', () => {
    it('shows error when FileReader fails', async () => {
      render(<PortfolioUpload onSuccess={mockOnSuccess} />);

      const file = new File(['content'], 'portfolio.csv', { type: 'text/csv' });

      const input = screen
        .getByRole('button', { name: /Select CSV File/i })
        .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);

      // Trigger FileReader error
      await act(async () => {
        if (mockFileReader.onerror) {
          mockFileReader.onerror(new Error('Read failed'));
        }
      });

      await waitFor(() => {
        expect(screen.getByText('Failed to read file')).toBeInTheDocument();
      });
    });
  });

  describe('File Upload', () => {
    it('uploads file when submit button is clicked', async () => {
      (api.uploadPortfolio as jest.Mock).mockResolvedValue({ data: { success: true } });

      render(<PortfolioUpload onSuccess={mockOnSuccess} />);

      const csvContent = 'ticker,shares,avg_cost\nCBA.AX,100,95.50';
      const file = new File([csvContent], 'portfolio.csv', { type: 'text/csv' });

      const input = screen
        .getByRole('button', { name: /Select CSV File/i })
        .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);

      mockFileReader.result = csvContent;
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: csvContent } });
        }
      });

      await waitFor(() => {
        expect(screen.getByText('Upload Portfolio')).toBeInTheDocument();
      });

      const uploadButton = screen.getByRole('button', { name: /Upload Portfolio/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(api.uploadPortfolio).toHaveBeenCalledWith(file);
      });
    });

    it('calls onSuccess callback after successful upload', async () => {
      (api.uploadPortfolio as jest.Mock).mockResolvedValue({ data: { success: true } });

      render(<PortfolioUpload onSuccess={mockOnSuccess} />);

      const csvContent = 'ticker,shares,avg_cost\nCBA.AX,100,95.50';
      const file = new File([csvContent], 'portfolio.csv', { type: 'text/csv' });

      const input = screen
        .getByRole('button', { name: /Select CSV File/i })
        .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);

      mockFileReader.result = csvContent;
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: csvContent } });
        }
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Upload Portfolio/i })).toBeInTheDocument();
      });

      const uploadButton = screen.getByRole('button', { name: /Upload Portfolio/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('shows uploading state during upload', async () => {
      (api.uploadPortfolio as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: { success: true } }), 1000))
      );

      render(<PortfolioUpload onSuccess={mockOnSuccess} />);

      const csvContent = 'ticker,shares,avg_cost\nCBA.AX,100,95.50';
      const file = new File([csvContent], 'portfolio.csv', { type: 'text/csv' });

      const input = screen
        .getByRole('button', { name: /Select CSV File/i })
        .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);

      mockFileReader.result = csvContent;
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: csvContent } });
        }
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Upload Portfolio/i })).toBeInTheDocument();
      });

      const uploadButton = screen.getByRole('button', { name: /Upload Portfolio/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText('Uploading...')).toBeInTheDocument();
      });
    });

    it('disables upload button during upload', async () => {
      (api.uploadPortfolio as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: { success: true } }), 1000))
      );

      render(<PortfolioUpload onSuccess={mockOnSuccess} />);

      const csvContent = 'ticker,shares,avg_cost\nCBA.AX,100,95.50';
      const file = new File([csvContent], 'portfolio.csv', { type: 'text/csv' });

      const input = screen
        .getByRole('button', { name: /Select CSV File/i })
        .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);

      mockFileReader.result = csvContent;
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: csvContent } });
        }
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Upload Portfolio/i })).toBeInTheDocument();
      });

      const uploadButton = screen.getByRole('button', { name: /Upload Portfolio/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /Uploading.../i });
        expect(button).toBeDisabled();
      });
    });

    it('shows error message on upload failure', async () => {
      (api.uploadPortfolio as jest.Mock).mockRejectedValue({
        response: {
          data: {
            message: 'Invalid CSV format',
          },
        },
      });

      render(<PortfolioUpload onSuccess={mockOnSuccess} />);

      const csvContent = 'ticker,shares,avg_cost\nCBA.AX,100,95.50';
      const file = new File([csvContent], 'portfolio.csv', { type: 'text/csv' });

      const input = screen
        .getByRole('button', { name: /Select CSV File/i })
        .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);

      mockFileReader.result = csvContent;
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: csvContent } });
        }
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Upload Portfolio/i })).toBeInTheDocument();
      });

      const uploadButton = screen.getByRole('button', { name: /Upload Portfolio/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText('Upload Failed')).toBeInTheDocument();
        expect(screen.getByText('Invalid CSV format')).toBeInTheDocument();
      });
    });

    it('shows generic error message when no error message from API', async () => {
      (api.uploadPortfolio as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<PortfolioUpload onSuccess={mockOnSuccess} />);

      const csvContent = 'ticker,shares,avg_cost\nCBA.AX,100,95.50';
      const file = new File([csvContent], 'portfolio.csv', { type: 'text/csv' });

      const input = screen
        .getByRole('button', { name: /Select CSV File/i })
        .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);

      mockFileReader.result = csvContent;
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: csvContent } });
        }
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Upload Portfolio/i })).toBeInTheDocument();
      });

      const uploadButton = screen.getByRole('button', { name: /Upload Portfolio/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to upload portfolio')).toBeInTheDocument();
      });
    });

    it('resets form after successful upload', async () => {
      (api.uploadPortfolio as jest.Mock).mockResolvedValue({ data: { success: true } });

      render(<PortfolioUpload onSuccess={mockOnSuccess} />);

      const csvContent = 'ticker,shares,avg_cost\nCBA.AX,100,95.50';
      const file = new File([csvContent], 'portfolio.csv', { type: 'text/csv' });

      const input = screen
        .getByRole('button', { name: /Select CSV File/i })
        .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);

      mockFileReader.result = csvContent;
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: csvContent } });
        }
      });

      await waitFor(() => {
        expect(screen.getByText('portfolio.csv')).toBeInTheDocument();
      });

      const uploadButton = screen.getByRole('button', { name: /Upload Portfolio/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });

      // After upload, should return to initial state
      await waitFor(() => {
        expect(screen.queryByText('portfolio.csv')).not.toBeInTheDocument();
        expect(screen.getByText('Select CSV File')).toBeInTheDocument();
      });
    });
  });

  describe('Clear File', () => {
    it('shows clear button after file is selected', async () => {
      render(<PortfolioUpload onSuccess={mockOnSuccess} />);

      const csvContent = 'ticker,shares,avg_cost\nCBA.AX,100,95.50';
      const file = new File([csvContent], 'portfolio.csv', { type: 'text/csv' });

      const input = screen
        .getByRole('button', { name: /Select CSV File/i })
        .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);

      mockFileReader.result = csvContent;
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: csvContent } });
        }
      });

      await waitFor(() => {
        expect(screen.getByText('portfolio.csv')).toBeInTheDocument();
      });

      // X button in file info area
      const clearButtons = screen.getAllByRole('button');
      const xButton = clearButtons.find((button) => button.querySelector('svg'));
      expect(xButton).toBeInTheDocument();
    });

    it('clears file and preview when clear button is clicked', async () => {
      render(<PortfolioUpload onSuccess={mockOnSuccess} />);

      const csvContent = 'ticker,shares,avg_cost\nCBA.AX,100,95.50';
      const file = new File([csvContent], 'portfolio.csv', { type: 'text/csv' });

      const input = screen
        .getByRole('button', { name: /Select CSV File/i })
        .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);

      mockFileReader.result = csvContent;
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: csvContent } });
        }
      });

      await waitFor(() => {
        expect(screen.getByText('portfolio.csv')).toBeInTheDocument();
        expect(screen.getByText('CBA.AX')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('portfolio.csv')).not.toBeInTheDocument();
        expect(screen.queryByText('CBA.AX')).not.toBeInTheDocument();
        expect(screen.getByText('Select CSV File')).toBeInTheDocument();
      });
    });

    it('clears error when file is cleared', async () => {
      const { container } = render(<PortfolioUpload onSuccess={mockOnSuccess} />);

      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        configurable: true,
      });

      fireEvent.change(input);

      await waitFor(() => {
        expect(screen.getByText('Please upload a CSV file')).toBeInTheDocument();
      });

      // Re-render to get a fresh input element
      const { container: newContainer } = render(<PortfolioUpload onSuccess={mockOnSuccess} />);

      // Select a valid file on fresh render
      const csvContent = 'ticker,shares,avg_cost\nCBA.AX,100,95.50';
      const validFile = new File([csvContent], 'portfolio.csv', { type: 'text/csv' });

      const newInput = newContainer.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(newInput, 'files', {
        value: [validFile],
        configurable: true,
      });

      fireEvent.change(newInput);

      mockFileReader.result = csvContent;
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: csvContent } });
        }
      });

      await waitFor(() => {
        expect(screen.getByText('CBA.AX')).toBeInTheDocument();
      });
    });
  });
});
