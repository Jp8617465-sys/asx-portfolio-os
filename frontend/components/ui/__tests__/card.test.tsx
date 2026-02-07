import React from 'react';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card body</Card>);
    expect(screen.getByText('Card body')).toBeInTheDocument();
  });

  it('renders as a div with base classes', () => {
    const { container } = render(<Card>content</Card>);
    const div = container.firstChild as HTMLElement;
    expect(div.tagName).toBe('DIV');
    expect(div).toHaveClass('rounded-2xl');
    expect(div).toHaveClass('border');
    expect(div).toHaveClass('shadow-sm');
    expect(div).toHaveClass('p-6');
  });

  it('applies custom className', () => {
    const { container } = render(<Card className="my-custom">content</Card>);
    const div = container.firstChild as HTMLElement;
    expect(div).toHaveClass('my-custom');
    expect(div).toHaveClass('rounded-2xl');
  });

  it('passes through additional HTML attributes', () => {
    render(
      <Card data-testid="my-card" id="card-1">
        content
      </Card>
    );
    const el = screen.getByTestId('my-card');
    expect(el).toHaveAttribute('id', 'card-1');
  });

  it('renders with default empty className without error', () => {
    const { container } = render(<Card>content</Card>);
    expect(container.firstChild).toHaveClass('rounded-2xl');
  });
});

describe('CardHeader', () => {
  it('renders children', () => {
    render(<CardHeader>Header text</CardHeader>);
    expect(screen.getByText('Header text')).toBeInTheDocument();
  });

  it('applies base spacing class', () => {
    const { container } = render(<CardHeader>Header</CardHeader>);
    expect(container.firstChild).toHaveClass('mb-4');
  });

  it('applies custom className', () => {
    const { container } = render(<CardHeader className="extra-header">Header</CardHeader>);
    const div = container.firstChild as HTMLElement;
    expect(div).toHaveClass('mb-4');
    expect(div).toHaveClass('extra-header');
  });
});

describe('CardTitle', () => {
  it('renders children', () => {
    render(<CardTitle>My Title</CardTitle>);
    expect(screen.getByText('My Title')).toBeInTheDocument();
  });

  it('renders as an h3 element', () => {
    render(<CardTitle>Title</CardTitle>);
    const heading = screen.getByText('Title');
    expect(heading.tagName).toBe('H3');
  });

  it('applies base text classes', () => {
    render(<CardTitle>Title</CardTitle>);
    const heading = screen.getByText('Title');
    expect(heading).toHaveClass('text-lg');
    expect(heading).toHaveClass('font-semibold');
  });

  it('applies custom className', () => {
    render(<CardTitle className="title-extra">Title</CardTitle>);
    const heading = screen.getByText('Title');
    expect(heading).toHaveClass('title-extra');
    expect(heading).toHaveClass('text-lg');
  });
});

describe('CardContent', () => {
  it('renders children', () => {
    render(<CardContent>Body content</CardContent>);
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });

  it('renders as a div', () => {
    const { container } = render(<CardContent>content</CardContent>);
    expect((container.firstChild as HTMLElement).tagName).toBe('DIV');
  });

  it('applies custom className', () => {
    const { container } = render(<CardContent className="content-class">content</CardContent>);
    expect(container.firstChild).toHaveClass('content-class');
  });

  it('renders with default empty className', () => {
    const { container } = render(<CardContent>content</CardContent>);
    // CardContent uses className directly (no cn wrapping with base classes)
    expect(container.firstChild).toBeInTheDocument();
  });
});

describe('CardDescription', () => {
  it('renders children', () => {
    render(<CardDescription>A description</CardDescription>);
    expect(screen.getByText('A description')).toBeInTheDocument();
  });

  it('renders as a paragraph element', () => {
    render(<CardDescription>desc</CardDescription>);
    const el = screen.getByText('desc');
    expect(el.tagName).toBe('P');
  });

  it('applies base text styling classes', () => {
    render(<CardDescription>desc</CardDescription>);
    const el = screen.getByText('desc');
    expect(el).toHaveClass('text-sm');
    expect(el).toHaveClass('text-slate-600');
  });

  it('applies custom className', () => {
    render(<CardDescription className="desc-custom">desc</CardDescription>);
    const el = screen.getByText('desc');
    expect(el).toHaveClass('desc-custom');
    expect(el).toHaveClass('text-sm');
  });
});

describe('CardFooter', () => {
  it('renders children', () => {
    render(<CardFooter>Footer text</CardFooter>);
    expect(screen.getByText('Footer text')).toBeInTheDocument();
  });

  it('applies base border and spacing classes', () => {
    const { container } = render(<CardFooter>footer</CardFooter>);
    const div = container.firstChild as HTMLElement;
    expect(div).toHaveClass('mt-4');
    expect(div).toHaveClass('pt-4');
    expect(div).toHaveClass('border-t');
  });

  it('applies custom className', () => {
    const { container } = render(<CardFooter className="footer-extra">footer</CardFooter>);
    const div = container.firstChild as HTMLElement;
    expect(div).toHaveClass('footer-extra');
    expect(div).toHaveClass('mt-4');
  });
});
