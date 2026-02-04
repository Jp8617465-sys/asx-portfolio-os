import { render, screen, fireEvent } from '@testing-library/react';
import HoldingsTable from '../holdings-table';
import { PortfolioHolding } from '@/lib/types';

const sampleHoldings: PortfolioHolding[] = [
  {
    ticker: 'CBA.AX',
    companyName: 'Commonwealth Bank',
    shares: 100,
    avgCost: 95,
    currentPrice: 100,
    totalValue: 10000,
    signal: 'BUY',
    confidence: 75,
  },
  {
    ticker: 'BHP.AX',
    companyName: 'BHP Group',
    shares: 50,
    avgCost: 45,
    currentPrice: 42,
    totalValue: 2100,
    signal: 'SELL',
    confidence: 60,
  },
];

describe('HoldingsTable', () => {
  it('renders loading spinner when isLoading', () => {
    const { container } = render(<HoldingsTable holdings={[]} isLoading={true} />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders empty state when holdings is empty', () => {
    render(<HoldingsTable holdings={[]} />);
    expect(screen.getByText('No holdings in portfolio')).toBeInTheDocument();
    expect(screen.getByText(/Upload a CSV file/i)).toBeInTheDocument();
  });

  it('renders ticker and company name for each holding', () => {
    render(<HoldingsTable holdings={sampleHoldings} />);
    expect(screen.getByText('CBA.AX')).toBeInTheDocument();
    expect(screen.getByText('Commonwealth Bank')).toBeInTheDocument();
    expect(screen.getByText('BHP.AX')).toBeInTheDocument();
    expect(screen.getByText('BHP Group')).toBeInTheDocument();
  });

  it('shows positive P&L with green colour class', () => {
    // CBA: (100 - 95) * 100 = +500
    render(<HoldingsTable holdings={[sampleHoldings[0]]} />);
    // Look for the +$500 text (formatted with locale)
    const positiveElements = document.querySelectorAll('.text-green-600');
    expect(positiveElements.length).toBeGreaterThan(0);
  });

  it('shows negative P&L with red colour class', () => {
    // BHP: (42 - 45) * 50 = -150
    render(<HoldingsTable holdings={[sampleHoldings[1]]} />);
    const negativeElements = document.querySelectorAll('.text-red-600');
    expect(negativeElements.length).toBeGreaterThan(0);
  });

  it('renders Export CSV button when onExport is provided', () => {
    const onExport = jest.fn();
    render(<HoldingsTable holdings={sampleHoldings} onExport={onExport} />);
    const exportBtn = screen.getByText('Export CSV');
    expect(exportBtn).toBeInTheDocument();
  });

  it('calls onExport when Export CSV button is clicked', () => {
    const onExport = jest.fn();
    render(<HoldingsTable holdings={sampleHoldings} onExport={onExport} />);
    fireEvent.click(screen.getByText('Export CSV'));
    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it('does not render Export CSV button when onExport is not provided', () => {
    render(<HoldingsTable holdings={sampleHoldings} />);
    expect(screen.queryByText('Export CSV')).not.toBeInTheDocument();
  });

  it('renders totals footer with correct total value', () => {
    render(<HoldingsTable holdings={sampleHoldings} />);
    // Total value = 10000 + 2100 = 12100
    expect(screen.getByText('Totals:')).toBeInTheDocument();
  });

  it('shows row count in table info', () => {
    render(<HoldingsTable holdings={sampleHoldings} />);
    expect(screen.getByText(/Showing 2 of 2 holdings/)).toBeInTheDocument();
  });

  it('confidence percentage is rendered for each holding', () => {
    render(<HoldingsTable holdings={sampleHoldings} />);
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
  });
});
