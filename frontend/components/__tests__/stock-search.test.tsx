import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import StockSearch from '../stock-search';
import { api } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Search: () => <svg data-icon="Search" />,
  TrendingUp: () => <svg data-icon="TrendingUp" />,
  Plus: () => <svg data-icon="Plus" />,
}));

// Mock the API client
jest.mock('@/lib/api-client', () => ({
  api: {
    search: jest.fn(),
    addToWatchlist: jest.fn(),
  },
}));

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock notification store
jest.mock('@/lib/stores/notification-store', () => ({
  notify: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('StockSearch', () => {
  // Mock data matches the actual SearchResult type from the component
  const mockSearchResults = [
    {
      symbol: 'CBA.AX',
      name: 'Commonwealth Bank',
      sector: 'Financials',
      market_cap: 180000000000,
    },
    {
      symbol: 'BHP.AX',
      name: 'BHP Group',
      sector: 'Materials',
      market_cap: 150000000000,
    },
    {
      symbol: 'NAB.AX',
      name: 'National Australia Bank',
      sector: 'Financials',
      market_cap: 95000000000,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    it('renders search input with default placeholder', () => {
      render(<StockSearch />);
      expect(screen.getByPlaceholderText('Search ASX stocks...')).toBeInTheDocument();
    });

    it('renders search input with custom placeholder', () => {
      render(<StockSearch placeholder="Find stocks..." />);
      expect(screen.getByPlaceholderText('Find stocks...')).toBeInTheDocument();
    });

    it('autofocuses input when autoFocus is true', () => {
      render(<StockSearch autoFocus={true} />);
      const input = screen.getByPlaceholderText('Search ASX stocks...');
      expect(input).toHaveFocus();
    });

    it('does not show results dropdown initially', () => {
      render(<StockSearch />);
      expect(screen.queryByText('CBA.AX')).not.toBeInTheDocument();
    });

    it('shows search icon', () => {
      const { container } = render(<StockSearch />);
      // Search icon from lucide-react should be present
      const searchIcon = container.querySelector('svg');
      expect(searchIcon).toBeInTheDocument();
    });
  });

  describe('Debounced Search', () => {
    it('does not fetch immediately when typing', async () => {
      render(<StockSearch />);
      const input = screen.getByPlaceholderText('Search ASX stocks...');

      fireEvent.change(input, { target: { value: 'CB' } });

      expect(api.search).not.toHaveBeenCalled();
    });

    it('fetches after 300ms debounce delay', async () => {
      (api.search as jest.Mock).mockResolvedValue({
        data: { results: mockSearchResults },
      });

      render(<StockSearch />);
      const input = screen.getByPlaceholderText('Search ASX stocks...');

      fireEvent.change(input, { target: { value: 'CB' } });

      // Advance timers by 300ms
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(api.search).toHaveBeenCalledWith('CB');
      });
    });

    it('cancels previous search when typing rapidly', async () => {
      (api.search as jest.Mock).mockResolvedValue({
        data: { results: mockSearchResults },
      });

      render(<StockSearch />);
      const input = screen.getByPlaceholderText('Search ASX stocks...');

      // Type first query
      fireEvent.change(input, { target: { value: 'C' } });

      // Advance 100ms
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Type second query before debounce completes
      fireEvent.change(input, { target: { value: 'CB' } });

      // Advance full 300ms from second query
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        // Only the final query should be called
        expect(api.search).toHaveBeenCalledTimes(1);
        expect(api.search).toHaveBeenCalledWith('CB');
      });
    });

    it('does not search for queries less than 2 characters', async () => {
      render(<StockSearch />);
      const input = screen.getByPlaceholderText('Search ASX stocks...');

      fireEvent.change(input, { target: { value: 'C' } });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      expect(api.search).not.toHaveBeenCalled();
    });

    it('clears results when query is cleared', async () => {
      (api.search as jest.Mock).mockResolvedValue({
        data: { results: mockSearchResults },
      });

      render(<StockSearch />);
      const input = screen.getByPlaceholderText('Search ASX stocks...');

      // Search
      fireEvent.change(input, { target: { value: 'CB' } });
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('CBA.AX')).toBeInTheDocument();
      });

      // Clear input
      fireEvent.change(input, { target: { value: '' } });

      await waitFor(() => {
        expect(screen.queryByText('CBA.AX')).not.toBeInTheDocument();
      });
    });
  });

  describe('Search Results', () => {
    it('renders search results after successful API call', async () => {
      (api.search as jest.Mock).mockResolvedValue({
        data: { results: mockSearchResults },
      });

      render(<StockSearch />);
      const input = screen.getByPlaceholderText('Search ASX stocks...');

      fireEvent.change(input, { target: { value: 'CB' } });
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('CBA.AX')).toBeInTheDocument();
        expect(screen.getByText('Commonwealth Bank')).toBeInTheDocument();
        expect(screen.getByText('BHP.AX')).toBeInTheDocument();
        expect(screen.getByText('BHP Group')).toBeInTheDocument();
      });
    });

    it('displays sector information', async () => {
      (api.search as jest.Mock).mockResolvedValue({
        data: { results: mockSearchResults },
      });

      render(<StockSearch />);
      const input = screen.getByPlaceholderText('Search ASX stocks...');

      fireEvent.change(input, { target: { value: 'CB' } });
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getAllByText('Financials')).toHaveLength(2);
        expect(screen.getByText('Materials')).toBeInTheDocument();
      });
    });

    it('displays formatted market cap', async () => {
      (api.search as jest.Mock).mockResolvedValue({
        data: { results: mockSearchResults },
      });

      render(<StockSearch />);
      const input = screen.getByPlaceholderText('Search ASX stocks...');

      fireEvent.change(input, { target: { value: 'CB' } });
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('$180.0B')).toBeInTheDocument();
        expect(screen.getByText('$150.0B')).toBeInTheDocument();
        expect(screen.getByText('$95.0B')).toBeInTheDocument();
      });
    });

    it('formats market cap in millions when appropriate', async () => {
      const smallCapResults = [
        {
          symbol: 'SMALL.AX',
          name: 'Small Company',
          sector: 'Technology',
          market_cap: 500000000, // 500M
        },
      ];

      (api.search as jest.Mock).mockResolvedValue({
        data: { results: smallCapResults },
      });

      render(<StockSearch />);
      const input = screen.getByPlaceholderText('Search ASX stocks...');

      fireEvent.change(input, { target: { value: 'small' } });
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('$500.0M')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner during API call', async () => {
      (api.search as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: { results: [] } }), 1000))
      );

      render(<StockSearch />);
      const input = screen.getByPlaceholderText('Search ASX stocks...');

      fireEvent.change(input, { target: { value: 'CB' } });
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        const spinner = screen.getByRole('textbox').parentElement?.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
      });
    });

    it('hides loading spinner after API call completes', async () => {
      (api.search as jest.Mock).mockResolvedValue({
        data: { results: mockSearchResults },
      });

      render(<StockSearch />);
      const input = screen.getByPlaceholderText('Search ASX stocks...');

      fireEvent.change(input, { target: { value: 'CB' } });
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('CBA.AX')).toBeInTheDocument();
      });

      const spinner = screen.getByRole('textbox').parentElement?.querySelector('.animate-spin');
      expect(spinner).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('handles API error gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      (api.search as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<StockSearch />);
      const input = screen.getByPlaceholderText('Search ASX stocks...');

      fireEvent.change(input, { target: { value: 'CB' } });
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Search error:', expect.any(Error));
      });

      consoleError.mockRestore();
    });

    it('clears results on error', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      (api.search as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<StockSearch />);
      const input = screen.getByPlaceholderText('Search ASX stocks...');

      fireEvent.change(input, { target: { value: 'CB' } });
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.queryByText('CBA.AX')).not.toBeInTheDocument();
      });
    });
  });

  describe('Empty Results', () => {
    it('shows "No stocks found" message when results are empty', async () => {
      (api.search as jest.Mock).mockResolvedValue({
        data: { results: [] },
      });

      render(<StockSearch />);
      const input = screen.getByPlaceholderText('Search ASX stocks...');

      fireEvent.change(input, { target: { value: 'NONEXISTENT' } });
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText(/No stocks found for/)).toBeInTheDocument();
        expect(screen.getByText(/NONEXISTENT/)).toBeInTheDocument();
      });
    });

    it('shows helpful message for no results', async () => {
      (api.search as jest.Mock).mockResolvedValue({
        data: { results: [] },
      });

      render(<StockSearch />);
      const input = screen.getByPlaceholderText('Search ASX stocks...');

      fireEvent.change(input, { target: { value: 'XYZ' } });
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText(/Try searching for ticker/)).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    beforeEach(async () => {
      (api.search as jest.Mock).mockResolvedValue({
        data: { results: mockSearchResults },
      });
    });

    it('highlights first result with Arrow Down', async () => {
      render(<StockSearch />);
      const input = screen.getByPlaceholderText('Search ASX stocks...');

      fireEvent.change(input, { target: { value: 'CB' } });
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('CBA.AX')).toBeInTheDocument();
      });

      // selectedIndex starts at 0, Arrow Down moves to 1 (second item)
      fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown' });

      // The parent div of the second result should have bg-gray-50
      const secondResultParent = screen.getByText('BHP.AX').closest('div[class*="px-4"]');
      expect(secondResultParent).toHaveClass('bg-gray-50');
    });

    it('moves highlight down with repeated Arrow Down', async () => {
      render(<StockSearch />);
      const input = screen.getByPlaceholderText('Search ASX stocks...');

      fireEvent.change(input, { target: { value: 'CB' } });
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('CBA.AX')).toBeInTheDocument();
      });

      // Press Arrow Down twice - selectedIndex: 0 -> 1 -> 2
      fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown' });

      const thirdResultParent = screen.getByText('NAB.AX').closest('div[class*="px-4"]');
      expect(thirdResultParent).toHaveClass('bg-gray-50');
    });

    it('moves highlight up with Arrow Up', async () => {
      render(<StockSearch />);
      const input = screen.getByPlaceholderText('Search ASX stocks...');

      fireEvent.change(input, { target: { value: 'CB' } });
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('CBA.AX')).toBeInTheDocument();
      });

      // Move down twice (0 -> 1 -> 2), then up once (2 -> 1)
      fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowUp', code: 'ArrowUp' });

      const secondResultParent = screen.getByText('BHP.AX').closest('div[class*="px-4"]');
      expect(secondResultParent).toHaveClass('bg-gray-50');
    });

    it('does not go beyond first result with Arrow Up', async () => {
      render(<StockSearch />);
      const input = screen.getByPlaceholderText('Search ASX stocks...');

      fireEvent.change(input, { target: { value: 'CB' } });
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('CBA.AX')).toBeInTheDocument();
      });

      // Try to move up from initial position (should stay at 0)
      fireEvent.keyDown(input, { key: 'ArrowUp', code: 'ArrowUp' });

      // selectedIndex should still be 0, first result should be highlighted
      const firstResultParent = screen.getByText('CBA.AX').closest('div[class*="px-4"]');
      expect(firstResultParent).toHaveClass('bg-gray-50');
    });

    it('does not go beyond last result with Arrow Down', async () => {
      render(<StockSearch />);
      const input = screen.getByPlaceholderText('Search ASX stocks...');

      fireEvent.change(input, { target: { value: 'CB' } });
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('CBA.AX')).toBeInTheDocument();
      });

      // Press Arrow Down 4 times (more than results length)
      fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown' });

      const lastResultParent = screen.getByText('NAB.AX').closest('div[class*="px-4"]');
      expect(lastResultParent).toHaveClass('bg-gray-50');
    });

    it('selects highlighted result with Enter key', async () => {
      const mockOnSelect = jest.fn();
      render(<StockSearch onSelect={mockOnSelect} />);
      const input = screen.getByPlaceholderText('Search ASX stocks...');

      fireEvent.change(input, { target: { value: 'CB' } });
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('CBA.AX')).toBeInTheDocument();
      });

      // selectedIndex starts at 0, pressing Enter should select first result
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(mockOnSelect).toHaveBeenCalledWith('CBA.AX');
      });
    });

    it('closes dropdown with Escape key', async () => {
      render(<StockSearch />);
      const input = screen.getByPlaceholderText('Search ASX stocks...');

      fireEvent.change(input, { target: { value: 'CB' } });
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('CBA.AX')).toBeInTheDocument();
      });

      fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });

      expect(screen.queryByText('CBA.AX')).not.toBeInTheDocument();
    });
  });

  describe('Click Selection', () => {
    beforeEach(async () => {
      (api.search as jest.Mock).mockResolvedValue({
        data: { results: mockSearchResults },
      });
    });

    it('calls onSelect callback when result is clicked', async () => {
      const mockOnSelect = jest.fn();
      render(<StockSearch onSelect={mockOnSelect} />);
      const input = screen.getByPlaceholderText('Search ASX stocks...');

      fireEvent.change(input, { target: { value: 'CB' } });
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('CBA.AX')).toBeInTheDocument();
      });

      // Find the navigation button (not the add to watchlist button)
      const result = screen.getByText('CBA.AX').closest('button');
      fireEvent.click(result!);

      expect(mockOnSelect).toHaveBeenCalledWith('CBA.AX');
    });

    it('navigates to stock page when onSelect not provided', async () => {
      render(<StockSearch />);
      const input = screen.getByPlaceholderText('Search ASX stocks...');

      fireEvent.change(input, { target: { value: 'CB' } });
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('CBA.AX')).toBeInTheDocument();
      });

      const result = screen.getByText('CBA.AX').closest('button');
      fireEvent.click(result!);

      expect(mockPush).toHaveBeenCalledWith('/stock/CBA.AX');
    });

    it('clears input after selection', async () => {
      const mockOnSelect = jest.fn();
      render(<StockSearch onSelect={mockOnSelect} />);
      const input = screen.getByPlaceholderText('Search ASX stocks...') as HTMLInputElement;

      fireEvent.change(input, { target: { value: 'CB' } });
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('CBA.AX')).toBeInTheDocument();
      });

      const result = screen.getByText('CBA.AX').closest('button');
      fireEvent.click(result!);

      expect(input.value).toBe('');
    });

    it('closes dropdown after selection', async () => {
      const mockOnSelect = jest.fn();
      render(<StockSearch onSelect={mockOnSelect} />);
      const input = screen.getByPlaceholderText('Search ASX stocks...');

      fireEvent.change(input, { target: { value: 'CB' } });
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('CBA.AX')).toBeInTheDocument();
      });

      const result = screen.getByText('CBA.AX').closest('button');
      fireEvent.click(result!);

      await waitFor(() => {
        expect(screen.queryByText('Commonwealth Bank')).not.toBeInTheDocument();
      });
    });
  });

  describe('Click Outside', () => {
    it('closes dropdown when clicking outside', async () => {
      (api.search as jest.Mock).mockResolvedValue({
        data: { results: mockSearchResults },
      });

      render(<StockSearch />);
      const input = screen.getByPlaceholderText('Search ASX stocks...');

      fireEvent.change(input, { target: { value: 'CB' } });
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('CBA.AX')).toBeInTheDocument();
      });

      // Click outside
      fireEvent.mouseDown(document.body);

      await waitFor(() => {
        expect(screen.queryByText('CBA.AX')).not.toBeInTheDocument();
      });
    });
  });
});
