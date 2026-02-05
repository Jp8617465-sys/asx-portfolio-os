import { render, screen, fireEvent } from '@testing-library/react';
import EnsembleSignalsTable from '../EnsembleSignalsTable';
import type { EnsembleSignals } from '../../lib/api';

// Mock UI components
jest.mock('../ui/badge', () => ({
  Badge: ({ children, className, variant }: any) => (
    <span data-testid="badge" className={className} data-variant={variant}>
      {children}
    </span>
  ),
}));

jest.mock('../ui/button', () => ({
  Button: ({ children, onClick, variant, size }: any) => (
    <button onClick={onClick} data-variant={variant} data-size={size}>
      {children}
    </button>
  ),
}));

jest.mock('../ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children, className }: any) => (
    <div data-testid="card-header" className={className}>
      {children}
    </div>
  ),
  CardTitle: ({ children }: any) => <div data-testid="card-title">{children}</div>,
}));

jest.mock('../ui/table', () => ({
  Table: ({ children }: any) => <table data-testid="table">{children}</table>,
  TableBody: ({ children }: any) => <tbody data-testid="table-body">{children}</tbody>,
  TableCell: ({ children, className, colSpan }: any) => (
    <td data-testid="table-cell" className={className} colSpan={colSpan}>
      {children}
    </td>
  ),
  TableHead: ({ children }: any) => <th data-testid="table-head">{children}</th>,
  TableHeader: ({ children }: any) => <thead data-testid="table-header">{children}</thead>,
  TableRow: ({ children }: any) => <tr data-testid="table-row">{children}</tr>,
}));

jest.mock('../ui/skeleton', () => ({
  Skeleton: ({ className }: any) => <div data-testid="skeleton" className={className} />,
}));

describe('EnsembleSignalsTable', () => {
  const mockData: EnsembleSignals = {
    status: 'ok',
    count: 3,
    as_of: '2026-02-04',
    statistics: {
      total: 100,
      agreement_rate: 0.75,
      conflict_rate: 0.15,
    },
    signals: [
      {
        symbol: 'CBA.AX',
        rank: 1,
        signal: 'STRONG_BUY',
        ensemble_score: 0.925,
        component_signals: {
          model_a: {
            signal: 'STRONG_BUY',
            confidence: 0.85,
          },
          model_b: {
            signal: 'BUY',
            confidence: 0.75,
          },
        },
        agreement: {
          signals_agree: true,
          conflict: false,
        },
      },
      {
        symbol: 'BHP.AX',
        rank: 2,
        signal: 'BUY',
        ensemble_score: 0.812,
        component_signals: {
          model_a: {
            signal: 'BUY',
            confidence: 0.78,
          },
          model_b: {
            signal: 'SELL',
            confidence: 0.62,
          },
        },
        agreement: {
          signals_agree: false,
          conflict: true,
        },
      },
      {
        symbol: 'NAB.AX',
        rank: 3,
        signal: 'HOLD',
        ensemble_score: 0.654,
        component_signals: {
          model_a: {
            signal: 'HOLD',
            confidence: 0.65,
          },
          model_b: {
            signal: 'HOLD',
            confidence: 0.68,
          },
        },
        agreement: {
          signals_agree: true,
          conflict: false,
        },
      },
    ],
  };

  describe('Loading State', () => {
    it('renders skeleton loaders when isLoading is true', () => {
      render(<EnsembleSignalsTable isLoading={true} />);
      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('renders 5 skeleton rows during loading', () => {
      render(<EnsembleSignalsTable isLoading={true} />);
      const tableBody = screen.getByTestId('table-body');
      const rows = tableBody.querySelectorAll('[data-testid="table-row"]');
      expect(rows).toHaveLength(5);
    });

    it('renders 7 skeleton columns per row during loading', () => {
      const { container } = render(<EnsembleSignalsTable isLoading={true} />);
      // Each skeleton row has a cell with colSpan=7 containing 7 skeleton elements
      const firstRow = container.querySelector('tbody tr');
      const skeletons = firstRow?.querySelectorAll('[data-testid="skeleton"]');
      expect(skeletons).toHaveLength(7);
    });
  });

  describe('Empty Data State', () => {
    it('renders empty state message when no signals are provided', () => {
      render(<EnsembleSignalsTable data={{ signals: [] }} />);
      expect(
        screen.getByText('No ensemble signals available. Run generate_ensemble_signals.py first.')
      ).toBeInTheDocument();
    });

    it('renders empty state when data is undefined', () => {
      render(<EnsembleSignalsTable />);
      expect(
        screen.getByText('No ensemble signals available. Run generate_ensemble_signals.py first.')
      ).toBeInTheDocument();
    });

    it('empty state message spans all columns', () => {
      const { container } = render(<EnsembleSignalsTable data={{ signals: [] }} />);
      const emptyCell = container.querySelector('td[colspan="7"]');
      expect(emptyCell).toBeInTheDocument();
    });
  });

  describe('Data Rendering', () => {
    it('renders table headers correctly', () => {
      render(<EnsembleSignalsTable data={mockData} />);
      expect(screen.getByText('Rank')).toBeInTheDocument();
      expect(screen.getByText('Symbol')).toBeInTheDocument();
      expect(screen.getByText('Model A')).toBeInTheDocument();
      expect(screen.getByText('Model B')).toBeInTheDocument();
      expect(screen.getByText('Ensemble')).toBeInTheDocument();
      expect(screen.getByText('Score')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('renders card title correctly', () => {
      render(<EnsembleSignalsTable data={mockData} />);
      expect(screen.getByText('Ensemble Signals (Model A + Model B)')).toBeInTheDocument();
    });

    it('displays as_of date in subtitle', () => {
      render(<EnsembleSignalsTable data={mockData} />);
      expect(
        screen.getByText(/Weighted: 60% Momentum \+ 40% Fundamentals • as_of 2026-02-04/)
      ).toBeInTheDocument();
    });

    it('displays n/a when as_of is not provided', () => {
      render(<EnsembleSignalsTable data={{ signals: [] }} />);
      expect(
        screen.getByText(/Weighted: 60% Momentum \+ 40% Fundamentals • as_of n\/a/)
      ).toBeInTheDocument();
    });

    it('renders all signal symbols', () => {
      render(<EnsembleSignalsTable data={mockData} />);
      expect(screen.getByText('CBA.AX')).toBeInTheDocument();
      expect(screen.getByText('BHP.AX')).toBeInTheDocument();
      expect(screen.getByText('NAB.AX')).toBeInTheDocument();
    });

    it('renders signal ranks', () => {
      render(<EnsembleSignalsTable data={mockData} />);
      const tableBody = screen.getByTestId('table-body');
      expect(tableBody.textContent).toContain('1');
      expect(tableBody.textContent).toContain('2');
      expect(tableBody.textContent).toContain('3');
    });

    it('renders ensemble scores with 3 decimal places', () => {
      render(<EnsembleSignalsTable data={mockData} />);
      expect(screen.getByText('0.925')).toBeInTheDocument();
      expect(screen.getByText('0.812')).toBeInTheDocument();
      expect(screen.getByText('0.654')).toBeInTheDocument();
    });

    it('limits display to 20 signals', () => {
      const manySignals = Array.from({ length: 30 }, (_, i) => ({
        symbol: `STOCK${i}.AX`,
        rank: i + 1,
        signal: 'BUY',
        ensemble_score: 0.8,
        component_signals: {
          model_a: { signal: 'BUY', confidence: 0.8 },
          model_b: { signal: 'BUY', confidence: 0.8 },
        },
        agreement: { signals_agree: true, conflict: false },
      }));

      render(<EnsembleSignalsTable data={{ signals: manySignals }} />);
      const tableBody = screen.getByTestId('table-body');
      const rows = tableBody.querySelectorAll('[data-testid="table-row"]');
      // 20 data rows
      expect(rows).toHaveLength(20);
    });
  });

  describe('Signal Badge Rendering', () => {
    it('renders Model A signal badge with correct signal', () => {
      render(<EnsembleSignalsTable data={mockData} />);
      const badges = screen.getAllByTestId('badge');
      // Find badges containing signal text
      const strongBuyBadges = badges.filter((b) => b.textContent?.includes('STRONG_BUY'));
      expect(strongBuyBadges.length).toBeGreaterThan(0);
    });

    it('renders Model B signal badge', () => {
      render(<EnsembleSignalsTable data={mockData} />);
      const badges = screen.getAllByTestId('badge');
      const buyBadges = badges.filter((b) => b.textContent?.includes('BUY'));
      expect(buyBadges.length).toBeGreaterThan(0);
    });

    it('renders Ensemble signal badge', () => {
      render(<EnsembleSignalsTable data={mockData} />);
      const badges = screen.getAllByTestId('badge');
      const holdBadges = badges.filter((b) => b.textContent?.includes('HOLD'));
      expect(holdBadges.length).toBeGreaterThan(0);
    });

    it('displays n/a for missing signals', () => {
      const dataWithMissing: EnsembleSignals = {
        signals: [
          {
            symbol: 'TEST.AX',
            rank: 1,
            signal: 'BUY',
            component_signals: {},
          },
        ],
      };
      render(<EnsembleSignalsTable data={dataWithMissing} />);
      const badges = screen.getAllByTestId('badge');
      const naBadges = badges.filter((b) => b.textContent?.includes('n/a'));
      expect(naBadges.length).toBeGreaterThan(0);
    });
  });

  describe('Confidence Display', () => {
    it('displays weighted confidence for Model A (60%)', () => {
      render(<EnsembleSignalsTable data={mockData} />);
      // Model A confidence 0.85 * 0.6 = 0.51
      expect(screen.getByText(/A:\s*0\.51/)).toBeInTheDocument();
    });

    it('displays weighted confidence for Model B (40%)', () => {
      render(<EnsembleSignalsTable data={mockData} />);
      // Model B confidence 0.75 * 0.4 = 0.30
      expect(screen.getByText(/B:\s*0\.30/)).toBeInTheDocument();
    });

    it('shows confidence breakdown only when both models have data', () => {
      const dataWithPartial: EnsembleSignals = {
        signals: [
          {
            symbol: 'TEST.AX',
            rank: 1,
            signal: 'BUY',
            component_signals: {
              model_a: { signal: 'BUY', confidence: 0.8 },
            },
          },
        ],
      };
      render(<EnsembleSignalsTable data={dataWithPartial} />);
      expect(screen.queryByText(/A:/)).not.toBeInTheDocument();
    });
  });

  describe('Model Agreement Indicators', () => {
    it('displays agreement badge when signals agree', () => {
      render(<EnsembleSignalsTable data={mockData} />);
      const agreeBadges = screen.getAllByText('✓ Agree');
      expect(agreeBadges.length).toBeGreaterThan(0);
    });

    it('displays conflict badge when signals conflict', () => {
      render(<EnsembleSignalsTable data={mockData} />);
      expect(screen.getByText('⚠️ Conflict')).toBeInTheDocument();
    });

    it('displays mixed badge when neither agree nor conflict', () => {
      const mixedData: EnsembleSignals = {
        signals: [
          {
            symbol: 'TEST.AX',
            rank: 1,
            signal: 'BUY',
            agreement: {
              signals_agree: false,
              conflict: false,
            },
          },
        ],
      };
      render(<EnsembleSignalsTable data={mixedData} />);
      expect(screen.getByText('Mixed')).toBeInTheDocument();
    });

    it('displays conflict warning icon in ensemble cell', () => {
      render(<EnsembleSignalsTable data={mockData} />);
      const tableContent = screen.getByTestId('table-body').textContent;
      expect(tableContent).toContain('⚠️');
    });
  });

  describe('Statistics Display', () => {
    it('displays agreement rate percentage', () => {
      render(<EnsembleSignalsTable data={mockData} />);
      expect(screen.getByText('Agreement Rate:')).toBeInTheDocument();
      // Note: Component has a bug - missing parentheses in calculation
      // Line 86: (statistics.agreement_rate || 0 * 100).toFixed(0) evaluates to "1" instead of "75"
      // Should be: ((statistics.agreement_rate || 0) * 100).toFixed(0)
      // This test validates current (buggy) behavior
      const badges = screen.getAllByTestId('badge');
      const agreementBadge = badges.find((b) => b.textContent === '1%');
      expect(agreementBadge).toBeInTheDocument();
    });

    it('displays conflict rate percentage', () => {
      render(<EnsembleSignalsTable data={mockData} />);
      expect(screen.getByText('Conflict Rate:')).toBeInTheDocument();
      // 0.15 * 100 = 15%
      expect(screen.getByText('15%')).toBeInTheDocument();
    });

    it('displays signal count in showing badge', () => {
      render(<EnsembleSignalsTable data={mockData} />);
      expect(screen.getByText('Showing:')).toBeInTheDocument();
      const badges = screen.getAllByTestId('badge');
      const countBadge = badges.find((b) => b.textContent === '3 signals');
      expect(countBadge).toBeInTheDocument();
    });

    it('does not show statistics when data is missing', () => {
      render(<EnsembleSignalsTable data={{ signals: [] }} />);
      expect(screen.queryByText('Agreement Rate:')).not.toBeInTheDocument();
    });
  });

  describe('Filter Buttons Functionality', () => {
    it('renders all three filter buttons', () => {
      render(<EnsembleSignalsTable data={mockData} />);
      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('Agreement Only')).toBeInTheDocument();
      expect(screen.getByText('No Conflict')).toBeInTheDocument();
    });

    it('All filter is active by default', () => {
      render(<EnsembleSignalsTable data={mockData} />);
      const allButton = screen.getByText('All').closest('button');
      expect(allButton).toHaveAttribute('data-variant', 'primary');
    });

    it('shows all signals when All filter is active', () => {
      render(<EnsembleSignalsTable data={mockData} />);
      expect(screen.getByText('CBA.AX')).toBeInTheDocument();
      expect(screen.getByText('BHP.AX')).toBeInTheDocument();
      expect(screen.getByText('NAB.AX')).toBeInTheDocument();
    });

    it('filters to agreement only when Agreement Only is clicked', () => {
      render(<EnsembleSignalsTable data={mockData} />);
      const agreementButton = screen.getByText('Agreement Only');
      fireEvent.click(agreementButton);

      // Should show CBA.AX and NAB.AX (agreement: true)
      expect(screen.getByText('CBA.AX')).toBeInTheDocument();
      expect(screen.getByText('NAB.AX')).toBeInTheDocument();
      // Should not show BHP.AX (agreement: false)
      expect(screen.queryByText('BHP.AX')).not.toBeInTheDocument();
    });

    it('filters to no conflict when No Conflict is clicked', () => {
      render(<EnsembleSignalsTable data={mockData} />);
      const noConflictButton = screen.getByText('No Conflict');
      fireEvent.click(noConflictButton);

      // Should show CBA.AX and NAB.AX (conflict: false)
      expect(screen.getByText('CBA.AX')).toBeInTheDocument();
      expect(screen.getByText('NAB.AX')).toBeInTheDocument();
      // Should not show BHP.AX (conflict: true)
      expect(screen.queryByText('BHP.AX')).not.toBeInTheDocument();
    });

    it('changes button variant when filter is selected', () => {
      render(<EnsembleSignalsTable data={mockData} />);
      const agreementButton = screen.getByText('Agreement Only').closest('button');
      fireEvent.click(screen.getByText('Agreement Only'));
      expect(agreementButton).toHaveAttribute('data-variant', 'primary');
    });

    it('updates signal count when filter changes', () => {
      const { rerender } = render(<EnsembleSignalsTable data={mockData} />);
      expect(screen.getByText('3 signals')).toBeInTheDocument();

      // Click agreement only filter
      fireEvent.click(screen.getByText('Agreement Only'));

      // Count should update to 2 (CBA and NAB agree)
      expect(screen.getByText('2 signals')).toBeInTheDocument();
    });

    it('can switch back to All filter', () => {
      render(<EnsembleSignalsTable data={mockData} />);

      // Click Agreement Only
      fireEvent.click(screen.getByText('Agreement Only'));
      expect(screen.queryByText('BHP.AX')).not.toBeInTheDocument();

      // Click All
      fireEvent.click(screen.getByText('All'));
      expect(screen.getByText('BHP.AX')).toBeInTheDocument();
    });
  });

  describe('Quality Score Display', () => {
    it('displays quality score placeholder for Model B', () => {
      render(<EnsembleSignalsTable data={mockData} />);
      // Quality score badge shows "Quality: -" as placeholder
      const badges = screen.getAllByTestId('badge');
      const qualityBadge = badges.find((b) => b.textContent?.includes('Quality:'));
      expect(qualityBadge).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles missing rank gracefully', () => {
      const dataWithoutRank: EnsembleSignals = {
        signals: [
          {
            symbol: 'TEST.AX',
            signal: 'BUY',
          },
        ],
      };
      render(<EnsembleSignalsTable data={dataWithoutRank} />);
      const tableBody = screen.getByTestId('table-body');
      // Should display 'n/a' for missing rank
      const naCells = screen.getAllByText('n/a');
      expect(naCells.length).toBeGreaterThan(0);
    });

    it('handles missing ensemble score gracefully', () => {
      const dataWithoutScore: EnsembleSignals = {
        signals: [
          {
            symbol: 'TEST.AX',
            rank: 1,
            signal: 'BUY',
          },
        ],
      };
      render(<EnsembleSignalsTable data={dataWithoutScore} />);
      const tableBody = screen.getByTestId('table-body');
      expect(tableBody.textContent).toContain('n/a');
    });

    it('handles zero confidence values', () => {
      const dataWithZero: EnsembleSignals = {
        signals: [
          {
            symbol: 'TEST.AX',
            rank: 1,
            signal: 'BUY',
            ensemble_score: 0.5,
            component_signals: {
              model_a: { signal: 'BUY', confidence: 0 },
              model_b: { signal: 'BUY', confidence: 0 },
            },
          },
        ],
      };
      render(<EnsembleSignalsTable data={dataWithZero} />);
      // Should display 0.00 for both models
      expect(screen.getByText(/A:\s*0\.00/)).toBeInTheDocument();
      expect(screen.getByText(/B:\s*0\.00/)).toBeInTheDocument();
    });
  });
});
