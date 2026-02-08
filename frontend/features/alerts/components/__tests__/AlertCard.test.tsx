import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlertCard } from '../AlertCard';
import type { Alert } from '@/contracts';

const mockAlert: Alert = {
  id: 1,
  userId: 1,
  symbol: 'CBA.AX',
  alertType: 'PRICE_ABOVE',
  threshold: 105.5,
  status: 'active',
  notificationChannel: 'email',
  createdAt: '2026-02-01T10:00:00Z',
};

describe('AlertCard', () => {
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the symbol', () => {
    render(<AlertCard alert={mockAlert} onEdit={mockOnEdit} onDelete={mockOnDelete} />);
    expect(screen.getByText('CBA.AX')).toBeInTheDocument();
  });

  it('should render the alert type as readable label', () => {
    render(<AlertCard alert={mockAlert} onEdit={mockOnEdit} onDelete={mockOnDelete} />);
    expect(screen.getByText('Price Above')).toBeInTheDocument();
  });

  it('should render the threshold formatted as price', () => {
    render(<AlertCard alert={mockAlert} onEdit={mockOnEdit} onDelete={mockOnDelete} />);
    expect(screen.getByText('$105.50')).toBeInTheDocument();
  });

  it('should render the status badge', () => {
    render(<AlertCard alert={mockAlert} onEdit={mockOnEdit} onDelete={mockOnDelete} />);
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('should call onEdit when edit button is clicked', () => {
    render(<AlertCard alert={mockAlert} onEdit={mockOnEdit} onDelete={mockOnDelete} />);
    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);
    expect(mockOnEdit).toHaveBeenCalledWith(mockAlert);
  });

  it('should call onDelete when delete button is clicked', () => {
    render(<AlertCard alert={mockAlert} onEdit={mockOnEdit} onDelete={mockOnDelete} />);
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);
    expect(mockOnDelete).toHaveBeenCalledWith(mockAlert.id);
  });

  it('should render the notification channel', () => {
    render(<AlertCard alert={mockAlert} onEdit={mockOnEdit} onDelete={mockOnDelete} />);
    expect(screen.getByText(/email/i)).toBeInTheDocument();
  });

  it('should render created date', () => {
    render(<AlertCard alert={mockAlert} onEdit={mockOnEdit} onDelete={mockOnDelete} />);
    // The date should be rendered in some format
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  describe('status color coding', () => {
    it('should apply green styling for active status', () => {
      render(
        <AlertCard
          alert={{ ...mockAlert, status: 'active' }}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );
      const badge = screen.getByText('active');
      expect(badge.className).toMatch(/green/);
    });

    it('should apply blue styling for triggered status', () => {
      render(
        <AlertCard
          alert={{ ...mockAlert, status: 'triggered' }}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );
      const badge = screen.getByText('triggered');
      expect(badge.className).toMatch(/blue/);
    });

    it('should apply gray styling for disabled status', () => {
      render(
        <AlertCard
          alert={{ ...mockAlert, status: 'disabled' }}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );
      const badge = screen.getByText('disabled');
      expect(badge.className).toMatch(/gray/);
    });

    it('should apply red styling for expired status', () => {
      render(
        <AlertCard
          alert={{ ...mockAlert, status: 'expired' }}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );
      const badge = screen.getByText('expired');
      expect(badge.className).toMatch(/red/);
    });
  });

  it('should render different alert types correctly', () => {
    const { rerender } = render(
      <AlertCard
        alert={{ ...mockAlert, alertType: 'PRICE_BELOW' }}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByText('Price Below')).toBeInTheDocument();

    rerender(
      <AlertCard
        alert={{ ...mockAlert, alertType: 'SIGNAL_CHANGE' }}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByText('Signal Change')).toBeInTheDocument();

    rerender(
      <AlertCard
        alert={{ ...mockAlert, alertType: 'VOLUME_SPIKE' }}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByText('Volume Spike')).toBeInTheDocument();
  });
});
