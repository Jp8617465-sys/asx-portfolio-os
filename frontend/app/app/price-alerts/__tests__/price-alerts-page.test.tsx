import React from 'react';
import { render, screen } from '@testing-library/react';
import PriceAlertsPageRoute from '../page';

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

jest.mock('@/features/alerts', () => ({
  PriceAlertsPage: function MockPriceAlertsPage() {
    return <div data-testid="price-alerts-page">Price Alerts Content</div>;
  },
}));

describe('PriceAlertsPageRoute', () => {
  it('renders header component', () => {
    render(<PriceAlertsPageRoute />);
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  it('renders footer component', () => {
    render(<PriceAlertsPageRoute />);
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });

  it('renders PriceAlertsPage component', () => {
    render(<PriceAlertsPageRoute />);
    expect(screen.getByTestId('price-alerts-page')).toBeInTheDocument();
  });

  it('renders with correct layout structure', () => {
    const { container } = render(<PriceAlertsPageRoute />);
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv).toHaveClass('min-h-screen');
    expect(outerDiv).toHaveClass('bg-gradient-to-br');
  });

  it('wraps PriceAlertsPage in a max-width container', () => {
    render(<PriceAlertsPageRoute />);
    const alertsPage = screen.getByTestId('price-alerts-page');
    const wrapper = alertsPage.parentElement;
    expect(wrapper).toHaveClass('max-w-7xl');
    expect(wrapper).toHaveClass('mx-auto');
    expect(wrapper).toHaveClass('p-6');
  });
});
