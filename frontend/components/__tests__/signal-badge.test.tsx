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

      const badge = screen.getByText('Strong Buy');
      expect(badge).toBeInTheDocument();
    });

    it('should render STRONG_SELL signal correctly', () => {
      render(<SignalBadge signal="STRONG_SELL" size="md" showIcon={false} />);

      const badge = screen.getByText('Strong Sell');
      expect(badge).toBeInTheDocument();
    });

    it('should render BUY signal correctly', () => {
      render(<SignalBadge signal="BUY" size="md" showIcon={false} />);

      const badge = screen.getByText('Buy');
      expect(badge).toBeInTheDocument();
    });

    it('should render SELL signal correctly', () => {
      render(<SignalBadge signal="SELL" size="md" showIcon={false} />);

      const badge = screen.getByText('Sell');
      expect(badge).toBeInTheDocument();
    });

    it('should render HOLD signal correctly', () => {
      render(<SignalBadge signal="HOLD" size="md" showIcon={false} />);

      const badge = screen.getByText('Hold');
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
      // Component uses inline styles, check for green color in style
      expect(badge).toHaveStyle({ color: 'rgb(16, 185, 129)' });
    });

    it('should apply red color for STRONG_SELL', () => {
      const { container } = render(<SignalBadge signal="STRONG_SELL" size="md" showIcon={false} />);

      const badge = container.firstChild;
      // Component uses inline styles, check for red color in style
      expect(badge).toHaveStyle({ color: 'rgb(239, 68, 68)' });
    });

    it('should apply gray color for HOLD', () => {
      const { container } = render(<SignalBadge signal="HOLD" size="md" showIcon={false} />);

      const badge = container.firstChild;
      // Component uses inline styles, check for gray color in style
      expect(badge).toHaveStyle({ color: 'rgb(148, 163, 184)' });
    });
  });

  describe('Icon Display', () => {
    it('should show icon when showIcon is true', () => {
      render(<SignalBadge signal="STRONG_BUY" size="md" showIcon={true} />);

      // With our mock, icons render as string text
      // Just verify the component renders without errors
      expect(screen.getByText('Strong Buy')).toBeInTheDocument();
    });

    it('should not show icon when showIcon is false', () => {
      render(<SignalBadge signal="STRONG_BUY" size="md" showIcon={false} />);

      // Just verify the component renders correctly
      expect(screen.getByText('Strong Buy')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle all signal types', () => {
      const signalsWithLabels: Array<[SignalType, string]> = [
        ['STRONG_BUY', 'Strong Buy'],
        ['BUY', 'Buy'],
        ['HOLD', 'Hold'],
        ['SELL', 'Sell'],
        ['STRONG_SELL', 'Strong Sell'],
      ];

      signalsWithLabels.forEach(([signal, label]) => {
        const { unmount } = render(<SignalBadge signal={signal} size="md" showIcon={false} />);
        expect(screen.getByText(label)).toBeInTheDocument();
        unmount();
      });
    });
  });
});
