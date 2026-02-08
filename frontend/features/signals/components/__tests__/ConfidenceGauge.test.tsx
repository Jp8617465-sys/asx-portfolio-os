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

  describe('Animation (CSS transition)', () => {
    it('applies CSS transition when animate=true', () => {
      const { container } = render(<ConfidenceGauge confidence={50} signal="BUY" animate={true} />);
      // Component renders target value immediately; CSS handles the visual animation
      expect(screen.getByText('50%')).toBeInTheDocument();
      const circles = container.querySelectorAll('circle');
      expect(circles[1].style.transition).toContain('stroke-dashoffset');
    });

    it('renders 100% immediately with animate=true', () => {
      render(<ConfidenceGauge confidence={100} signal="STRONG_BUY" animate={true} />);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('defaults to animate=true with CSS transition', () => {
      const { container } = render(<ConfidenceGauge confidence={75} signal="BUY" />);
      expect(screen.getByText('75%')).toBeInTheDocument();
      const circles = container.querySelectorAll('circle');
      expect(circles[1].style.transition).toContain('stroke-dashoffset');
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
