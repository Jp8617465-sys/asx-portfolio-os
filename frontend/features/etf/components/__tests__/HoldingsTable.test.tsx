import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { HoldingsTable } from '../HoldingsTable';
import type { ETFHolding } from '@/contracts';

const mockHoldings: ETFHolding[] = [
  {
    holdingSymbol: 'CBA.AX',
    holdingName: 'Commonwealth Bank',
    weight: 10.5,
    sector: 'Financials',
    signal: 'BUY',
    confidence: 85,
  },
  {
    holdingSymbol: 'BHP.AX',
    holdingName: 'BHP Group',
    weight: 8.2,
    sector: 'Materials',
    signal: 'HOLD',
    confidence: 60,
  },
  {
    holdingSymbol: 'CSL.AX',
    holdingName: 'CSL Limited',
    weight: 6.1,
    sector: 'Healthcare',
    signal: 'STRONG_BUY',
    confidence: 92,
  },
  {
    holdingSymbol: 'WBC.AX',
    holdingName: 'Westpac Banking',
    weight: 5.5,
    sector: 'Financials',
    signal: 'SELL',
    confidence: 70,
  },
  {
    holdingSymbol: 'NAB.AX',
    holdingName: 'National Australia Bank',
    weight: 5.0,
    sector: 'Financials',
    signal: 'STRONG_SELL',
    confidence: 78,
  },
];

describe('HoldingsTable', () => {
  it('should render all holdings rows', () => {
    render(<HoldingsTable holdings={mockHoldings} />);
    expect(screen.getByText('CBA.AX')).toBeInTheDocument();
    expect(screen.getByText('BHP.AX')).toBeInTheDocument();
    expect(screen.getByText('CSL.AX')).toBeInTheDocument();
    expect(screen.getByText('WBC.AX')).toBeInTheDocument();
    expect(screen.getByText('NAB.AX')).toBeInTheDocument();
  });

  it('should render holding names', () => {
    render(<HoldingsTable holdings={mockHoldings} />);
    expect(screen.getByText('Commonwealth Bank')).toBeInTheDocument();
    expect(screen.getByText('BHP Group')).toBeInTheDocument();
  });

  it('should render weight as percentage', () => {
    render(<HoldingsTable holdings={mockHoldings} />);
    expect(screen.getByText('10.50%')).toBeInTheDocument();
    expect(screen.getByText('8.20%')).toBeInTheDocument();
  });

  it('should render signal badges with correct colors', () => {
    render(<HoldingsTable holdings={mockHoldings} />);
    const buyBadge = screen.getByText('BUY');
    const holdBadge = screen.getByText('HOLD');
    const sellBadge = screen.getByText('SELL');
    const strongBuyBadge = screen.getByText('STRONG_BUY');
    const strongSellBadge = screen.getByText('STRONG_SELL');

    expect(buyBadge.className).toContain('green');
    expect(strongBuyBadge.className).toContain('green');
    expect(holdBadge.className).toContain('yellow');
    expect(sellBadge.className).toContain('red');
    expect(strongSellBadge.className).toContain('red');
  });

  it('should render empty state when no holdings', () => {
    render(<HoldingsTable holdings={[]} />);
    expect(screen.getByText('No Holdings')).toBeInTheDocument();
  });

  it('should sort by weight when weight header is clicked', () => {
    render(<HoldingsTable holdings={mockHoldings} />);

    const weightHeader = screen.getByText('Weight');
    fireEvent.click(weightHeader);

    // After clicking, holdings should be sorted by weight ascending
    const rows = screen.getAllByRole('row');
    // First row is the header, so data rows start at index 1
    const firstDataRow = rows[1];
    expect(within(firstDataRow).getByText('NAB.AX')).toBeInTheDocument();
  });

  it('should toggle sort direction on second click', () => {
    render(<HoldingsTable holdings={mockHoldings} />);

    const weightHeader = screen.getByText('Weight');
    // First click: ascending
    fireEvent.click(weightHeader);
    // Second click: descending
    fireEvent.click(weightHeader);

    const rows = screen.getAllByRole('row');
    const firstDataRow = rows[1];
    expect(within(firstDataRow).getByText('CBA.AX')).toBeInTheDocument();
  });

  it('should paginate when there are many holdings', () => {
    // Create 25 holdings to test pagination (default page size is 20)
    const manyHoldings: ETFHolding[] = Array.from({ length: 25 }, (_, i) => ({
      holdingSymbol: `STOCK${i}.AX`,
      holdingName: `Stock ${i}`,
      weight: 4 - i * 0.1,
      sector: 'Financials',
    }));

    render(<HoldingsTable holdings={manyHoldings} />);

    // Should show first page items
    expect(screen.getByText('STOCK0.AX')).toBeInTheDocument();
    // Should show pagination controls
    expect(screen.getByText('Next')).toBeInTheDocument();

    // Click next page
    fireEvent.click(screen.getByText('Next'));

    // Should show second page items
    expect(screen.getByText('STOCK20.AX')).toBeInTheDocument();
  });

  it('should display confidence values', () => {
    render(<HoldingsTable holdings={mockHoldings} />);
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
  });
});
