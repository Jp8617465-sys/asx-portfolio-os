import { render, screen } from '@testing-library/react';
import MobileNav from '../MobileNav';

jest.mock('../ThemeToggle', () => {
  return function MockThemeToggle() {
    return <div data-testid="theme-toggle">Theme Toggle</div>;
  };
});

describe('MobileNav', () => {
  it('renders mobile nav branding', () => {
    render(<MobileNav />);
    expect(screen.getByText('ASX Portfolio OS')).toBeInTheDocument();
    expect(screen.getByText('Control Deck')).toBeInTheDocument();
  });

  it('renders menu summary button', () => {
    render(<MobileNav />);
    expect(screen.getByText('Menu')).toBeInTheDocument();
  });

  it('renders all navigation links', () => {
    render(<MobileNav />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Watchlist')).toBeInTheDocument();
    expect(screen.getByText('Portfolio')).toBeInTheDocument();
    expect(screen.getByText('ETFs')).toBeInTheDocument();
    expect(screen.getByText('Alerts')).toBeInTheDocument();
    expect(screen.getByText('Models')).toBeInTheDocument();
    expect(screen.getByText('Jobs')).toBeInTheDocument();
    expect(screen.getByText('Insights')).toBeInTheDocument();
    expect(screen.getByText('Assistant')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders navigation links with correct hrefs', () => {
    render(<MobileNav />);

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toHaveAttribute('href', '/app/dashboard');

    const watchlistLink = screen.getByText('Watchlist').closest('a');
    expect(watchlistLink).toHaveAttribute('href', '/app/watchlist');

    const portfolioLink = screen.getByText('Portfolio').closest('a');
    expect(portfolioLink).toHaveAttribute('href', '/app/portfolio');

    const etfsLink = screen.getByText('ETFs').closest('a');
    expect(etfsLink).toHaveAttribute('href', '/app/etfs');

    const alertsLink = screen.getByText('Alerts').closest('a');
    expect(alertsLink).toHaveAttribute('href', '/app/alerts');

    const modelsLink = screen.getByText('Models').closest('a');
    expect(modelsLink).toHaveAttribute('href', '/app/models');

    const jobsLink = screen.getByText('Jobs').closest('a');
    expect(jobsLink).toHaveAttribute('href', '/app/jobs');

    const insightsLink = screen.getByText('Insights').closest('a');
    expect(insightsLink).toHaveAttribute('href', '/app/insights');

    const assistantLink = screen.getByText('Assistant').closest('a');
    expect(assistantLink).toHaveAttribute('href', '/app/assistant');

    const settingsLink = screen.getByText('Settings').closest('a');
    expect(settingsLink).toHaveAttribute('href', '/app/settings');
  });

  it('renders ThemeToggle component', () => {
    render(<MobileNav />);
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });

  it('has details/summary disclosure structure', () => {
    const { container } = render(<MobileNav />);
    const details = container.querySelector('details');
    expect(details).toBeInTheDocument();

    const summary = container.querySelector('summary');
    expect(summary).toBeInTheDocument();
  });

  it('menu button has correct styling', () => {
    const { container } = render(<MobileNav />);
    const summary = container.querySelector('summary');
    expect(summary).toHaveClass('cursor-pointer', 'rounded-full');
  });

  it('renders all ten navigation items', () => {
    const { container } = render(<MobileNav />);
    const links = container.querySelectorAll('a');
    expect(links).toHaveLength(10);
  });

  it('has mobile-only visibility class', () => {
    const { container } = render(<MobileNav />);
    const mobileNav = container.querySelector('.lg\\:hidden');
    expect(mobileNav).toBeInTheDocument();
  });

  it('menu dropdown is positioned correctly', () => {
    const { container } = render(<MobileNav />);
    const dropdown = container.querySelector('.absolute.right-0');
    expect(dropdown).toBeInTheDocument();
  });

  it('ThemeToggle is in separate section with border', () => {
    const { container } = render(<MobileNav />);
    const themeSection = container.querySelector('.border-t.border-white\\/10.pt-3');
    expect(themeSection).toBeInTheDocument();
    expect(themeSection?.querySelector('[data-testid="theme-toggle"]')).toBeInTheDocument();
  });
});
