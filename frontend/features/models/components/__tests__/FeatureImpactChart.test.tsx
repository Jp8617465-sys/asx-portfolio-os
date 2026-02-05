import { render, screen } from '@testing-library/react';
import FeatureImpactChart from '../FeatureImpactChart';

jest.mock('recharts', () => ({
  BarChart: ({ children, data }: any) => (
    <div data-testid="bar-chart" data-chart-length={data.length}>
      {children}
    </div>
  ),
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
}));

describe('FeatureImpactChart', () => {
  it('renders with empty data array', () => {
    render(<FeatureImpactChart data={[]} />);
    const chart = screen.getByTestId('bar-chart');
    expect(chart).toBeInTheDocument();
    expect(chart).toHaveAttribute('data-chart-length', '0');
  });

  it('renders with data', () => {
    const mockFeatures = [
      { name: 'price', value: 0.45 },
      { name: 'volume', value: 0.32 },
      { name: 'momentum', value: 0.23 },
    ];

    render(<FeatureImpactChart data={mockFeatures} />);
    const chart = screen.getByTestId('bar-chart');
    expect(chart).toBeInTheDocument();
    expect(chart).toHaveAttribute('data-chart-length', '3');
  });

  it('renders chart container with correct structure', () => {
    const mockFeatures = [{ name: 'price', value: 0.45 }];
    const { container } = render(<FeatureImpactChart data={mockFeatures} />);

    const chartContainer = container.querySelector('.h-64.w-full');
    expect(chartContainer).toBeInTheDocument();
  });

  it('passes data to BarChart component', () => {
    const mockFeatures = [
      { name: 'feature_a', value: 0.5 },
      { name: 'feature_b', value: 0.3 },
    ];

    render(<FeatureImpactChart data={mockFeatures} />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('handles single feature', () => {
    const singleFeature = [{ name: 'single', value: 0.8 }];
    render(<FeatureImpactChart data={singleFeature} />);

    const chart = screen.getByTestId('bar-chart');
    expect(chart).toHaveAttribute('data-chart-length', '1');
  });
});
