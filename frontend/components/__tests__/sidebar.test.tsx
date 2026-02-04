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
    expect(screen.getByText('Models')).toBeInTheDocument();
    expect(screen.getByText('Jobs')).toBeInTheDocument();
    expect(screen.getByText('Insights')).toBeInTheDocument();
    expect(screen.getByText('Assistant')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders navigation links with correct hrefs', () => {
    render(<Sidebar />);

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toHaveAttribute('href', '/');

    const modelsLink = screen.getByText('Models').closest('a');
    expect(modelsLink).toHaveAttribute('href', '/models');

    const jobsLink = screen.getByText('Jobs').closest('a');
    expect(jobsLink).toHaveAttribute('href', '/jobs');

    const insightsLink = screen.getByText('Insights').closest('a');
    expect(insightsLink).toHaveAttribute('href', '/insights');

    const assistantLink = screen.getByText('Assistant').closest('a');
    expect(assistantLink).toHaveAttribute('href', '/assistant');

    const settingsLink = screen.getByText('Settings').closest('a');
    expect(settingsLink).toHaveAttribute('href', '/settings');
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

  it('renders all six navigation items', () => {
    const { container } = render(<Sidebar />);
    const links = container.querySelectorAll('nav a');
    expect(links).toHaveLength(6);
  });
});
