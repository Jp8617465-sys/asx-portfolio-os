import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState, EmptyStateCard } from '../empty-state';

const MockIcon = (props: any) => <svg data-testid="mock-icon" {...props} />;

describe('EmptyState', () => {
  const defaultProps = {
    icon: MockIcon as any,
    title: 'No Items Found',
  };

  it('renders title', () => {
    render(<EmptyState {...defaultProps} />);
    expect(screen.getByText('No Items Found')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<EmptyState {...defaultProps} description="Try a different search" />);
    expect(screen.getByText('Try a different search')).toBeInTheDocument();
  });

  it('does not render description when omitted', () => {
    render(<EmptyState {...defaultProps} />);
    expect(screen.queryByText('Try a different search')).not.toBeInTheDocument();
  });

  it('renders action button when action prop provided', () => {
    const handleClick = jest.fn();
    render(<EmptyState {...defaultProps} action={{ label: 'Add Item', onClick: handleClick }} />);
    expect(screen.getByText('Add Item')).toBeInTheDocument();
  });

  it('calls action.onClick when button clicked', () => {
    const handleClick = jest.fn();
    render(<EmptyState {...defaultProps} action={{ label: 'Add Item', onClick: handleClick }} />);
    fireEvent.click(screen.getByText('Add Item'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders secondary action button', () => {
    const handleClick = jest.fn();
    render(
      <EmptyState
        {...defaultProps}
        secondaryAction={{ label: 'Learn More', onClick: handleClick }}
      />
    );
    expect(screen.getByText('Learn More')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <EmptyState {...defaultProps}>
        <p>Custom child content</p>
      </EmptyState>
    );
    expect(screen.getByText('Custom child content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<EmptyState {...defaultProps} className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('EmptyStateCard', () => {
  const defaultProps = {
    icon: MockIcon as any,
    title: 'Card Title',
  };

  it('renders with card styling (border classes)', () => {
    const { container } = render(<EmptyStateCard {...defaultProps} />);
    const cardDiv = container.firstChild as HTMLElement;
    expect(cardDiv).toHaveClass('border');
    expect(cardDiv).toHaveClass('rounded-lg');
  });

  it('passes children through', () => {
    render(
      <EmptyStateCard {...defaultProps}>
        <span>Child in card</span>
      </EmptyStateCard>
    );
    expect(screen.getByText('Child in card')).toBeInTheDocument();
  });
});
