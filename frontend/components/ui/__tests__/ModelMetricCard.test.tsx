import React from 'react';
import { render, screen } from '@testing-library/react';
import { ModelMetricCard } from '../ModelMetricCard';

describe('ModelMetricCard', () => {
  const defaultProps = {
    label: 'Accuracy',
    value: 0.85,
  };

  it('renders label and value', () => {
    render(<ModelMetricCard {...defaultProps} />);
    expect(screen.getByText('Accuracy')).toBeInTheDocument();
    expect(screen.getByText('0.8500')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<ModelMetricCard {...defaultProps} subtitle="Last 30 days" />);
    expect(screen.getByText('Last 30 days')).toBeInTheDocument();
  });

  describe('value formatting', () => {
    it('formats percentage correctly', () => {
      render(<ModelMetricCard {...defaultProps} format="percentage" />);
      expect(screen.getByText('85.00%')).toBeInTheDocument();
    });

    it('formats decimal correctly', () => {
      render(<ModelMetricCard {...defaultProps} format="decimal" />);
      expect(screen.getByText('0.8500')).toBeInTheDocument();
    });

    it('formats integer correctly', () => {
      render(<ModelMetricCard {...defaultProps} value={85.7} format="integer" />);
      expect(screen.getByText('86')).toBeInTheDocument();
    });

    it('uses decimal format by default', () => {
      render(<ModelMetricCard {...defaultProps} />);
      expect(screen.getByText('0.8500')).toBeInTheDocument();
    });
  });

  describe('performance colors with thresholds', () => {
    const threshold = {
      excellent: 0.9,
      good: 0.8,
      acceptable: 0.7,
    };

    it('applies excellent color when value exceeds excellent threshold', () => {
      render(<ModelMetricCard {...defaultProps} value={0.95} threshold={threshold} />);
      const valueElement = screen.getByText('0.9500');
      expect(valueElement).toHaveClass('text-model-excellent');
    });

    it('applies good color when value is between good and excellent', () => {
      render(<ModelMetricCard {...defaultProps} value={0.85} threshold={threshold} />);
      const valueElement = screen.getByText('0.8500');
      expect(valueElement).toHaveClass('text-model-good');
    });

    it('applies acceptable color when value is between acceptable and good', () => {
      render(<ModelMetricCard {...defaultProps} value={0.75} threshold={threshold} />);
      const valueElement = screen.getByText('0.7500');
      expect(valueElement).toHaveClass('text-model-acceptable');
    });

    it('applies poor color when value is below acceptable threshold', () => {
      render(<ModelMetricCard {...defaultProps} value={0.65} threshold={threshold} />);
      const valueElement = screen.getByText('0.6500');
      expect(valueElement).toHaveClass('text-model-poor');
    });

    it('uses default color when no threshold provided', () => {
      render(<ModelMetricCard {...defaultProps} />);
      const valueElement = screen.getByText('0.8500');
      expect(valueElement).not.toHaveClass('text-model-excellent');
      expect(valueElement).not.toHaveClass('text-model-poor');
    });
  });

  describe('background colors with thresholds', () => {
    const threshold = {
      excellent: 0.9,
      good: 0.8,
      acceptable: 0.7,
    };

    it('applies excellent background when value exceeds excellent threshold', () => {
      const { container } = render(
        <ModelMetricCard {...defaultProps} value={0.95} threshold={threshold} />
      );
      const bgElement = container.querySelector('.bg-green-100');
      expect(bgElement).toBeInTheDocument();
    });

    it('applies good background when value is between good and excellent', () => {
      const { container } = render(
        <ModelMetricCard {...defaultProps} value={0.85} threshold={threshold} />
      );
      const bgElement = container.querySelector('.bg-green-50');
      expect(bgElement).toBeInTheDocument();
    });

    it('applies acceptable background when value is between acceptable and good', () => {
      const { container } = render(
        <ModelMetricCard {...defaultProps} value={0.75} threshold={threshold} />
      );
      const bgElement = container.querySelector('.bg-amber-50');
      expect(bgElement).toBeInTheDocument();
    });

    it('applies poor background when value is below acceptable threshold', () => {
      const { container } = render(
        <ModelMetricCard {...defaultProps} value={0.65} threshold={threshold} />
      );
      const bgElement = container.querySelector('.bg-red-50');
      expect(bgElement).toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    const { container } = render(<ModelMetricCard {...defaultProps} className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders with correct card styling', () => {
    const { container } = render(<ModelMetricCard {...defaultProps} />);
    expect(container.firstChild).toHaveClass('rounded-lg');
    expect(container.firstChild).toHaveClass('border');
    expect(container.firstChild).toHaveClass('p-4');
  });
});
