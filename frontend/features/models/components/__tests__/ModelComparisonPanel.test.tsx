import { render, screen, waitFor } from '@testing-library/react';
import ModelComparisonPanel from '../ModelComparisonPanel';
import { getSignalComparison } from '@/features/signals/api';
import { SignalType } from '@/contracts';

// Mock the signals API
jest.mock('@/features/signals/api', () => ({
  getSignalComparison: jest.fn(),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  CheckCircle2: ({ className }: any) => <svg data-icon="CheckCircle2" className={className} />,
  AlertTriangle: ({ className }: any) => <svg data-icon="AlertTriangle" className={className} />,
  TrendingUp: ({ className }: any) => <svg data-icon="TrendingUp" className={className} />,
  BarChart3: ({ className }: any) => <svg data-icon="BarChart3" className={className} />,
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardContent: ({ children, className }: any) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  ),
  CardHeader: ({ children, className }: any) => (
    <div data-testid="card-header" className={className}>
      {children}
    </div>
  ),
  CardTitle: ({ children, className }: any) => (
    <div data-testid="card-title" className={className}>
      {children}
    </div>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: any) => (
    <span data-testid="badge" className={className}>
      {children}
    </span>
  ),
}));

// Mock SignalBadge and ConfidenceGauge from features/signals
jest.mock('@/features/signals', () => ({
  SignalBadge: ({ signal, confidence, size }: any) => (
    <div
      data-testid="signal-badge"
      data-signal={signal}
      data-confidence={confidence}
      data-size={size}
    >
      {signal}
    </div>
  ),
  ConfidenceGauge: ({ confidence, signal, size }: any) => (
    <div
      data-testid="confidence-gauge"
      data-confidence={confidence}
      data-signal={signal}
      data-size={size}
    >
      {confidence}%
    </div>
  ),
}));

describe('ModelComparisonPanel', () => {
  const mockComparisonData = {
    model_a: {
      signal: 'STRONG_BUY' as SignalType,
      confidence: 0.85,
    },
    model_b: {
      signal: 'BUY' as SignalType,
      quality: 'A',
    },
    ensemble: {
      signal: 'STRONG_BUY' as SignalType,
      confidence: 0.82,
    },
    signals_agree: true,
    conflict: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('renders loading skeleton while fetching data', () => {
      (getSignalComparison as jest.Mock).mockReturnValue(new Promise(() => {}));

      render(<ModelComparisonPanel ticker="CBA.AX" />);

      const cards = screen.getAllByTestId('card');
      // Should render 3 loading cards
      expect(cards).toHaveLength(3);
    });

    it('applies animate-pulse class during loading', () => {
      (getSignalComparison as jest.Mock).mockReturnValue(new Promise(() => {}));

      const { container } = render(<ModelComparisonPanel ticker="CBA.AX" />);

      const animatedCards = container.querySelectorAll('.animate-pulse');
      expect(animatedCards.length).toBeGreaterThan(0);
    });

    it('renders loading placeholder elements', () => {
      (getSignalComparison as jest.Mock).mockReturnValue(new Promise(() => {}));

      const { container } = render(<ModelComparisonPanel ticker="CBA.AX" />);

      // Check for placeholder divs with bg-gray-200
      const placeholders = container.querySelectorAll('.bg-gray-200, .dark\\:bg-gray-700');
      expect(placeholders.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('returns null when API call fails', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      (getSignalComparison as jest.Mock).mockRejectedValue(new Error('API Error'));

      const { container } = render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });

      consoleError.mockRestore();
    });

    it('logs error to console when API fails', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      (getSignalComparison as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Failed to load model comparison:',
          expect.any(Error)
        );
      });

      consoleError.mockRestore();
    });

    it('returns null when comparison data is null', async () => {
      (getSignalComparison as jest.Mock).mockResolvedValue({ data: null });

      const { container } = render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });
  });

  describe('Data Rendering - Model A', () => {
    beforeEach(() => {
      (getSignalComparison as jest.Mock).mockResolvedValue({ data: mockComparisonData });
    });

    it('renders Model A card with title', async () => {
      render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        const titles = screen.getAllByText('Model A');
        expect(titles.length).toBeGreaterThan(0);
      });
    });

    it('renders Model A subtitle', async () => {
      render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        expect(screen.getByText('Technical Analysis')).toBeInTheDocument();
      });
    });

    it('renders Model A icon', async () => {
      const { container } = render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        const trendingUpIcon = container.querySelector('[data-icon="TrendingUp"]');
        expect(trendingUpIcon).toBeInTheDocument();
      });
    });

    it('renders Model A signal badge with correct props', async () => {
      render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        const signalBadges = screen.getAllByTestId('signal-badge');
        const modelABadge = signalBadges.find((badge) => badge.getAttribute('data-size') === 'lg');
        expect(modelABadge).toHaveAttribute('data-signal', 'STRONG_BUY');
        expect(modelABadge).toHaveAttribute('data-confidence', '0.85');
      });
    });

    it('renders Model A confidence gauge', async () => {
      render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        const gauges = screen.getAllByTestId('confidence-gauge');
        const modelAGauge = gauges.find((g) => g.getAttribute('data-confidence') === '0.85');
        expect(modelAGauge).toBeInTheDocument();
        expect(modelAGauge).toHaveAttribute('data-signal', 'STRONG_BUY');
        expect(modelAGauge).toHaveAttribute('data-size', 'sm');
      });
    });

    it('displays Model A confidence percentage', async () => {
      render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        expect(screen.getByText('85% Confidence')).toBeInTheDocument();
      });
    });
  });

  describe('Data Rendering - Model B', () => {
    beforeEach(() => {
      (getSignalComparison as jest.Mock).mockResolvedValue({ data: mockComparisonData });
    });

    it('renders Model B card with title', async () => {
      render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        const titles = screen.getAllByText('Model B');
        expect(titles.length).toBeGreaterThan(0);
      });
    });

    it('renders Model B subtitle', async () => {
      render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        expect(screen.getByText('Fundamental Analysis')).toBeInTheDocument();
      });
    });

    it('renders Model B icon', async () => {
      const { container } = render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        const barChartIcon = container.querySelector('[data-icon="BarChart3"]');
        expect(barChartIcon).toBeInTheDocument();
      });
    });

    it('renders Model B signal badge', async () => {
      render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        const signalBadges = screen.getAllByTestId('signal-badge');
        // Model B badge with fixed confidence of 75
        const modelBBadge = signalBadges.find(
          (badge) =>
            badge.getAttribute('data-signal') === 'BUY' &&
            badge.getAttribute('data-confidence') === '75'
        );
        expect(modelBBadge).toBeInTheDocument();
      });
    });

    it('renders Model B quality score', async () => {
      render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        expect(screen.getByText('Quality Score')).toBeInTheDocument();
        expect(screen.getByText('A')).toBeInTheDocument();
      });
    });

    it('displays quality metrics description', async () => {
      render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        expect(screen.getByText('Based on financial metrics')).toBeInTheDocument();
      });
    });
  });

  describe('Data Rendering - Ensemble', () => {
    beforeEach(() => {
      (getSignalComparison as jest.Mock).mockResolvedValue({ data: mockComparisonData });
    });

    it('renders Ensemble card with title', async () => {
      render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        const titles = screen.getAllByText('Ensemble');
        expect(titles.length).toBeGreaterThan(0);
      });
    });

    it('renders Ensemble subtitle', async () => {
      render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        expect(screen.getByText('Combined Recommendation')).toBeInTheDocument();
      });
    });

    it('applies gradient background to Ensemble card', async () => {
      const { container } = render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        const ensembleCard = container.querySelector('.bg-gradient-to-br');
        expect(ensembleCard).toBeInTheDocument();
      });
    });

    it('renders Ensemble signal badge', async () => {
      render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        const signalBadges = screen.getAllByTestId('signal-badge');
        const ensembleBadge = signalBadges.find(
          (badge) =>
            badge.getAttribute('data-signal') === 'STRONG_BUY' &&
            badge.getAttribute('data-confidence') === '0.82'
        );
        expect(ensembleBadge).toBeInTheDocument();
      });
    });

    it('renders Ensemble confidence gauge', async () => {
      render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        const gauges = screen.getAllByTestId('confidence-gauge');
        const ensembleGauge = gauges.find((g) => g.getAttribute('data-confidence') === '0.82');
        expect(ensembleGauge).toBeInTheDocument();
        expect(ensembleGauge).toHaveAttribute('data-signal', 'STRONG_BUY');
      });
    });

    it('displays Ensemble confidence percentage', async () => {
      render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        expect(screen.getByText('82% Confidence')).toBeInTheDocument();
      });
    });

    it('displays weighting explanation', async () => {
      render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        expect(screen.getByText('60% Technical + 40% Fundamental')).toBeInTheDocument();
      });
    });
  });

  describe('Agreement Banner', () => {
    it('displays agreement banner when signals agree', async () => {
      (getSignalComparison as jest.Mock).mockResolvedValue({ data: mockComparisonData });

      const { container } = render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        expect(screen.getByText('Models Agree')).toBeInTheDocument();
        const checkIcon = container.querySelector('[data-icon="CheckCircle2"]');
        expect(checkIcon).toBeInTheDocument();
      });
    });

    it('displays agreement banner message', async () => {
      (getSignalComparison as jest.Mock).mockResolvedValue({ data: mockComparisonData });

      render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        expect(
          screen.getByText('Both technical and fundamental analysis support this signal')
        ).toBeInTheDocument();
      });
    });

    it('applies green styling to agreement banner', async () => {
      (getSignalComparison as jest.Mock).mockResolvedValue({ data: mockComparisonData });

      const { container } = render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        const banner = container.querySelector('.bg-green-50');
        expect(banner).toBeInTheDocument();
      });
    });

    it('does not show agreement banner when signals do not agree', async () => {
      const conflictData = { ...mockComparisonData, signals_agree: false };
      (getSignalComparison as jest.Mock).mockResolvedValue({ data: conflictData });

      render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        expect(screen.queryByText('Models Agree')).not.toBeInTheDocument();
      });
    });
  });

  describe('Conflict Banner', () => {
    it('displays conflict banner when conflict is true', async () => {
      const conflictData = { ...mockComparisonData, conflict: true, signals_agree: false };
      (getSignalComparison as jest.Mock).mockResolvedValue({ data: conflictData });

      const { container } = render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        expect(screen.getByText('Model Conflict Detected')).toBeInTheDocument();
        const alertIcon = container.querySelector('[data-icon="AlertTriangle"]');
        expect(alertIcon).toBeInTheDocument();
      });
    });

    it('displays conflict banner message', async () => {
      const conflictData = { ...mockComparisonData, conflict: true, signals_agree: false };
      (getSignalComparison as jest.Mock).mockResolvedValue({ data: conflictData });

      render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        expect(
          screen.getByText('Technical and fundamental signals disagree - review carefully')
        ).toBeInTheDocument();
      });
    });

    it('applies yellow styling to conflict banner', async () => {
      const conflictData = { ...mockComparisonData, conflict: true, signals_agree: false };
      (getSignalComparison as jest.Mock).mockResolvedValue({ data: conflictData });

      const { container } = render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        const banner = container.querySelector('.bg-yellow-50');
        expect(banner).toBeInTheDocument();
      });
    });

    it('does not show conflict banner when conflict is false', async () => {
      (getSignalComparison as jest.Mock).mockResolvedValue({ data: mockComparisonData });

      render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        expect(screen.queryByText('Model Conflict Detected')).not.toBeInTheDocument();
      });
    });
  });

  describe('Quality Color Mapping', () => {
    it('applies green color for A grade', async () => {
      (getSignalComparison as jest.Mock).mockResolvedValue({ data: mockComparisonData });

      const { container } = render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        const gradeA = screen.getByText('A');
        expect(gradeA.className).toContain('text-green-600');
      });
    });

    it('applies lime color for B grade', async () => {
      const bGradeData = { ...mockComparisonData, model_b: { signal: 'BUY', quality: 'B' } };
      (getSignalComparison as jest.Mock).mockResolvedValue({ data: bGradeData });

      const { container } = render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        const gradeB = screen.getByText('B');
        expect(gradeB.className).toContain('text-lime-600');
      });
    });

    it('applies yellow color for C grade', async () => {
      const cGradeData = { ...mockComparisonData, model_b: { signal: 'HOLD', quality: 'C' } };
      (getSignalComparison as jest.Mock).mockResolvedValue({ data: cGradeData });

      const { container } = render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        const gradeC = screen.getByText('C');
        expect(gradeC.className).toContain('text-yellow-600');
      });
    });

    it('applies orange color for D grade', async () => {
      const dGradeData = { ...mockComparisonData, model_b: { signal: 'SELL', quality: 'D' } };
      (getSignalComparison as jest.Mock).mockResolvedValue({ data: dGradeData });

      const { container } = render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        const gradeD = screen.getByText('D');
        expect(gradeD.className).toContain('text-orange-600');
      });
    });

    it('applies red color for F grade', async () => {
      const fGradeData = {
        ...mockComparisonData,
        model_b: { signal: 'STRONG_SELL', quality: 'F' },
      };
      (getSignalComparison as jest.Mock).mockResolvedValue({ data: fGradeData });

      const { container } = render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        const gradeF = screen.getByText('F');
        expect(gradeF.className).toContain('text-red-600');
      });
    });

    it('applies gray color for unknown grade', async () => {
      const unknownGradeData = { ...mockComparisonData, model_b: { signal: 'BUY', quality: 'X' } };
      (getSignalComparison as jest.Mock).mockResolvedValue({ data: unknownGradeData });

      const { container } = render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        const gradeX = screen.getByText('X');
        expect(gradeX.className).toContain('text-gray-600');
      });
    });
  });

  describe('Explanation Section', () => {
    beforeEach(() => {
      (getSignalComparison as jest.Mock).mockResolvedValue({ data: mockComparisonData });
    });

    it('renders explanation section title', async () => {
      render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        expect(screen.getByText('How the Ensemble Works')).toBeInTheDocument();
      });
    });

    it('renders Model A description', async () => {
      render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        expect(
          screen.getByText(/analyzes price momentum, volume trends, and technical indicators/)
        ).toBeInTheDocument();
      });
    });

    it('renders Model B description', async () => {
      render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        expect(
          screen.getByText(/evaluates financial health, profitability, and valuation metrics/)
        ).toBeInTheDocument();
      });
    });

    it('renders Ensemble description', async () => {
      render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        expect(
          screen.getByText(/combines both models with 60% weight on technical, 40% on fundamentals/)
        ).toBeInTheDocument();
      });
    });

    it('shows agreement message when signals agree', async () => {
      render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        expect(
          screen.getByText(/When models agree, the signal is more reliable/)
        ).toBeInTheDocument();
      });
    });

    it('shows conflict message when signals disagree', async () => {
      const conflictData = { ...mockComparisonData, signals_agree: false };
      (getSignalComparison as jest.Mock).mockResolvedValue({ data: conflictData });

      render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        expect(
          screen.getByText(/When models conflict, additional research is recommended/)
        ).toBeInTheDocument();
      });
    });
  });

  describe('API Integration', () => {
    it('calls getSignalComparison with correct ticker on mount', async () => {
      (getSignalComparison as jest.Mock).mockResolvedValue({ data: mockComparisonData });

      render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        expect(getSignalComparison).toHaveBeenCalledWith('CBA.AX');
      });
    });

    it('reloads comparison when ticker changes', async () => {
      (getSignalComparison as jest.Mock).mockResolvedValue({ data: mockComparisonData });

      const { rerender } = render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        expect(getSignalComparison).toHaveBeenCalledWith('CBA.AX');
      });

      rerender(<ModelComparisonPanel ticker="BHP.AX" />);

      await waitFor(() => {
        expect(getSignalComparison).toHaveBeenCalledWith('BHP.AX');
      });
    });

    it('calls API only once per ticker', async () => {
      (getSignalComparison as jest.Mock).mockResolvedValue({ data: mockComparisonData });

      render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        expect(getSignalComparison).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Different Signal Types', () => {
    it('renders STRONG_SELL signals correctly', async () => {
      const strongSellData = {
        model_a: { signal: 'STRONG_SELL' as SignalType, confidence: 0.9 },
        model_b: { signal: 'STRONG_SELL' as SignalType, quality: 'F' },
        ensemble: { signal: 'STRONG_SELL' as SignalType, confidence: 0.88 },
        signals_agree: true,
        conflict: false,
      };
      (getSignalComparison as jest.Mock).mockResolvedValue({ data: strongSellData });

      render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        const badges = screen.getAllByTestId('signal-badge');
        const strongSellBadges = badges.filter(
          (b) => b.getAttribute('data-signal') === 'STRONG_SELL'
        );
        expect(strongSellBadges.length).toBeGreaterThan(0);
      });
    });

    it('renders HOLD signals correctly', async () => {
      const holdData = {
        model_a: { signal: 'HOLD' as SignalType, confidence: 0.6 },
        model_b: { signal: 'HOLD' as SignalType, quality: 'C' },
        ensemble: { signal: 'HOLD' as SignalType, confidence: 0.58 },
        signals_agree: true,
        conflict: false,
      };
      (getSignalComparison as jest.Mock).mockResolvedValue({ data: holdData });

      render(<ModelComparisonPanel ticker="CBA.AX" />);

      await waitFor(() => {
        const badges = screen.getAllByTestId('signal-badge');
        const holdBadges = badges.filter((b) => b.getAttribute('data-signal') === 'HOLD');
        expect(holdBadges.length).toBeGreaterThan(0);
      });
    });
  });
});
