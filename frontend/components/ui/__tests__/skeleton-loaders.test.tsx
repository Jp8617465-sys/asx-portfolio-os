import React from 'react';
import { render } from '@testing-library/react';
import {
  TableSkeleton,
  CardSkeleton,
  StatsCardSkeleton,
  ChartSkeleton,
  StockDetailSkeleton,
  PortfolioSkeleton,
  DashboardSkeleton,
} from '../skeleton-loaders';

describe('TableSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<TableSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders correct default number of rows (5)', () => {
    const { container } = render(<TableSkeleton />);
    // Header row + 5 data rows = 6 flex rows total
    const rows = container.querySelectorAll('.flex.gap-4');
    // 1 header + 5 body rows
    expect(rows.length).toBe(6);
  });

  it('renders correct default number of columns (5)', () => {
    const { container } = render(<TableSkeleton />);
    // The header row should have 5 skeleton children
    const headerRow = container.querySelector('.flex.gap-4.pb-3');
    expect(headerRow?.children.length).toBe(5);
  });

  it('accepts custom rows and columns', () => {
    const { container } = render(<TableSkeleton rows={3} columns={4} />);
    // Header row should have 4 columns
    const headerRow = container.querySelector('.flex.gap-4.pb-3');
    expect(headerRow?.children.length).toBe(4);
    // 1 header + 3 body rows = 4
    const rows = container.querySelectorAll('.flex.gap-4');
    expect(rows.length).toBe(4);
  });
});

describe('CardSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<CardSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });
});

describe('StatsCardSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<StatsCardSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });
});

describe('ChartSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<ChartSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('applies custom height style', () => {
    const { container } = render(<ChartSkeleton height={500} />);
    const chartDiv = container.firstChild as HTMLElement;
    expect(chartDiv).toHaveStyle({ height: '500px' });
  });
});

describe('StockDetailSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<StockDetailSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });
});

describe('PortfolioSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<PortfolioSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });
});

describe('DashboardSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<DashboardSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
