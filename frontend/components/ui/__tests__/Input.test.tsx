import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../Input';

describe('Input', () => {
  it('renders basic input', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(<Input label="Email" />);
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('generates id from label', () => {
    render(<Input label="First Name" />);
    const input = screen.getByLabelText('First Name');
    expect(input).toHaveAttribute('id', 'first-name');
  });

  it('uses custom id when provided', () => {
    render(<Input label="Email" id="custom-email-id" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('id', 'custom-email-id');
  });

  it('displays error message', () => {
    render(<Input error="This field is required" />);
    expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
  });

  it('displays helper text when no error', () => {
    render(<Input helperText="Enter your email address" />);
    expect(screen.getByText('Enter your email address')).toBeInTheDocument();
  });

  it('hides helper text when error is present', () => {
    render(<Input error="Invalid email" helperText="Enter your email address" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email');
    expect(screen.queryByText('Enter your email address')).not.toBeInTheDocument();
  });

  it('applies fullWidth class when fullWidth prop is true', () => {
    const { container } = render(<Input fullWidth />);
    expect(container.firstChild).toHaveClass('w-full');
  });

  it('applies error styling when error prop is present', () => {
    render(<Input error="Error" data-testid="input" />);
    const input = screen.getByTestId('input');
    expect(input).toHaveClass('border-red-500');
  });

  it('applies custom className', () => {
    render(<Input className="custom-class" data-testid="input" />);
    expect(screen.getByTestId('input')).toHaveClass('custom-class');
  });

  it('forwards ref to input element', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('handles user input', async () => {
    const user = userEvent.setup();
    render(<Input data-testid="input" />);

    const input = screen.getByTestId('input');
    await user.type(input, 'Hello World');

    expect(input).toHaveValue('Hello World');
  });

  it('supports disabled state', () => {
    render(<Input disabled data-testid="input" />);
    expect(screen.getByTestId('input')).toBeDisabled();
  });

  it('supports different input types', () => {
    render(<Input type="password" data-testid="input" />);
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'password');
  });

  it('supports onChange handler', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();
    render(<Input onChange={handleChange} data-testid="input" />);

    await user.type(screen.getByTestId('input'), 'a');
    expect(handleChange).toHaveBeenCalled();
  });

  it('supports onBlur handler', async () => {
    const user = userEvent.setup();
    const handleBlur = jest.fn();
    render(<Input onBlur={handleBlur} data-testid="input" />);

    const input = screen.getByTestId('input');
    await user.click(input);
    await user.tab();

    expect(handleBlur).toHaveBeenCalled();
  });

  it('has accessible label association', () => {
    render(<Input label="Username" />);
    const label = screen.getByText('Username');
    const input = screen.getByLabelText('Username');
    expect(label).toHaveAttribute('for', input.id);
  });
});
