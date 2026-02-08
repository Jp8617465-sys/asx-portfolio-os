import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ETFBreadcrumb } from '../ETFBreadcrumb';
import type { ETFBreadcrumbItem } from '@/contracts';

const mockPath: ETFBreadcrumbItem[] = [
  { type: 'home', label: 'Home' },
  { type: 'etf-list', label: 'ETFs' },
  { type: 'etf', label: 'Vanguard Australian Shares', symbol: 'VAS.AX' },
];

describe('ETFBreadcrumb', () => {
  it('should render all path items', () => {
    render(<ETFBreadcrumb path={mockPath} onNavigate={jest.fn()} />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('ETFs')).toBeInTheDocument();
    expect(screen.getByText('Vanguard Australian Shares')).toBeInTheDocument();
  });

  it('should call onNavigate with index when a non-current item is clicked', () => {
    const onNavigate = jest.fn();
    render(<ETFBreadcrumb path={mockPath} onNavigate={onNavigate} />);

    fireEvent.click(screen.getByText('Home'));
    expect(onNavigate).toHaveBeenCalledWith(0);
  });

  it('should call onNavigate for ETFs link', () => {
    const onNavigate = jest.fn();
    render(<ETFBreadcrumb path={mockPath} onNavigate={onNavigate} />);

    fireEvent.click(screen.getByText('ETFs'));
    expect(onNavigate).toHaveBeenCalledWith(1);
  });

  it('should not make the last item clickable', () => {
    const onNavigate = jest.fn();
    render(<ETFBreadcrumb path={mockPath} onNavigate={onNavigate} />);

    const lastItem = screen.getByText('Vanguard Australian Shares');
    fireEvent.click(lastItem);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('should render separators between items', () => {
    const { container } = render(<ETFBreadcrumb path={mockPath} onNavigate={jest.fn()} />);
    // There should be 2 separators for 3 items
    const separators = container.querySelectorAll('[data-testid="breadcrumb-separator"]');
    expect(separators).toHaveLength(2);
  });

  it('should render nothing when path is empty', () => {
    const { container } = render(<ETFBreadcrumb path={[]} onNavigate={jest.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});
