import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner, PageLoader, InlineLoader } from '../loading-spinner';

describe('LoadingSpinner', () => {
  it('renders with role="status"', () => {
    render(<LoadingSpinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has default aria-label "Loading"', () => {
    render(<LoadingSpinner />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading');
  });

  it('renders label text when provided', () => {
    render(<LoadingSpinner label="Fetching data..." />);
    expect(screen.getByText('Fetching data...')).toBeInTheDocument();
  });

  it('does not render label text when not provided', () => {
    const { container } = render(<LoadingSpinner />);
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs.length).toBe(0);
  });

  it('applies size classes for sm', () => {
    render(<LoadingSpinner size="sm" />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('h-4');
    expect(spinner).toHaveClass('w-4');
  });

  it('applies size classes for lg', () => {
    render(<LoadingSpinner size="lg" />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('h-12');
    expect(spinner).toHaveClass('w-12');
  });

  it('applies custom className', () => {
    render(<LoadingSpinner className="custom-spinner" />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('custom-spinner');
  });
});

describe('PageLoader', () => {
  it('renders with default message "Loading..."', () => {
    render(<PageLoader />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<PageLoader message="Please wait" />);
    expect(screen.getByText('Please wait')).toBeInTheDocument();
  });
});

describe('InlineLoader', () => {
  it('renders', () => {
    render(<InlineLoader />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders with message', () => {
    render(<InlineLoader message="Loading items..." />);
    expect(screen.getByText('Loading items...')).toBeInTheDocument();
  });
});
