import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorAlert, InlineError } from '../error-alert';

describe('ErrorAlert', () => {
  it('renders title and message', () => {
    render(<ErrorAlert title="Error Title" message="Something broke" />);
    expect(screen.getByText('Error Title')).toBeInTheDocument();
    expect(screen.getByText('Something broke')).toBeInTheDocument();
  });

  it('renders default title "Something went wrong"', () => {
    render(<ErrorAlert message="An error occurred" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders retry button when onRetry provided', () => {
    render(<ErrorAlert message="Error" onRetry={() => {}} />);
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('calls onRetry on button click', () => {
    const handleRetry = jest.fn();
    render(<ErrorAlert message="Error" onRetry={handleRetry} />);
    fireEvent.click(screen.getByText('Try Again'));
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('renders dismiss button when onDismiss provided', () => {
    render(<ErrorAlert message="Error" onDismiss={() => {}} />);
    expect(screen.getByLabelText('Dismiss')).toBeInTheDocument();
  });

  it('calls onDismiss on dismiss click', () => {
    const handleDismiss = jest.fn();
    render(<ErrorAlert message="Error" onDismiss={handleDismiss} />);
    fireEvent.click(screen.getByLabelText('Dismiss'));
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('has role="alert"', () => {
    render(<ErrorAlert message="Error" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('applies warning variant styles', () => {
    render(<ErrorAlert message="Warning" variant="warning" />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-yellow-50');
  });

  it('applies custom className', () => {
    render(<ErrorAlert message="Error" className="my-custom-class" />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('my-custom-class');
  });
});

describe('InlineError', () => {
  it('renders message', () => {
    render(<InlineError message="Inline error occurred" />);
    expect(screen.getByText('Inline error occurred')).toBeInTheDocument();
  });

  it('renders retry button when onRetry provided', () => {
    const handleRetry = jest.fn();
    render(<InlineError message="Error" onRetry={handleRetry} />);
    expect(screen.getByText('Retry')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Retry'));
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});
