import React from 'react';
import { render, screen } from '@testing-library/react';
import ETFsPage from '../page';

// Mock child components
jest.mock('@/components/header', () => {
  return function MockHeader() {
    return <div data-testid="header">Header</div>;
  };
});

jest.mock('@/components/footer', () => {
  return function MockFooter() {
    return <div data-testid="footer">Footer</div>;
  };
});

jest.mock('@/features/etf', () => ({
  ETFPage: function MockETFPage() {
    return <div data-testid="etf-page">ETF Page Content</div>;
  },
}));

describe('ETFsPage', () => {
  it('renders header component', () => {
    render(<ETFsPage />);
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  it('renders footer component', () => {
    render(<ETFsPage />);
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });

  it('renders ETFPage component', () => {
    render(<ETFsPage />);
    expect(screen.getByTestId('etf-page')).toBeInTheDocument();
  });

  it('renders with correct layout structure', () => {
    const { container } = render(<ETFsPage />);
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv).toHaveClass('min-h-screen');
    expect(outerDiv).toHaveClass('bg-gradient-to-br');
  });

  it('wraps ETFPage in a max-width container', () => {
    render(<ETFsPage />);
    const etfPage = screen.getByTestId('etf-page');
    const wrapper = etfPage.parentElement;
    expect(wrapper).toHaveClass('max-w-7xl');
    expect(wrapper).toHaveClass('mx-auto');
    expect(wrapper).toHaveClass('p-6');
  });
});
