import { render, screen } from '@testing-library/react';
import StatCard from '../StatCard';

describe('StatCard', () => {
  it('renders label and value', () => {
    render(<StatCard label="Total Value" value="$12,345.00" />);
    expect(screen.getByText('Total Value')).toBeInTheDocument();
    expect(screen.getByText('$12,345.00')).toBeInTheDocument();
  });

  it('renders trend text when provided', () => {
    render(<StatCard label="Price" value="$100" trend="+5.2% today" />);
    expect(screen.getByText('+5.2% today')).toBeInTheDocument();
  });

  it('does not render trend when omitted', () => {
    const { container } = render(<StatCard label="Price" value="$100" />);
    // Label <p> has both text-xs and uppercase; trend <p> has text-xs but no uppercase
    const paragraphs = container.querySelectorAll('p');
    const trendParagraph = Array.from(paragraphs).find(
      (p) => p.classList.contains('text-xs') && !p.classList.contains('uppercase')
    );
    expect(trendParagraph).toBeUndefined();
  });

  it('renders icon when provided', () => {
    render(<StatCard label="Count" value="42" icon={<span data-testid="icon">$</span>} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders skeleton when isLoading is true', () => {
    const { container } = render(<StatCard label="Loading" value="" isLoading={true} />);
    // Skeleton renders with animate-pulse class
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('does not render value text when isLoading', () => {
    render(<StatCard label="Loading" value="$999" isLoading={true} />);
    // The value "$999" should not appear since skeleton replaces it
    expect(screen.queryByText('$999')).not.toBeInTheDocument();
  });
});
