import { render, screen } from '@testing-library/react';
import ConfidenceGauge from '../ConfidenceGauge';

describe('ConfidenceGauge', () => {
  // Use animate={false} to avoid requestAnimationFrame in jsdom

  describe('Confidence value display', () => {
    it('renders the confidence percentage in the SVG text', () => {
      render(<ConfidenceGauge confidence={75} signal="BUY" animate={false} />);
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('renders 0% for zero confidence', () => {
      render(<ConfidenceGauge confidence={0} signal="HOLD" animate={false} />);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('renders 100% for full confidence', () => {
      render(<ConfidenceGauge confidence={100} signal="STRONG_BUY" animate={false} />);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('Signal label', () => {
    it('renders STRONG_BUY as "STRONG BUY"', () => {
      render(<ConfidenceGauge confidence={90} signal="STRONG_BUY" animate={false} />);
      expect(screen.getByText('STRONG BUY')).toBeInTheDocument();
    });

    it('renders BUY as "BUY"', () => {
      render(<ConfidenceGauge confidence={70} signal="BUY" animate={false} />);
      expect(screen.getByText('BUY')).toBeInTheDocument();
    });

    it('renders STRONG_SELL as "STRONG SELL"', () => {
      render(<ConfidenceGauge confidence={85} signal="STRONG_SELL" animate={false} />);
      expect(screen.getByText('STRONG SELL')).toBeInTheDocument();
    });
  });

  describe('Size variants', () => {
    it('sm produces SVG with width 64', () => {
      const { container } = render(
        <ConfidenceGauge confidence={50} signal="HOLD" size="sm" animate={false} />
      );
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '64');
      expect(svg).toHaveAttribute('height', '64');
    });

    it('md produces SVG with width 120', () => {
      const { container } = render(
        <ConfidenceGauge confidence={50} signal="HOLD" size="md" animate={false} />
      );
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '120');
      expect(svg).toHaveAttribute('height', '120');
    });

    it('lg produces SVG with width 180', () => {
      const { container } = render(
        <ConfidenceGauge confidence={50} signal="HOLD" size="lg" animate={false} />
      );
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '180');
      expect(svg).toHaveAttribute('height', '180');
    });
  });

  describe('Default props', () => {
    it('defaults to md size when size is not provided', () => {
      const { container } = render(
        <ConfidenceGauge confidence={60} signal="SELL" animate={false} />
      );
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '120');
    });
  });

  describe('Animation', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('animates from 0 to target confidence when animate=true', async () => {
      const { rerender } = render(<ConfidenceGauge confidence={50} signal="BUY" animate={true} />);

      // Initial state should be 0%
      expect(screen.getByText('0%')).toBeInTheDocument();

      // Simulate animation frames
      for (let i = 0; i < 20; i++) {
        jest.advanceTimersByTime(50);
      }

      // Re-render to see updated state
      rerender(<ConfidenceGauge confidence={50} signal="BUY" animate={true} />);
    });

    it('handles animation with 100% confidence', () => {
      render(<ConfidenceGauge confidence={100} signal="STRONG_BUY" animate={true} />);

      // Initial state should be 0%
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('defaults to animate=true', () => {
      render(<ConfidenceGauge confidence={75} signal="BUY" />);

      // Should start at 0% due to animation default
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });

  describe('Signal colors', () => {
    it('renders SELL signal correctly', () => {
      render(<ConfidenceGauge confidence={40} signal="SELL" animate={false} />);
      expect(screen.getByText('SELL')).toBeInTheDocument();
      expect(screen.getByText('40%')).toBeInTheDocument();
    });
  });
});
