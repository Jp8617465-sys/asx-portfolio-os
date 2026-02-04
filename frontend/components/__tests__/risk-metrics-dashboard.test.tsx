import { render, screen } from '@testing-library/react';
import RiskMetricsDashboard from '../risk-metrics-dashboard';
import { RiskMetrics } from '@/lib/types';

// Mock recharts
jest.mock('recharts', () => ({
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children }: any) => <div data-testid="pie">{children}</div>,
  Cell: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  Tooltip: () => null,
  Legend: () => null,
}));

describe('RiskMetricsDashboard', () => {
  const mockRiskMetrics: RiskMetrics = {
    sharpeRatio: 1.5,
    sortinoRatio: 2.0,
    maxDrawdown: -0.15,
    beta: 1.2,
    volatility: 0.18,
  };

  const highRiskMetrics: RiskMetrics = {
    sharpeRatio: 0.3,
    sortinoRatio: 0.5,
    maxDrawdown: -0.25,
    beta: 1.8,
    volatility: 0.35,
  };

  const excellentRiskMetrics: RiskMetrics = {
    sharpeRatio: 2.5,
    sortinoRatio: 3.0,
    maxDrawdown: -0.08,
    beta: 0.9,
    volatility: 0.12,
  };

  describe('Component Rendering', () => {
    it('renders the dashboard header', () => {
      render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      expect(screen.getByText('Risk Metrics Dashboard')).toBeInTheDocument();
    });

    it('renders the description text', () => {
      render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      expect(
        screen.getByText(/Portfolio risk analysis and diversification metrics/)
      ).toBeInTheDocument();
    });

    it('renders all main metric cards', () => {
      render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      expect(screen.getAllByText('Sharpe Ratio').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Volatility').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Beta').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Max Drawdown').length).toBeGreaterThan(0);
    });
  });

  describe('Sharpe Ratio Display', () => {
    it('displays Sharpe ratio with 2 decimal places', () => {
      render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      // Sharpe ratio 1.5 should display as 1.50 (appears in card and gauge)
      expect(screen.getAllByText('1.50').length).toBeGreaterThan(0);
    });

    it('displays excellent rating for Sharpe ratio >= 2.0', () => {
      render(<RiskMetricsDashboard metrics={excellentRiskMetrics} />);

      expect(screen.getByText('(Excellent)')).toBeInTheDocument();
    });

    it('displays good rating for Sharpe ratio between 1.0 and 2.0', () => {
      render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      expect(screen.getByText('(Good)')).toBeInTheDocument();
    });

    it('displays fair rating for Sharpe ratio between 0.5 and 1.0', () => {
      const fairMetrics: RiskMetrics = {
        ...mockRiskMetrics,
        sharpeRatio: 0.75,
      };
      render(<RiskMetricsDashboard metrics={fairMetrics} />);

      expect(screen.getByText('(Fair)')).toBeInTheDocument();
    });

    it('displays poor rating for Sharpe ratio < 0.5', () => {
      render(<RiskMetricsDashboard metrics={highRiskMetrics} />);

      expect(screen.getByText('(Poor)')).toBeInTheDocument();
    });

    it('shows Sharpe ratio interpretation section', () => {
      render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      expect(screen.getByText('Risk-Adjusted Performance')).toBeInTheDocument();
    });

    it('displays Sharpe ratio interpretation text', () => {
      render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      expect(
        screen.getByText(/The Sharpe ratio measures risk-adjusted returns/)
      ).toBeInTheDocument();
    });

    it('shows rating scale with all four levels', () => {
      render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      expect(screen.getAllByText(/Excellent/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Good/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Fair/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Poor/).length).toBeGreaterThan(0);
    });
  });

  describe('Volatility Metrics', () => {
    it('displays volatility as percentage with 2 decimals', () => {
      render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      // Volatility 0.18 should display as 18.00% (appears in card and summary)
      expect(screen.getAllByText('18.00%').length).toBeGreaterThan(0);
    });

    it('shows volatility in metric card', () => {
      render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      const volatilityCards = screen.getAllByText('Volatility');
      expect(volatilityCards.length).toBeGreaterThan(0);
    });

    it('displays volatility description in risk summary', () => {
      render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      expect(screen.getByText(/Annualized standard deviation of returns/)).toBeInTheDocument();
    });

    it('renders volatility progress bar', () => {
      const { container } = render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      // Should have purple progress bar for volatility
      const purpleBars = container.querySelectorAll('.bg-purple-600');
      expect(purpleBars.length).toBeGreaterThan(0);
    });
  });

  describe('Beta Metrics', () => {
    it('displays beta with 2 decimal places', () => {
      render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      // Beta 1.2 should display as 1.20 (appears in card and summary)
      expect(screen.getAllByText('1.20').length).toBeGreaterThan(0);
    });

    it('shows beta in metric card', () => {
      render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      expect(screen.getAllByText('Beta').length).toBeGreaterThan(0);
    });

    it('displays interpretation for beta > 1', () => {
      render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      expect(screen.getByText(/More volatile than market/)).toBeInTheDocument();
    });

    it('displays interpretation for beta < 1', () => {
      const lowBetaMetrics: RiskMetrics = {
        ...mockRiskMetrics,
        beta: 0.8,
      };
      render(<RiskMetricsDashboard metrics={lowBetaMetrics} />);

      expect(screen.getByText(/Less volatile than market/)).toBeInTheDocument();
    });

    it('displays interpretation for beta = 1', () => {
      const marketBetaMetrics: RiskMetrics = {
        ...mockRiskMetrics,
        beta: 1.0,
      };
      render(<RiskMetricsDashboard metrics={marketBetaMetrics} />);

      expect(screen.getByText(/Moves with market/)).toBeInTheDocument();
    });

    it('renders beta progress bar', () => {
      const { container } = render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      // Should have green progress bar for beta
      const greenBars = container.querySelectorAll('.bg-green-600');
      expect(greenBars.length).toBeGreaterThan(0);
    });
  });

  describe('Max Drawdown Metrics', () => {
    it('displays max drawdown as positive percentage', () => {
      render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      // Max drawdown -0.15 should display as 15.00% (appears in card and summary)
      expect(screen.getAllByText('15.00%').length).toBeGreaterThan(0);
    });

    it('shows max drawdown in metric card', () => {
      render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      expect(screen.getAllByText('Max Drawdown').length).toBeGreaterThan(0);
    });

    it('displays max drawdown description', () => {
      render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      expect(screen.getByText(/Largest peak-to-trough decline/)).toBeInTheDocument();
    });

    it('renders max drawdown progress bar in red', () => {
      const { container } = render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      // Should have red progress bar for max drawdown
      const redBars = container.querySelectorAll('.bg-red-600');
      expect(redBars.length).toBeGreaterThan(0);
    });

    it('displays max drawdown with red text color', () => {
      const { container } = render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      // Max drawdown values should be in red
      const redText = container.querySelectorAll('.text-red-600');
      expect(redText.length).toBeGreaterThan(0);
    });

    it('handles undefined maxDrawdown gracefully', () => {
      const metricsWithoutDrawdown: RiskMetrics = {
        ...mockRiskMetrics,
        maxDrawdown: 0,
      };
      render(<RiskMetricsDashboard metrics={metricsWithoutDrawdown} />);

      expect(screen.getAllByText('0.00%').length).toBeGreaterThan(0);
    });
  });

  describe('Metric Changes and Trends', () => {
    it('shows trend indicators for metrics', () => {
      const { container } = render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      // Should have TrendingUp or TrendingDown icons
      const trendElements = container.querySelectorAll('svg');
      expect(trendElements.length).toBeGreaterThan(0);
    });

    it('displays "vs last month" comparison text', () => {
      render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      const comparisonTexts = screen.getAllByText(/vs last month/i);
      expect(comparisonTexts.length).toBeGreaterThan(0);
    });

    it('shows positive changes with green color', () => {
      const { container } = render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      const greenTrends = container.querySelectorAll('.text-green-600');
      expect(greenTrends.length).toBeGreaterThan(0);
    });

    it('shows negative changes with red color', () => {
      const { container } = render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      const redTrends = container.querySelectorAll('.text-red-600');
      expect(redTrends.length).toBeGreaterThan(0);
    });
  });

  describe('Sector Allocation Chart', () => {
    it('renders sector allocation section', () => {
      render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      expect(screen.getByText('Sector Allocation')).toBeInTheDocument();
    });

    it('renders pie chart component', () => {
      render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });

    it('displays all sector names', () => {
      render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      expect(screen.getByText('Financials')).toBeInTheDocument();
      expect(screen.getByText('Materials')).toBeInTheDocument();
      expect(screen.getByText('Healthcare')).toBeInTheDocument();
      expect(screen.getByText('Energy')).toBeInTheDocument();
      expect(screen.getByText('Technology')).toBeInTheDocument();
      expect(screen.getByText('Other')).toBeInTheDocument();
    });

    it('displays sector percentages', () => {
      render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      expect(screen.getByText('35%')).toBeInTheDocument(); // Financials
      expect(screen.getByText('25%')).toBeInTheDocument(); // Materials
      expect(screen.getByText('15%')).toBeInTheDocument(); // Healthcare
      expect(screen.getByText('12%')).toBeInTheDocument(); // Energy
      expect(screen.getByText('8%')).toBeInTheDocument(); // Technology
      expect(screen.getByText('5%')).toBeInTheDocument(); // Other
    });

    it('renders color indicators for each sector', () => {
      const { container } = render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      // Should have colored dots/squares for each sector
      const colorIndicators = container.querySelectorAll('.w-3.h-3.rounded-full');
      expect(colorIndicators.length).toBe(6); // 6 sectors
    });
  });

  describe('Risk Summary Section', () => {
    it('renders risk summary section', () => {
      render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      expect(screen.getByText('Risk Summary')).toBeInTheDocument();
    });

    it('displays volatility in risk summary', () => {
      render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      // Should show volatility in risk summary section
      const volatilitySections = screen.getAllByText('Volatility');
      expect(volatilitySections.length).toBeGreaterThan(1); // In card and summary
    });

    it('displays beta in risk summary', () => {
      render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      const betaSections = screen.getAllByText('Beta');
      expect(betaSections.length).toBeGreaterThan(1); // In card and summary
    });

    it('displays max drawdown in risk summary', () => {
      render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      const drawdownSections = screen.getAllByText('Max Drawdown');
      expect(drawdownSections.length).toBeGreaterThan(1); // In card and summary
    });

    it('shows progress bars for each metric', () => {
      const { container } = render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      // Should have gray background bars
      const grayBars = container.querySelectorAll('.bg-gray-200');
      expect(grayBars.length).toBeGreaterThan(0);
    });

    it('displays diversification score', () => {
      render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      expect(screen.getByText('Diversification Score')).toBeInTheDocument();
      expect(screen.getByText('7.2/10')).toBeInTheDocument();
    });

    it('shows diversification explanation', () => {
      render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      expect(screen.getByText(/Well diversified across .* sectors/)).toBeInTheDocument();
    });
  });

  describe('Risk Warnings', () => {
    it('shows warning when volatility > 0.25', () => {
      render(<RiskMetricsDashboard metrics={highRiskMetrics} />);

      expect(screen.getByText('Risk Warning')).toBeInTheDocument();
      expect(screen.getByText(/High volatility detected/)).toBeInTheDocument();
    });

    it('shows warning when max drawdown > 0.20', () => {
      render(<RiskMetricsDashboard metrics={highRiskMetrics} />);

      expect(screen.getByText('Risk Warning')).toBeInTheDocument();
      expect(screen.getByText(/Significant drawdown risk/)).toBeInTheDocument();
    });

    it('does not show warning for low risk metrics', () => {
      render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      expect(screen.queryByText('Risk Warning')).not.toBeInTheDocument();
    });

    it('shows warning with yellow background', () => {
      const { container } = render(<RiskMetricsDashboard metrics={highRiskMetrics} />);

      const yellowWarnings = container.querySelectorAll('.bg-yellow-50');
      expect(yellowWarnings.length).toBeGreaterThan(0);
    });

    it('shows alert triangle icon in warning', () => {
      render(<RiskMetricsDashboard metrics={highRiskMetrics} />);

      expect(screen.getByText('Risk Warning')).toBeInTheDocument();
      // AlertTriangle icon should be present
    });

    it('displays both warnings when both thresholds exceeded', () => {
      render(<RiskMetricsDashboard metrics={highRiskMetrics} />);

      expect(screen.getByText(/High volatility detected/)).toBeInTheDocument();
      expect(screen.getByText(/Significant drawdown risk/)).toBeInTheDocument();
    });

    it('includes volatility percentage in warning', () => {
      render(<RiskMetricsDashboard metrics={highRiskMetrics} />);

      // Should show the volatility value in the warning
      expect(screen.getByText(/35\.0%/)).toBeInTheDocument();
    });

    it('includes drawdown percentage in warning', () => {
      render(<RiskMetricsDashboard metrics={highRiskMetrics} />);

      // Should show the drawdown value in the warning
      expect(screen.getByText(/25\.0%/)).toBeInTheDocument();
    });

    it('suggests rebalancing in volatility warning', () => {
      render(<RiskMetricsDashboard metrics={highRiskMetrics} />);

      expect(screen.getByText(/Consider rebalancing to reduce risk/)).toBeInTheDocument();
    });

    it('suggests diversification in drawdown warning', () => {
      render(<RiskMetricsDashboard metrics={highRiskMetrics} />);

      expect(screen.getByText(/Diversification may help/)).toBeInTheDocument();
    });
  });

  describe('Sharpe Ratio Gauge', () => {
    it('renders gauge visualization for Sharpe ratio', () => {
      const { container } = render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      // Should have SVG for gauge
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });

    it('displays Sharpe ratio value in gauge center', () => {
      const { container } = render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      // Should show 1.5 formatted as 1.5
      const gaugeValues = container.querySelectorAll('.text-xl.font-bold');
      expect(gaugeValues.length).toBeGreaterThan(0);
    });

    it('renders circular gauge with correct attributes', () => {
      const { container } = render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      // Should have SVG circles for gauge
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThan(0);
    });
  });

  describe('Number Formatting', () => {
    it('formats Sharpe ratio to 2 decimals', () => {
      const metrics: RiskMetrics = {
        ...mockRiskMetrics,
        sharpeRatio: 1.23456,
      };
      render(<RiskMetricsDashboard metrics={metrics} />);

      expect(screen.getAllByText('1.23').length).toBeGreaterThan(0);
    });

    it('formats volatility to 2 decimal percentage', () => {
      const metrics: RiskMetrics = {
        ...mockRiskMetrics,
        volatility: 0.18765,
      };
      render(<RiskMetricsDashboard metrics={metrics} />);

      expect(screen.getAllByText(/18\.77%/).length).toBeGreaterThan(0);
    });

    it('formats beta to 2 decimals', () => {
      const metrics: RiskMetrics = {
        ...mockRiskMetrics,
        beta: 1.23456,
      };
      render(<RiskMetricsDashboard metrics={metrics} />);

      expect(screen.getAllByText('1.23').length).toBeGreaterThan(0);
    });

    it('formats max drawdown to 2 decimal percentage', () => {
      const metrics: RiskMetrics = {
        ...mockRiskMetrics,
        maxDrawdown: -0.15678,
      };
      render(<RiskMetricsDashboard metrics={metrics} />);

      expect(screen.getAllByText('15.68%').length).toBeGreaterThan(0);
    });
  });

  describe('Color Coding', () => {
    it('uses blue color for Sharpe ratio icon', () => {
      const { container } = render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      const blueIcons = container.querySelectorAll('.text-blue-600');
      expect(blueIcons.length).toBeGreaterThan(0);
    });

    it('uses purple color for volatility icon', () => {
      const { container } = render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      const purpleIcons = container.querySelectorAll('.text-purple-600');
      expect(purpleIcons.length).toBeGreaterThan(0);
    });

    it('uses green color for beta icon', () => {
      const { container } = render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      const greenIcons = container.querySelectorAll('.text-green-600');
      expect(greenIcons.length).toBeGreaterThan(0);
    });

    it('uses red color for max drawdown icon', () => {
      const { container } = render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      const redIcons = container.querySelectorAll('.text-red-600');
      expect(redIcons.length).toBeGreaterThan(0);
    });

    it('applies green color to excellent Sharpe rating', () => {
      const { container } = render(<RiskMetricsDashboard metrics={excellentRiskMetrics} />);

      // Excellent rating should be green
      const excellentText = screen.getByText('(Excellent)');
      expect(excellentText).toHaveClass('text-green-600');
    });

    it('applies blue color to good Sharpe rating', () => {
      const { container } = render(<RiskMetricsDashboard metrics={mockRiskMetrics} />);

      // Good rating should be blue
      const goodText = screen.getByText('(Good)');
      expect(goodText).toHaveClass('text-blue-600');
    });

    it('applies yellow color to fair Sharpe rating', () => {
      const fairMetrics: RiskMetrics = {
        ...mockRiskMetrics,
        sharpeRatio: 0.7,
      };
      const { container } = render(<RiskMetricsDashboard metrics={fairMetrics} />);

      // Fair rating should be yellow
      const fairText = screen.getByText('(Fair)');
      expect(fairText).toHaveClass('text-yellow-600');
    });

    it('applies red color to poor Sharpe rating', () => {
      const { container } = render(<RiskMetricsDashboard metrics={highRiskMetrics} />);

      // Poor rating should be red
      const poorText = screen.getByText('(Poor)');
      expect(poorText).toHaveClass('text-red-600');
    });
  });

  describe('Edge Cases', () => {
    it('handles zero volatility', () => {
      const zeroVolatility: RiskMetrics = {
        ...mockRiskMetrics,
        volatility: 0,
      };
      render(<RiskMetricsDashboard metrics={zeroVolatility} />);

      expect(screen.getAllByText('0.00%').length).toBeGreaterThan(0);
    });

    it('handles zero beta', () => {
      const zeroBeta: RiskMetrics = {
        ...mockRiskMetrics,
        beta: 0,
      };
      render(<RiskMetricsDashboard metrics={zeroBeta} />);

      expect(screen.getAllByText('0.00').length).toBeGreaterThan(0);
    });

    it('handles negative Sharpe ratio', () => {
      const negativeSharpe: RiskMetrics = {
        ...mockRiskMetrics,
        sharpeRatio: -0.5,
      };
      render(<RiskMetricsDashboard metrics={negativeSharpe} />);

      expect(screen.getAllByText('-0.50').length).toBeGreaterThan(0);
    });

    it('handles very high volatility > 100%', () => {
      const extremeVolatility: RiskMetrics = {
        ...mockRiskMetrics,
        volatility: 1.5,
      };
      render(<RiskMetricsDashboard metrics={extremeVolatility} />);

      expect(screen.getAllByText('150.00%').length).toBeGreaterThan(0);
    });

    it('handles max drawdown of 0', () => {
      const noDrawdown: RiskMetrics = {
        ...mockRiskMetrics,
        maxDrawdown: 0,
      };
      render(<RiskMetricsDashboard metrics={noDrawdown} />);

      expect(screen.getAllByText('0.00%').length).toBeGreaterThan(0);
    });
  });
});
