import { render, screen } from '@testing-library/react';
import DriftChart from '../DriftChart';

jest.mock('recharts', () => ({
  LineChart: ({ children, data }: any) => (
    <div data-testid="line-chart" data-chart-length={data.length}>
      {children}
    </div>
  ),
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
}));

describe('DriftChart', () => {
  it('renders with empty data array', () => {
    render(<DriftChart data={[]} />);
    const chart = screen.getByTestId('line-chart');
    expect(chart).toBeInTheDocument();
    expect(chart).toHaveAttribute('data-chart-length', '0');
  });

  it('renders with data', () => {
    const mockData = [
      { label: '2026-02-01', psi: 2.5 },
      { label: '2026-02-02', psi: 3.1 },
      { label: '2026-02-03', psi: 2.8 },
    ];

    render(<DriftChart data={mockData} />);
    const chart = screen.getByTestId('line-chart');
    expect(chart).toBeInTheDocument();
    expect(chart).toHaveAttribute('data-chart-length', '3');
  });

  it('renders chart container with correct structure', () => {
    const mockData = [{ label: '2026-02-01', psi: 2.5 }];
    const { container } = render(<DriftChart data={mockData} />);

    const chartContainer = container.querySelector('.h-64.w-full');
    expect(chartContainer).toBeInTheDocument();
  });

  it('passes data to LineChart component', () => {
    const mockData = [
      { label: 'Week 1', psi: 1.5 },
      { label: 'Week 2', psi: 2.0 },
    ];

    render(<DriftChart data={mockData} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });
});
