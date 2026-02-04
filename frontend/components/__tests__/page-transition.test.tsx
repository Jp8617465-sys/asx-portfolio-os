import { render, screen } from '@testing-library/react';
import PageTransition from '../PageTransition';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial, animate, variants, transition, ...props }: any) => (
      <div
        data-testid="motion-div"
        data-initial={initial}
        data-animate={animate}
        data-has-variants={!!variants}
        data-has-transition={!!transition}
        {...props}
      >
        {children}
      </div>
    ),
  },
}));

describe('PageTransition', () => {
  it('renders children inside motion.div', () => {
    render(
      <PageTransition>
        <div>Test Content</div>
      </PageTransition>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
    expect(screen.getByTestId('motion-div')).toBeInTheDocument();
  });

  it('passes animation props to motion component', () => {
    render(
      <PageTransition>
        <span>Animated Child</span>
      </PageTransition>
    );

    const motionDiv = screen.getByTestId('motion-div');
    expect(motionDiv).toHaveAttribute('data-initial', 'hidden');
    expect(motionDiv).toHaveAttribute('data-animate', 'visible');
    expect(motionDiv).toHaveAttribute('data-has-variants', 'true');
    expect(motionDiv).toHaveAttribute('data-has-transition', 'true');
  });

  it('renders multiple children', () => {
    render(
      <PageTransition>
        <div>Child 1</div>
        <div>Child 2</div>
        <div>Child 3</div>
      </PageTransition>
    );

    expect(screen.getByText('Child 1')).toBeInTheDocument();
    expect(screen.getByText('Child 2')).toBeInTheDocument();
    expect(screen.getByText('Child 3')).toBeInTheDocument();
  });

  it('handles complex child components', () => {
    const ComplexChild = () => (
      <div>
        <h1>Title</h1>
        <p>Description</p>
      </div>
    );

    render(
      <PageTransition>
        <ComplexChild />
      </PageTransition>
    );

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('wraps content in motion component', () => {
    const { container } = render(
      <PageTransition>
        <p>Content</p>
      </PageTransition>
    );

    const motionDiv = container.querySelector('[data-testid="motion-div"]');
    expect(motionDiv).toBeInTheDocument();
  });
});
