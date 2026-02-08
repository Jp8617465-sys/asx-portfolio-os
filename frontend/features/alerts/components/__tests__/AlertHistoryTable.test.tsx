import React from 'react';
import { render, screen } from '@testing-library/react';
import { AlertHistoryTable } from '../AlertHistoryTable';
import type { AlertHistoryEntry } from '@/contracts';

const mockHistory: AlertHistoryEntry[] = [
  {
    id: 1,
    alertId: 1,
    symbol: 'CBA.AX',
    alertType: 'PRICE_ABOVE',
    threshold: 105.5,
    triggeredAt: '2026-02-03T14:30:00Z',
    priceAtTrigger: 106.25,
    notificationSent: true,
  },
  {
    id: 2,
    alertId: 2,
    symbol: 'BHP.AX',
    alertType: 'PRICE_BELOW',
    threshold: 42.0,
    triggeredAt: '2026-02-04T09:15:00Z',
    priceAtTrigger: 41.5,
    notificationSent: false,
  },
];

describe('AlertHistoryTable', () => {
  it('should render history entries', () => {
    render(<AlertHistoryTable history={mockHistory} />);

    expect(screen.getByText('CBA.AX')).toBeInTheDocument();
    expect(screen.getByText('BHP.AX')).toBeInTheDocument();
  });

  it('should display alert types as readable labels', () => {
    render(<AlertHistoryTable history={mockHistory} />);

    expect(screen.getByText('Price Above')).toBeInTheDocument();
    expect(screen.getByText('Price Below')).toBeInTheDocument();
  });

  it('should format prices correctly', () => {
    render(<AlertHistoryTable history={mockHistory} />);

    expect(screen.getByText('$105.50')).toBeInTheDocument();
    expect(screen.getByText('$106.25')).toBeInTheDocument();
    expect(screen.getByText('$42.00')).toBeInTheDocument();
    expect(screen.getByText('$41.50')).toBeInTheDocument();
  });

  it('should show notification sent status', () => {
    render(<AlertHistoryTable history={mockHistory} />);

    // First entry: notificationSent = true, Second: false
    // Check for visual indicators (checkmark/cross via aria-labels or test-ids)
    const sentIndicators = screen.getAllByLabelText(/notification/i);
    expect(sentIndicators.length).toBe(2);
  });

  it('should display triggered dates', () => {
    render(<AlertHistoryTable history={mockHistory} />);

    // Dates should be rendered in some format - multiple rows have dates
    const dateElements = screen.getAllByText(/2026/);
    expect(dateElements.length).toBeGreaterThan(0);
  });

  it('should show empty state when no history', () => {
    render(<AlertHistoryTable history={[]} />);

    expect(screen.getByText(/no alert history/i)).toBeInTheDocument();
  });

  it('should render table headers', () => {
    render(<AlertHistoryTable history={mockHistory} />);

    expect(screen.getByText(/symbol/i)).toBeInTheDocument();
    expect(screen.getByText(/type/i)).toBeInTheDocument();
    expect(screen.getByText(/threshold/i)).toBeInTheDocument();
  });
});
