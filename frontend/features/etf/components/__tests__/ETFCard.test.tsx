import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ETFCard } from '../ETFCard';
import type { ETFSummary } from '@/contracts';

const mockETF: ETFSummary = {
  symbol: 'VAS.AX',
  etfName: 'Vanguard Australian Shares',
  sector: 'Broad Market',
  nav: 95.42,
  return1w: 1.23,
  return1m: -0.56,
  return3m: 3.45,
  holdingsCount: 300,
};

describe('ETFCard', () => {
  it('should render ETF symbol and name', () => {
    render(<ETFCard etf={mockETF} onSelect={jest.fn()} />);
    expect(screen.getByText('VAS.AX')).toBeInTheDocument();
    expect(screen.getByText('Vanguard Australian Shares')).toBeInTheDocument();
  });

  it('should render NAV formatted as currency', () => {
    render(<ETFCard etf={mockETF} onSelect={jest.fn()} />);
    expect(screen.getByText('$95.42')).toBeInTheDocument();
  });

  it('should render positive returns with green color and + prefix', () => {
    render(<ETFCard etf={mockETF} onSelect={jest.fn()} />);
    const weekReturn = screen.getByText('+1.23%');
    expect(weekReturn).toBeInTheDocument();
    expect(weekReturn.className).toContain('text-green');
  });

  it('should render negative returns with red color and - prefix', () => {
    render(<ETFCard etf={mockETF} onSelect={jest.fn()} />);
    const monthReturn = screen.getByText('-0.56%');
    expect(monthReturn).toBeInTheDocument();
    expect(monthReturn.className).toContain('text-red');
  });

  it('should render holdings count', () => {
    render(<ETFCard etf={mockETF} onSelect={jest.fn()} />);
    expect(screen.getByText('300')).toBeInTheDocument();
  });

  it('should call onSelect with symbol when clicked', () => {
    const onSelect = jest.fn();
    render(<ETFCard etf={mockETF} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('VAS.AX'));
    expect(onSelect).toHaveBeenCalledWith('VAS.AX');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ETFCard etf={mockETF} onSelect={jest.fn()} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should handle ETF without optional fields', () => {
    const minimalETF: ETFSummary = {
      symbol: 'TEST.AX',
      holdingsCount: 0,
    };
    render(<ETFCard etf={minimalETF} onSelect={jest.fn()} />);
    expect(screen.getByText('TEST.AX')).toBeInTheDocument();
  });
});
