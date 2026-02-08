import { render, screen, fireEvent } from '@testing-library/react';
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

  it('renders menu button', () => {
    render(<MobileNav />);
    expect(screen.getByText('Menu')).toBeInTheDocument();
  });

  it('renders all navigation links when menu is open', () => {
    render(<MobileNav />);
    fireEvent.click(screen.getByText('Menu'));
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Watchlist')).toBeInTheDocument();
    expect(screen.getByText('Portfolio')).toBeInTheDocument();
    expect(screen.getByText('Alerts')).toBeInTheDocument();
    expect(screen.getByText('Models')).toBeInTheDocument();
    expect(screen.getByText('Jobs')).toBeInTheDocument();
    expect(screen.getByText('Insights')).toBeInTheDocument();
    expect(screen.getByText('Assistant')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders navigation links with correct hrefs when open', () => {
    render(<MobileNav />);
    fireEvent.click(screen.getByText('Menu'));

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toHaveAttribute('href', '/app/dashboard');

    const watchlistLink = screen.getByText('Watchlist').closest('a');
    expect(watchlistLink).toHaveAttribute('href', '/app/watchlist');

    const portfolioLink = screen.getByText('Portfolio').closest('a');
    expect(portfolioLink).toHaveAttribute('href', '/app/portfolio');

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

  it('renders ThemeToggle component when open', () => {
    render(<MobileNav />);
    fireEvent.click(screen.getByText('Menu'));
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });

  it('menu button toggles open/close', () => {
    render(<MobileNav />);
    const button = screen.getByText('Menu');

    // Initially no links visible
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();

    // Open menu
    fireEvent.click(button);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();

    // Close menu
    fireEvent.click(button);
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('menu button has correct styling', () => {
    render(<MobileNav />);
    const button = screen.getByRole('button', { name: /navigation menu/i });
    expect(button).toHaveClass('cursor-pointer', 'rounded-full');
  });

  it('renders all nine navigation items when open', () => {
    const { container } = render(<MobileNav />);
    fireEvent.click(screen.getByText('Menu'));
    const links = container.querySelectorAll('a');
    expect(links).toHaveLength(9);
  });

  it('has mobile-only visibility class', () => {
    const { container } = render(<MobileNav />);
    const mobileNav = container.querySelector('.lg\\:hidden');
    expect(mobileNav).toBeInTheDocument();
  });

  it('menu dropdown is positioned correctly when open', () => {
    const { container } = render(<MobileNav />);
    fireEvent.click(screen.getByText('Menu'));
    const dropdown = container.querySelector('.absolute.right-0');
    expect(dropdown).toBeInTheDocument();
  });

  it('ThemeToggle is in separate section with border when open', () => {
    const { container } = render(<MobileNav />);
    fireEvent.click(screen.getByText('Menu'));
    const themeSection = container.querySelector('.border-t');
    expect(themeSection).toBeInTheDocument();
    expect(themeSection?.querySelector('[data-testid="theme-toggle"]')).toBeInTheDocument();
  });
});
