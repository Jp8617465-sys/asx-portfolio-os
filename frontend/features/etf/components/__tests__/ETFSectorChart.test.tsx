import React from 'react';
import { render, screen } from '@testing-library/react';
import { ETFSectorChart } from '../ETFSectorChart';
import type { ETFSectorAllocationEntry } from '@/contracts';

const mockSectors: ETFSectorAllocationEntry[] = [
  { sector: 'Financials', weight: 32.5, holdingCount: 45 },
  { sector: 'Materials', weight: 20.1, holdingCount: 30 },
  { sector: 'Healthcare', weight: 10.8, holdingCount: 15 },
  { sector: 'Technology', weight: 8.5, holdingCount: 12 },
];

describe('ETFSectorChart', () => {
  it('should render all sector names', () => {
    render(<ETFSectorChart sectors={mockSectors} />);
    expect(screen.getByText('Financials')).toBeInTheDocument();
    expect(screen.getByText('Materials')).toBeInTheDocument();
    expect(screen.getByText('Healthcare')).toBeInTheDocument();
    expect(screen.getByText('Technology')).toBeInTheDocument();
  });

  it('should render weight percentages', () => {
    render(<ETFSectorChart sectors={mockSectors} />);
    expect(screen.getByText('32.50%')).toBeInTheDocument();
    expect(screen.getByText('20.10%')).toBeInTheDocument();
    expect(screen.getByText('10.80%')).toBeInTheDocument();
    expect(screen.getByText('8.50%')).toBeInTheDocument();
  });

  it('should render empty state when no sectors', () => {
    render(<ETFSectorChart sectors={[]} />);
    expect(screen.getByText('No Sector Data')).toBeInTheDocument();
  });

  it('should render sectors sorted by weight descending', () => {
    const unsorted: ETFSectorAllocationEntry[] = [
      { sector: 'Technology', weight: 8.5, holdingCount: 12 },
      { sector: 'Financials', weight: 32.5, holdingCount: 45 },
      { sector: 'Healthcare', weight: 10.8, holdingCount: 15 },
    ];

    render(<ETFSectorChart sectors={unsorted} />);

    const sectorNames = screen.getAllByTestId('sector-name');
    expect(sectorNames[0]).toHaveTextContent('Financials');
    expect(sectorNames[1]).toHaveTextContent('Healthcare');
    expect(sectorNames[2]).toHaveTextContent('Technology');
  });

  it('should render holding counts', () => {
    render(<ETFSectorChart sectors={mockSectors} />);
    expect(screen.getByText('45 holdings')).toBeInTheDocument();
    expect(screen.getByText('30 holdings')).toBeInTheDocument();
  });
});
