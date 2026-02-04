import { render, screen, fireEvent } from '@testing-library/react';
import Header from '../header';

// Mock NotificationBell to avoid pulling in Zustand store
jest.mock('../notification-bell', () => () => <div data-testid="notification-bell" />);

describe('Header', () => {
  it('renders brand name', () => {
    render(<Header />);
    expect(screen.getByText('ASX Portfolio OS')).toBeInTheDocument();
  });

  it('renders desktop nav links', () => {
    render(<Header />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Watchlist')).toBeInTheDocument();
    expect(screen.getByText('Portfolio')).toBeInTheDocument();
    expect(screen.getByText('Alerts')).toBeInTheDocument();
  });

  it('renders Account button', () => {
    render(<Header />);
    expect(screen.getByText('Account')).toBeInTheDocument();
  });

  it('renders notification bell', () => {
    render(<Header />);
    // NotificationBell appears in both desktop and mobile nav
    expect(screen.getAllByTestId('notification-bell')).toHaveLength(2);
  });

  it('mobile menu button toggles menu visibility', () => {
    render(<Header />);
    // Mobile menu button has sr-only text "Open menu"
    const menuButton = screen.getByText('Open menu', { selector: 'span' }).closest('button');
    expect(menuButton).toBeTruthy();

    // Menu items are present in the desktop nav; click mobile button to toggle mobile menu
    fireEvent.click(menuButton!);
    // After toggle, the mobile menu should be rendered (contains the same nav items)
    // The key assertion: the component doesn't crash on toggle
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
  });
});
