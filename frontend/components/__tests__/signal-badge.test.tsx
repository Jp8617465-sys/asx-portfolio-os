/**
 * Example test file for SignalBadge component
 * Demonstrates best practices for component testing
 */

import { render, screen } from '@testing-library/react';
import SignalBadge from '../signal-badge';
import { SignalType } from '@/lib/types';

describe('SignalBadge Component', () => {
  describe('Rendering', () => {
    it('should render STRONG_BUY signal correctly', () => {
      render(<SignalBadge signal="STRONG_BUY" size="md" showIcon={false} />);

      const badge = screen.getByText('STRONG BUY');
      expect(badge).toBeInTheDocument();
    });

    it('should render STRONG_SELL signal correctly', () => {
      render(<SignalBadge signal="STRONG_SELL" size="md" showIcon={false} />);

      const badge = screen.getByText('STRONG SELL');
      expect(badge).toBeInTheDocument();
    });

    it('should render BUY signal correctly', () => {
      render(<SignalBadge signal="BUY" size="md" showIcon={false} />);

      const badge = screen.getByText('BUY');
      expect(badge).toBeInTheDocument();
    });

    it('should render SELL signal correctly', () => {
      render(<SignalBadge signal="SELL" size="md" showIcon={false} />);

      const badge = screen.getByText('SELL');
      expect(badge).toBeInTheDocument();
    });

    it('should render HOLD signal correctly', () => {
      render(<SignalBadge signal="HOLD" size="md" showIcon={false} />);

      const badge = screen.getByText('HOLD');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should apply small size classes', () => {
      const { container } = render(<SignalBadge signal="BUY" size="sm" showIcon={false} />);

      const badge = container.firstChild;
      expect(badge).toHaveClass('text-xs');
    });

    it('should apply medium size classes', () => {
      const { container } = render(<SignalBadge signal="BUY" size="md" showIcon={false} />);

      const badge = container.firstChild;
      expect(badge).toHaveClass('text-sm');
    });

    it('should apply large size classes', () => {
      const { container } = render(<SignalBadge signal="BUY" size="lg" showIcon={false} />);

      const badge = container.firstChild;
      expect(badge).toHaveClass('text-base');
    });
  });

  describe('Color Variants', () => {
    it('should apply green color for STRONG_BUY', () => {
      const { container } = render(<SignalBadge signal="STRONG_BUY" size="md" showIcon={false} />);

      const badge = container.firstChild;
      expect(badge).toHaveClass('bg-green-100');
    });

    it('should apply red color for STRONG_SELL', () => {
      const { container } = render(<SignalBadge signal="STRONG_SELL" size="md" showIcon={false} />);

      const badge = container.firstChild;
      expect(badge).toHaveClass('bg-red-100');
    });

    it('should apply gray color for HOLD', () => {
      const { container } = render(<SignalBadge signal="HOLD" size="md" showIcon={false} />);

      const badge = container.firstChild;
      expect(badge).toHaveClass('bg-gray-100');
    });
  });

  describe('Icon Display', () => {
    it('should show icon when showIcon is true', () => {
      const { container } = render(<SignalBadge signal="STRONG_BUY" size="md" showIcon={true} />);

      // Check for lucide-react icon
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should not show icon when showIcon is false', () => {
      const { container } = render(<SignalBadge signal="STRONG_BUY" size="md" showIcon={false} />);

      const icon = container.querySelector('svg');
      expect(icon).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle all signal types', () => {
      const signals: SignalType[] = ['STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL'];

      signals.forEach((signal) => {
        const { unmount } = render(<SignalBadge signal={signal} size="md" showIcon={false} />);
        expect(screen.getByText(signal.replace('_', ' '))).toBeInTheDocument();
        unmount();
      });
    });
  });
});
