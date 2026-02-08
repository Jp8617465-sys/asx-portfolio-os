import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateAlertModal } from '../CreateAlertModal';

describe('CreateAlertModal', () => {
  const mockOnSubmit = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnSubmit.mockResolvedValue(undefined);
  });

  it('should render all form fields', () => {
    render(<CreateAlertModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />);

    expect(screen.getByLabelText(/symbol/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/alert type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/threshold/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notification/i)).toBeInTheDocument();
  });

  it('should submit with valid data', async () => {
    const user = userEvent.setup();
    render(<CreateAlertModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText(/symbol/i), 'CBA.AX');
    // Alert type defaults to PRICE_ABOVE
    await user.type(screen.getByLabelText(/threshold/i), '105.50');

    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'CBA.AX',
          alertType: 'PRICE_ABOVE',
          threshold: 105.5,
        })
      );
    });
  });

  it('should validate required fields - symbol required', async () => {
    const user = userEvent.setup();
    render(<CreateAlertModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />);

    // Try to submit without filling symbol
    await user.type(screen.getByLabelText(/threshold/i), '100');
    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    // Should not call onSubmit when symbol is empty
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should validate required fields - threshold required', async () => {
    const user = userEvent.setup();
    render(<CreateAlertModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText(/symbol/i), 'CBA.AX');
    // Don't fill threshold
    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should close on cancel', async () => {
    const user = userEvent.setup();
    render(<CreateAlertModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should pre-fill symbol when provided', () => {
    render(
      <CreateAlertModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        initialSymbol="BHP.AX"
      />
    );

    const symbolInput = screen.getByLabelText(/symbol/i) as HTMLInputElement;
    expect(symbolInput.value).toBe('BHP.AX');
  });

  it('should render all alert type options', () => {
    render(<CreateAlertModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />);

    const typeSelect = screen.getByLabelText(/alert type/i);
    expect(typeSelect).toBeInTheDocument();

    // Check all option values exist
    const options = screen.getAllByRole('option');
    const optionValues = options.map((opt) => (opt as HTMLOptionElement).value);
    expect(optionValues).toContain('PRICE_ABOVE');
    expect(optionValues).toContain('PRICE_BELOW');
    expect(optionValues).toContain('SIGNAL_CHANGE');
    expect(optionValues).toContain('VOLUME_SPIKE');
  });

  it('should render notification channel options', () => {
    render(<CreateAlertModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />);

    const channelSelect = screen.getByLabelText(/notification/i);
    expect(channelSelect).toBeInTheDocument();

    const options = channelSelect.querySelectorAll('option');
    const optionValues = Array.from(options).map((opt) => opt.value);
    expect(optionValues).toContain('email');
    expect(optionValues).toContain('push');
  });

  it('should disable submit button while submitting', async () => {
    const user = userEvent.setup();
    // Make onSubmit hang so we can check loading state
    let resolveSubmit: () => void;
    const submitPromise = new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    });
    mockOnSubmit.mockReturnValue(submitPromise);

    render(<CreateAlertModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText(/symbol/i), 'CBA.AX');
    await user.type(screen.getByLabelText(/threshold/i), '105.50');

    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });

    // Resolve the promise to clean up
    resolveSubmit!();

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('should not render when isOpen is false', () => {
    render(<CreateAlertModal isOpen={false} onClose={mockOnClose} onSubmit={mockOnSubmit} />);

    expect(screen.queryByLabelText(/symbol/i)).not.toBeInTheDocument();
  });
});
