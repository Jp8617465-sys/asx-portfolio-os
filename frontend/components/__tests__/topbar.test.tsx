import { render, screen } from '@testing-library/react';
import Topbar from '../Topbar';

describe('Topbar', () => {
  it('renders with default props', () => {
    render(<Topbar />);
    expect(screen.getByText('Model Operations')).toBeInTheDocument();
    expect(
      screen.getByText('Monitor model performance, drift diagnostics, and portfolio status.')
    ).toBeInTheDocument();
    expect(screen.getByText('Portfolio Intelligence')).toBeInTheDocument();
  });

  it('renders custom title', () => {
    render(<Topbar title="Custom Dashboard" />);
    expect(screen.getByText('Custom Dashboard')).toBeInTheDocument();
  });

  it('renders custom subtitle', () => {
    render(<Topbar subtitle="This is a custom subtitle" />);
    expect(screen.getByText('This is a custom subtitle')).toBeInTheDocument();
  });

  it('renders custom eyebrow text', () => {
    render(<Topbar eyebrow="Custom Section" />);
    expect(screen.getByText('Custom Section')).toBeInTheDocument();
  });

  it('renders without subtitle when not provided', () => {
    render(<Topbar title="Test Title" subtitle="" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(
      screen.queryByText('Monitor model performance, drift diagnostics, and portfolio status.')
    ).not.toBeInTheDocument();
  });

  it('renders actions when provided', () => {
    const actions = <button>Action Button</button>;
    render(<Topbar actions={actions} />);
    expect(screen.getByText('Action Button')).toBeInTheDocument();
  });

  it('does not render actions div when actions not provided', () => {
    const { container } = render(<Topbar />);
    const actionsDiv = container.querySelector('.flex.items-center.gap-3');
    expect(actionsDiv).not.toBeInTheDocument();
  });

  it('renders all custom props together', () => {
    const actions = <span>Custom Action</span>;
    render(
      <Topbar
        title="Integration Test"
        subtitle="Testing all props"
        eyebrow="Test Section"
        actions={actions}
      />
    );

    expect(screen.getByText('Integration Test')).toBeInTheDocument();
    expect(screen.getByText('Testing all props')).toBeInTheDocument();
    expect(screen.getByText('Test Section')).toBeInTheDocument();
    expect(screen.getByText('Custom Action')).toBeInTheDocument();
  });

  it('has correct header structure', () => {
    const { container } = render(<Topbar />);
    const header = container.querySelector('header');
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass('flex', 'flex-col', 'gap-4', 'border-b');
  });
});
