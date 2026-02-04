import { render, screen } from '@testing-library/react';
import SignalBadge from '../signal-badge';
import { SignalType } from '@/lib/types';
import { designTokens } from '@/lib/design-tokens';

describe('SignalBadge', () => {
  describe('Label rendering', () => {
    const cases: [SignalType, string][] = [
      ['STRONG_BUY', 'Strong Buy'],
      ['BUY', 'Buy'],
      ['HOLD', 'Hold'],
      ['SELL', 'Sell'],
      ['STRONG_SELL', 'Strong Sell'],
    ];

    it.each(cases)('renders label "%s" as "%s"', (signal, expectedLabel) => {
      render(<SignalBadge signal={signal} />);
      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    });
  });

  describe('Inline style colours', () => {
    // jsdom normalises hex → rgb; match the r,g,b digits regardless of format
    function hexToRgbPattern(hex: string) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return new RegExp(`${r},\\s*${g},\\s*${b}`);
    }

    it('STRONG_BUY applies correct color and backgroundColor', () => {
      const { container } = render(<SignalBadge signal="STRONG_BUY" showIcon={false} />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.style.color).toMatch(hexToRgbPattern(designTokens.colors.signals.strongBuy));
      expect(badge.style.backgroundColor).toMatch(
        hexToRgbPattern(designTokens.colors.signals.strongBuy)
      );
    });

    it('HOLD applies correct color and backgroundColor', () => {
      const { container } = render(<SignalBadge signal="HOLD" showIcon={false} />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.style.color).toMatch(hexToRgbPattern(designTokens.colors.signals.hold));
      expect(badge.style.backgroundColor).toMatch(
        hexToRgbPattern(designTokens.colors.signals.hold)
      );
    });

    it('STRONG_SELL applies correct color and backgroundColor', () => {
      const { container } = render(<SignalBadge signal="STRONG_SELL" showIcon={false} />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.style.color).toMatch(hexToRgbPattern(designTokens.colors.signals.strongSell));
      expect(badge.style.backgroundColor).toMatch(
        hexToRgbPattern(designTokens.colors.signals.strongSell)
      );
    });
  });

  describe('Size classes', () => {
    it('sm applies text-xs', () => {
      const { container } = render(<SignalBadge signal="BUY" size="sm" showIcon={false} />);
      expect(container.firstChild).toHaveClass('text-xs');
    });

    it('md applies text-sm', () => {
      const { container } = render(<SignalBadge signal="BUY" size="md" showIcon={false} />);
      expect(container.firstChild).toHaveClass('text-sm');
    });

    it('lg applies text-base', () => {
      const { container } = render(<SignalBadge signal="BUY" size="lg" showIcon={false} />);
      expect(container.firstChild).toHaveClass('text-base');
    });
  });

  describe('Icon display', () => {
    it('renders icon when showIcon is true', () => {
      const { container } = render(<SignalBadge signal="BUY" showIcon={true} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('does not render icon when showIcon is false', () => {
      const { container } = render(<SignalBadge signal="BUY" showIcon={false} />);
      expect(container.querySelector('svg')).not.toBeInTheDocument();
    });

    it('renders icon by default (showIcon defaults to true)', () => {
      const { container } = render(<SignalBadge signal="BUY" />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Confidence display', () => {
    it('renders confidence percentage when provided', () => {
      render(<SignalBadge signal="BUY" confidence={85} showIcon={false} />);
      expect(screen.getByText('(85%)')).toBeInTheDocument();
    });

    it('does not render confidence when not provided', () => {
      const { container } = render(<SignalBadge signal="BUY" showIcon={false} />);
      expect(container.textContent).not.toMatch(/\(\d+%\)/);
    });
  });
});
