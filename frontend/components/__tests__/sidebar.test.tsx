import { render, screen } from '@testing-library/react';
import Sidebar from '../Sidebar';

jest.mock('../ThemeToggle', () => {
  return function MockThemeToggle() {
    return <div data-testid="theme-toggle">Theme Toggle</div>;
  };
});

describe('Sidebar', () => {
  it('renders sidebar branding', () => {
    render(<Sidebar />);
    expect(screen.getByText('ASX Portfolio OS')).toBeInTheDocument();
    expect(screen.getByText('Control Deck')).toBeInTheDocument();
  });

  it('renders all navigation links', () => {
    render(<Sidebar />);
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

  it('renders navigation links with correct hrefs', () => {
    render(<Sidebar />);

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

  it('renders ThemeToggle component', () => {
    render(<Sidebar />);
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });

  it('renders live status section', () => {
    render(<Sidebar />);
    expect(screen.getByText('Live Status')).toBeInTheDocument();
    expect(screen.getByText('Render API + Supabase')).toBeInTheDocument();
  });

  it('has correct sidebar structure', () => {
    const { container } = render(<Sidebar />);
    const aside = container.querySelector('aside');
    expect(aside).toBeInTheDocument();
    expect(aside).toHaveClass('hidden', 'lg:flex');
  });

  it('renders nav element with correct structure', () => {
    const { container } = render(<Sidebar />);
    const nav = container.querySelector('nav');
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveClass('flex', 'flex-col', 'gap-3');
  });

  it('renders all nine navigation items', () => {
    const { container } = render(<Sidebar />);
    const links = container.querySelectorAll('nav a');
    expect(links).toHaveLength(9);
  });
});
