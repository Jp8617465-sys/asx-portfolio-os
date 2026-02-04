import { render, screen, fireEvent } from '@testing-library/react';
import WatchlistTable from '../watchlist-table';
import { WatchlistItem } from '@/lib/types';

const sampleWatchlist: WatchlistItem[] = [
  {
    ticker: 'CBA.AX',
    companyName: 'Commonwealth Bank',
    signal: 'BUY',
    confidence: 78,
    lastPrice: 105.5,
    priceChange: 2.3,
    priceChangeAmount: 2.4,
    lastUpdated: new Date(Date.now() - 300000).toISOString(), // 5 min ago
    addedAt: new Date().toISOString(),
  },
  {
    ticker: 'BHP.AX',
    companyName: 'BHP Group',
    signal: 'SELL',
    confidence: 55,
    lastPrice: 42.1,
    priceChange: -1.8,
    priceChangeAmount: -0.77,
    lastUpdated: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    addedAt: new Date().toISOString(),
  },
];

describe('WatchlistTable', () => {
  it('renders loading spinner when isLoading', () => {
    const { container } = render(<WatchlistTable data={[]} isLoading={true} />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders empty state when data is empty', () => {
    render(<WatchlistTable data={[]} />);
    expect(screen.getByText('Your watchlist is empty')).toBeInTheDocument();
    expect(screen.getByText(/Search for stocks/i)).toBeInTheDocument();
  });

  it('renders ticker and company names', () => {
    render(<WatchlistTable data={sampleWatchlist} />);
    expect(screen.getByText('CBA.AX')).toBeInTheDocument();
    expect(screen.getByText('Commonwealth Bank')).toBeInTheDocument();
    expect(screen.getByText('BHP.AX')).toBeInTheDocument();
    expect(screen.getByText('BHP Group')).toBeInTheDocument();
  });

  it('renders prices formatted to 2 decimals', () => {
    render(<WatchlistTable data={sampleWatchlist} />);
    expect(screen.getByText('$105.50')).toBeInTheDocument();
    expect(screen.getByText('$42.10')).toBeInTheDocument();
  });

  it('renders positive price change with green colour and + prefix', () => {
    render(<WatchlistTable data={[sampleWatchlist[0]]} />);
    expect(screen.getByText('+2.30%')).toBeInTheDocument();
    const greenEl = document.querySelector('.text-green-600');
    expect(greenEl).toBeInTheDocument();
  });

  it('renders negative price change with red colour', () => {
    render(<WatchlistTable data={[sampleWatchlist[1]]} />);
    expect(screen.getByText('-1.80%')).toBeInTheDocument();
    const redEl = document.querySelector('.text-red-600');
    expect(redEl).toBeInTheDocument();
  });

  it('renders confidence percentages', () => {
    render(<WatchlistTable data={sampleWatchlist} />);
    expect(screen.getByText('78%')).toBeInTheDocument();
    expect(screen.getByText('55%')).toBeInTheDocument();
  });

  it('calls onRemove with correct ticker when remove button is clicked', () => {
    const onRemove = jest.fn();
    render(<WatchlistTable data={sampleWatchlist} onRemove={onRemove} />);
    // Remove buttons have title="Remove from watchlist"
    const removeButtons = screen.getAllByTitle('Remove from watchlist');
    fireEvent.click(removeButtons[0]);
    expect(onRemove).toHaveBeenCalledWith('CBA.AX');
  });

  it('shows row count', () => {
    render(<WatchlistTable data={sampleWatchlist} />);
    expect(screen.getByText(/Showing 2 of 2 stocks/)).toBeInTheDocument();
  });

  it('renders time-ago for lastUpdated', () => {
    render(<WatchlistTable data={sampleWatchlist} />);
    // CBA updated 5 min ago → "5m ago"
    expect(screen.getByText(/\dm ago/)).toBeInTheDocument();
  });
});
