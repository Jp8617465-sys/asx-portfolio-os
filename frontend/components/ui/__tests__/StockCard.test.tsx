import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StockCard, SignalType } from '../StockCard';

describe('StockCard', () => {
  const defaultProps = {
    ticker: 'BHP.AX',
    name: 'BHP Group Limited',
    price: 45.5,
    change: 1.25,
    changePercent: 2.82,
    signal: 'BUY' as SignalType,
    confidence: 0.85,
    expectedReturn: 12.5,
  };

  it('renders ticker and company name', () => {
    render(<StockCard {...defaultProps} />);
    expect(screen.getByText('BHP.AX')).toBeInTheDocument();
    expect(screen.getByText('BHP Group Limited')).toBeInTheDocument();
  });

  it('renders price with correct formatting', () => {
    render(<StockCard {...defaultProps} />);
    expect(screen.getByText('$45.50')).toBeInTheDocument();
  });

  it('renders positive price change correctly', () => {
    render(<StockCard {...defaultProps} />);
    expect(screen.getByText(/\+1\.25 \(\+2\.82%\)/)).toBeInTheDocument();
  });

  it('renders negative price change correctly', () => {
    render(<StockCard {...defaultProps} change={-1.25} changePercent={-2.82} />);
    expect(screen.getByText(/-1\.25 \(-2\.82%\)/)).toBeInTheDocument();
  });

  it('renders confidence as percentage', () => {
    render(<StockCard {...defaultProps} />);
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('renders expected return with sign', () => {
    render(<StockCard {...defaultProps} />);
    expect(screen.getByText('+12.5%')).toBeInTheDocument();
  });

  it('renders negative expected return correctly', () => {
    render(<StockCard {...defaultProps} expectedReturn={-5.2} />);
    expect(screen.getByText('-5.2%')).toBeInTheDocument();
  });

  describe('signal types', () => {
    const signals: SignalType[] = ['STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL'];
    const expectedLabels = ['Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell'];

    signals.forEach((signal, index) => {
      it(`renders ${signal} signal with correct label`, () => {
        render(<StockCard {...defaultProps} signal={signal} />);
        expect(screen.getByText(expectedLabels[index])).toBeInTheDocument();
      });
    });
  });

  describe('interaction', () => {
    it('calls onClick when clicked', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();

      render(<StockCard {...defaultProps} onClick={handleClick} />);
      await user.click(screen.getByRole('button'));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('has button role', () => {
      render(<StockCard {...defaultProps} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('is keyboard accessible with Enter key', () => {
      const handleClick = jest.fn();
      render(<StockCard {...defaultProps} onClick={handleClick} />);

      const card = screen.getByRole('button');
      fireEvent.keyDown(card, { key: 'Enter' });

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('is keyboard accessible with Space key', () => {
      const handleClick = jest.fn();
      render(<StockCard {...defaultProps} onClick={handleClick} />);

      const card = screen.getByRole('button');
      fireEvent.keyDown(card, { key: ' ' });

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick for other keys', () => {
      const handleClick = jest.fn();
      render(<StockCard {...defaultProps} onClick={handleClick} />);

      const card = screen.getByRole('button');
      fireEvent.keyDown(card, { key: 'Tab' });

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('handles keyboard event without onClick handler', () => {
      render(<StockCard {...defaultProps} />);
      const card = screen.getByRole('button');

      // Should not throw
      expect(() => fireEvent.keyDown(card, { key: 'Enter' })).not.toThrow();
    });
  });

  it('applies custom className', () => {
    render(<StockCard {...defaultProps} className="custom-class" />);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('has tabIndex for keyboard accessibility', () => {
    render(<StockCard {...defaultProps} />);
    expect(screen.getByRole('button')).toHaveAttribute('tabIndex', '0');
  });

  it('renders with proper styling', () => {
    render(<StockCard {...defaultProps} />);
    const card = screen.getByRole('button');
    expect(card).toHaveClass('rounded-lg');
    expect(card).toHaveClass('shadow-md');
    expect(card).toHaveClass('cursor-pointer');
  });

  describe('color coding', () => {
    it('applies positive color for positive change', () => {
      render(<StockCard {...defaultProps} />);
      const changeText = screen.getByText(/\+1\.25 \(\+2\.82%\)/);
      expect(changeText).toHaveClass('text-metric-positive');
    });

    it('applies negative color for negative change', () => {
      render(<StockCard {...defaultProps} change={-1.25} changePercent={-2.82} />);
      const changeText = screen.getByText(/-1\.25 \(-2\.82%\)/);
      expect(changeText).toHaveClass('text-metric-negative');
    });

    it('treats zero change as positive', () => {
      render(<StockCard {...defaultProps} change={0} changePercent={0} />);
      const changeText = screen.getByText(/0\.00 \(\+0\.00%\)/);
      expect(changeText).toHaveClass('text-metric-positive');
    });
  });
});
