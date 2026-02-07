import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChartContainer } from '../chart';

describe('ChartContainer', () => {
  it('renders children', () => {
    render(<ChartContainer>Chart content</ChartContainer>);
    expect(screen.getByText('Chart content')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(<ChartContainer title="My Chart">content</ChartContainer>);
    expect(screen.getByText('My Chart')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<ChartContainer description="A helpful description">content</ChartContainer>);
    expect(screen.getByText('A helpful description')).toBeInTheDocument();
  });

  it('renders both title and description', () => {
    render(
      <ChartContainer title="Title" description="Desc">
        content
      </ChartContainer>
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Desc')).toBeInTheDocument();
  });

  it('does not render header when no title or description', () => {
    const { container } = render(<ChartContainer>content</ChartContainer>);
    expect(container.querySelector('h3')).toBeNull();
  });

  it('applies custom className', () => {
    const { container } = render(<ChartContainer className="custom-chart">content</ChartContainer>);
    expect(container.firstChild).toHaveClass('custom-chart');
  });

  it('renders title without description', () => {
    render(<ChartContainer title="Only Title">content</ChartContainer>);
    expect(screen.getByText('Only Title')).toBeInTheDocument();
    expect(screen.queryByText('description')).not.toBeInTheDocument();
  });

  it('renders description without title', () => {
    render(<ChartContainer description="Only Desc">content</ChartContainer>);
    expect(screen.getByText('Only Desc')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).toBeNull();
  });
});
