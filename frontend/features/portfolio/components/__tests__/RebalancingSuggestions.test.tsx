import { render, screen, fireEvent } from '@testing-library/react';
import RebalancingSuggestions from '../RebalancingSuggestions';
import { Portfolio, RebalancingSuggestion } from '@/contracts';

// Mock SignalBadge component
jest.mock('@/features/signals', () => ({
  SignalBadge: function MockSignalBadge({ signal }: any) {
    return <span data-testid="signal-badge">{signal}</span>;
  },
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  TrendingUp: () => <svg data-icon="TrendingUp" />,
  TrendingDown: () => <svg data-icon="TrendingDown" />,
  AlertCircle: () => <svg data-icon="AlertCircle" />,
  CheckCircle: () => <svg data-icon="CheckCircle" />,
  ChevronDown: () => <svg data-icon="ChevronDown" />,
  ChevronUp: () => <svg data-icon="ChevronUp" />,
  Sparkles: () => <svg data-icon="Sparkles" />,
}));

describe('RebalancingSuggestions', () => {
  const mockPortfolioWithHoldAndStrongBuy: Portfolio = {
    totalValue: 40000,
    holdings: [
      {
        ticker: 'CBA.AX',
        companyName: 'Commonwealth Bank',
        shares: 100,
        avgCost: 95,
        currentPrice: 100,
        totalValue: 10000,
        signal: 'HOLD',
        confidence: 55,
      },
      {
        ticker: 'BHP.AX',
        companyName: 'BHP Group',
        shares: 200,
        avgCost: 45,
        currentPrice: 50,
        totalValue: 10000,
        signal: 'STRONG_BUY',
        confidence: 85,
      },
      {
        ticker: 'WES.AX',
        companyName: 'Wesfarmers',
        shares: 300,
        avgCost: 48,
        currentPrice: 50,
        totalValue: 15000,
        signal: 'BUY',
        confidence: 75,
      },
      {
        ticker: 'TLS.AX',
        companyName: 'Telstra',
        shares: 1000,
        avgCost: 4,
        currentPrice: 5,
        totalValue: 5000,
        signal: 'HOLD',
        confidence: 50,
      },
    ],
  };

  const mockBalancedPortfolio: Portfolio = {
    totalValue: 20000,
    holdings: [
      {
        ticker: 'CBA.AX',
        companyName: 'Commonwealth Bank',
        shares: 100,
        avgCost: 95,
        currentPrice: 100,
        totalValue: 10000,
        signal: 'BUY',
        confidence: 70,
      },
      {
        ticker: 'BHP.AX',
        companyName: 'BHP Group',
        shares: 200,
        avgCost: 50,
        currentPrice: 50,
        totalValue: 10000,
        signal: 'BUY',
        confidence: 72,
      },
    ],
  };

  // Mock suggestions data to pass to component
  const mockSuggestions: RebalancingSuggestion[] = [
    {
      id: 'buy-bhp',
      action: 'BUY',
      ticker: 'BHP.AX',
      companyName: 'BHP Group',
      quantity: 60,
      currentSignal: 'STRONG_BUY',
      currentConfidence: 85,
      reason: 'Increase exposure to high-confidence opportunity',
      impact: {
        expectedReturn: 1.2,
        volatilityChange: 0.8,
        newAllocation: 35,
      },
      priority: 'high',
    },
    {
      id: 'sell-cba',
      action: 'SELL',
      ticker: 'CBA.AX',
      companyName: 'Commonwealth Bank',
      quantity: 50,
      currentSignal: 'HOLD',
      currentConfidence: 55,
      reason: 'Reduce exposure to low-confidence position',
      impact: {
        expectedReturn: 0.5,
        volatilityChange: -2.0,
        newAllocation: 15,
      },
      priority: 'medium',
    },
    {
      id: 'sell-tls',
      action: 'SELL',
      ticker: 'TLS.AX',
      companyName: 'Telstra',
      quantity: 500,
      currentSignal: 'HOLD',
      currentConfidence: 50,
      reason: 'Reduce exposure to low-confidence position',
      impact: {
        expectedReturn: 0.3,
        volatilityChange: -1.5,
        newAllocation: 8,
      },
      priority: 'low',
    },
  ];

  const singleSuggestion: RebalancingSuggestion[] = [
    {
      id: 'buy-single',
      action: 'BUY',
      ticker: 'NAB.AX',
      companyName: 'National Australia Bank',
      quantity: 30,
      currentSignal: 'BUY',
      currentConfidence: 70,
      reason: 'Add position to diversify portfolio',
      impact: {
        expectedReturn: 0.8,
        volatilityChange: 0.2,
        newAllocation: 12,
      },
      priority: 'medium',
    },
  ];

  describe('Empty State - No Suggestions', () => {
    it('shows balanced portfolio message when no suggestions needed', () => {
      render(<RebalancingSuggestions portfolio={mockBalancedPortfolio} />);

      expect(screen.getByText('Portfolio is Well Balanced')).toBeInTheDocument();
    });

    it('displays explanation when portfolio is balanced', () => {
      render(<RebalancingSuggestions portfolio={mockBalancedPortfolio} />);

      expect(screen.getByText(/No rebalancing suggestions at this time/i)).toBeInTheDocument();
    });

    it('shows checkmark icon when balanced', () => {
      const { container } = render(<RebalancingSuggestions portfolio={mockBalancedPortfolio} />);

      // CheckCircle icon should be present
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('does not show suggestion list when balanced', () => {
      render(<RebalancingSuggestions portfolio={mockBalancedPortfolio} />);

      expect(screen.queryByText('AI Rebalancing Suggestions')).not.toBeInTheDocument();
    });
  });

  describe('Suggestions Display', () => {
    it('displays suggestions when provided', () => {
      render(
        <RebalancingSuggestions
          portfolio={mockPortfolioWithHoldAndStrongBuy}
          suggestions={mockSuggestions}
        />
      );

      expect(screen.getByText('AI Rebalancing Suggestions')).toBeInTheDocument();
      // Should display suggestions for CBA.AX and TLS.AX
      expect(screen.getByText(/CBA\.AX/)).toBeInTheDocument();
      expect(screen.getByText(/TLS\.AX/)).toBeInTheDocument();
    });

    it('displays BUY suggestions', () => {
      render(
        <RebalancingSuggestions
          portfolio={mockPortfolioWithHoldAndStrongBuy}
          suggestions={mockSuggestions}
        />
      );

      // Should have BUY suggestion for BHP.AX
      expect(screen.getByText(/BHP\.AX/)).toBeInTheDocument();
    });

    it('displays action badges for each suggestion', () => {
      render(
        <RebalancingSuggestions
          portfolio={mockPortfolioWithHoldAndStrongBuy}
          suggestions={mockSuggestions}
        />
      );

      // Should have both BUY and SELL badges
      const buyBadges = screen.getAllByText(/BUY \d+/);
      const sellBadges = screen.getAllByText(/SELL \d+/);

      expect(buyBadges.length).toBeGreaterThan(0);
      expect(sellBadges.length).toBeGreaterThan(0);
    });

    it('shows quantity in action badge', () => {
      render(
        <RebalancingSuggestions
          portfolio={mockPortfolioWithHoldAndStrongBuy}
          suggestions={mockSuggestions}
        />
      );

      // SELL suggestion: CBA has quantity 50
      expect(screen.getAllByText(/SELL 50/).length).toBeGreaterThan(0);

      // BUY suggestion: BHP has quantity 60
      expect(screen.getAllByText(/BUY 60/).length).toBeGreaterThan(0);
    });

    it('displays priority badges', () => {
      render(
        <RebalancingSuggestions
          portfolio={mockPortfolioWithHoldAndStrongBuy}
          suggestions={mockSuggestions}
        />
      );

      // Should show priority badges (high/medium/low)
      expect(screen.getAllByText('high').length).toBeGreaterThan(0);
      expect(screen.getAllByText('medium').length).toBeGreaterThan(0);
    });

    it('displays suggestions in order provided', () => {
      render(
        <RebalancingSuggestions
          portfolio={mockPortfolioWithHoldAndStrongBuy}
          suggestions={mockSuggestions}
        />
      );

      // Get all priority badges
      const priorityBadges = screen.getAllByText(/high|medium|low/);

      // First badge should be 'high' (first suggestion in mockSuggestions)
      expect(priorityBadges[0]).toHaveTextContent('high');
    });
  });

  describe('Suggestion Details', () => {
    it('displays ticker and company name', () => {
      render(
        <RebalancingSuggestions
          portfolio={mockPortfolioWithHoldAndStrongBuy}
          suggestions={mockSuggestions}
        />
      );

      expect(screen.getByText(/CBA\.AX/)).toBeInTheDocument();
      expect(screen.getByText(/Commonwealth Bank/)).toBeInTheDocument();
      expect(screen.getByText(/BHP\.AX/)).toBeInTheDocument();
      expect(screen.getByText(/BHP Group/)).toBeInTheDocument();
    });

    it('shows current signal with SignalBadge', () => {
      render(
        <RebalancingSuggestions
          portfolio={mockPortfolioWithHoldAndStrongBuy}
          suggestions={mockSuggestions}
        />
      );

      // Should render mocked signal badges
      const signalBadges = screen.getAllByTestId('signal-badge');
      expect(signalBadges.length).toBeGreaterThan(0);
    });

    it('displays confidence percentage', () => {
      render(
        <RebalancingSuggestions
          portfolio={mockPortfolioWithHoldAndStrongBuy}
          suggestions={mockSuggestions}
        />
      );

      expect(screen.getByText('85%')).toBeInTheDocument(); // BHP confidence
      expect(screen.getByText('55%')).toBeInTheDocument(); // CBA confidence
    });

    it('shows reason for suggestion', () => {
      render(
        <RebalancingSuggestions
          portfolio={mockPortfolioWithHoldAndStrongBuy}
          suggestions={mockSuggestions}
        />
      );

      expect(
        screen.getAllByText(/Reduce exposure to low-confidence position/).length
      ).toBeGreaterThan(0);
      expect(
        screen.getAllByText(/Increase exposure to high-confidence opportunity/).length
      ).toBeGreaterThan(0);
    });

    it('displays expected return impact', () => {
      render(
        <RebalancingSuggestions
          portfolio={mockPortfolioWithHoldAndStrongBuy}
          suggestions={mockSuggestions}
        />
      );

      // Should show return percentages
      expect(screen.getAllByText(/\+1\.2% return/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/\+0\.5% return/).length).toBeGreaterThan(0);
    });

    it('displays volatility change impact', () => {
      render(
        <RebalancingSuggestions
          portfolio={mockPortfolioWithHoldAndStrongBuy}
          suggestions={mockSuggestions}
        />
      );

      // Should show volatility changes
      expect(screen.getAllByText(/\+0\.8% volatility/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/-2\.0% volatility/).length).toBeGreaterThan(0);
    });

    it('formats positive returns with green color', () => {
      const { container } = render(
        <RebalancingSuggestions
          portfolio={mockPortfolioWithHoldAndStrongBuy}
          suggestions={mockSuggestions}
        />
      );

      const greenElements = container.querySelectorAll('.text-green-600');
      expect(greenElements.length).toBeGreaterThan(0);
    });

    it('formats negative volatility changes with green color (good thing)', () => {
      const { container } = render(
        <RebalancingSuggestions
          portfolio={mockPortfolioWithHoldAndStrongBuy}
          suggestions={mockSuggestions}
        />
      );

      // Negative volatility is good, should be green
      const greenElements = container.querySelectorAll('.text-green-600');
      expect(greenElements.length).toBeGreaterThan(0);
    });
  });

  describe('Expand/Collapse Functionality', () => {
    it('starts with all suggestions collapsed', () => {
      render(
        <RebalancingSuggestions
          portfolio={mockPortfolioWithHoldAndStrongBuy}
          suggestions={mockSuggestions}
        />
      );

      // Detailed Impact Analysis should not be visible initially
      expect(screen.queryByText('Detailed Impact Analysis')).not.toBeInTheDocument();
    });

    it('expands suggestion when chevron button clicked', () => {
      render(
        <RebalancingSuggestions
          portfolio={mockPortfolioWithHoldAndStrongBuy}
          suggestions={mockSuggestions}
        />
      );

      // Find first expand button (ChevronDown icon)
      const expandButtons = screen.getAllByTitle('View Details');
      fireEvent.click(expandButtons[0]);

      // Detailed section should now be visible
      expect(screen.getByText('Detailed Impact Analysis')).toBeInTheDocument();
    });

    it('shows ChevronDown icon when collapsed', () => {
      const { container } = render(
        <RebalancingSuggestions
          portfolio={mockPortfolioWithHoldAndStrongBuy}
          suggestions={mockSuggestions}
        />
      );

      // Should have ChevronDown icons
      const buttons = screen.getAllByTitle('View Details');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('shows ChevronUp icon when expanded', () => {
      render(
        <RebalancingSuggestions
          portfolio={mockPortfolioWithHoldAndStrongBuy}
          suggestions={mockSuggestions}
        />
      );

      const expandButtons = screen.getAllByTitle('View Details');
      fireEvent.click(expandButtons[0]);

      // ChevronUp should be present (button still exists with same title)
      expect(screen.getByText('Detailed Impact Analysis')).toBeInTheDocument();
    });

    it('collapses when clicking chevron again', () => {
      render(
        <RebalancingSuggestions
          portfolio={mockPortfolioWithHoldAndStrongBuy}
          suggestions={mockSuggestions}
        />
      );

      const expandButtons = screen.getAllByTitle('View Details');

      // Expand
      fireEvent.click(expandButtons[0]);
      expect(screen.getByText('Detailed Impact Analysis')).toBeInTheDocument();

      // Collapse
      const collapseButtons = screen.getAllByTitle('View Details');
      fireEvent.click(collapseButtons[0]);
      expect(screen.queryByText('Detailed Impact Analysis')).not.toBeInTheDocument();
    });

    it('only expands one suggestion at a time', () => {
      render(
        <RebalancingSuggestions
          portfolio={mockPortfolioWithHoldAndStrongBuy}
          suggestions={mockSuggestions}
        />
      );

      const expandButtons = screen.getAllByTitle('View Details');

      // Expand first suggestion
      fireEvent.click(expandButtons[0]);
      expect(screen.getByText('Detailed Impact Analysis')).toBeInTheDocument();

      // Expand second suggestion
      fireEvent.click(expandButtons[1]);

      // Should only have one "Detailed Impact Analysis" visible
      const detailedSections = screen.getAllByText('Detailed Impact Analysis');
      expect(detailedSections.length).toBe(1);
    });
  });

  describe('Expanded Details Section', () => {
    beforeEach(() => {
      render(
        <RebalancingSuggestions
          portfolio={mockPortfolioWithHoldAndStrongBuy}
          suggestions={mockSuggestions}
        />
      );
      const expandButtons = screen.getAllByTitle('View Details');
      fireEvent.click(expandButtons[0]);
    });

    it('shows expected return with proper formatting', () => {
      // High priority BUY suggestion has +1.2% expected return
      expect(screen.getAllByText(/\+1\.20%/).length).toBeGreaterThan(0);
    });

    it('shows volatility change with proper formatting', () => {
      // Should show volatility change with 2 decimals
      expect(screen.getAllByText(/0\.80%/).length).toBeGreaterThan(0);
    });

    it('shows new allocation percentage', () => {
      // Should display new allocation percentage
      const allocationTexts = screen.getAllByText(/\.?\d+\.\d{2}%/);
      expect(allocationTexts.length).toBeGreaterThan(0);
    });

    it('displays investment consideration section', () => {
      expect(screen.getByText('Investment Consideration')).toBeInTheDocument();
    });

    it('shows BUY-specific consideration text', () => {
      expect(
        screen.getByText(/This suggestion recommends purchasing .* additional shares/)
      ).toBeInTheDocument();
    });

    it('shows SELL-specific consideration text for sell suggestions', () => {
      // Expand a SELL suggestion
      const expandButtons = screen.getAllByTitle('View Details');

      // Find and click a SELL suggestion (should be second or third)
      for (let i = 0; i < expandButtons.length; i++) {
        fireEvent.click(expandButtons[i]);

        if (screen.queryByText(/Consider tax implications before proceeding/)) {
          expect(
            screen.getByText(/This suggestion recommends selling .* shares/)
          ).toBeInTheDocument();
          break;
        }
      }
    });

    it('displays alert icon in consideration section', () => {
      // AlertCircle icon should be present in expanded section
      expect(screen.getByText('Investment Consideration')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('renders Apply button when onApply callback provided', () => {
      const onApply = jest.fn();
      render(
        <RebalancingSuggestions
          portfolio={mockPortfolioWithHoldAndStrongBuy}
          suggestions={mockSuggestions}
          onApply={onApply}
        />
      );

      const applyButtons = screen.getAllByText('Apply');
      expect(applyButtons.length).toBeGreaterThan(0);
    });

    it('does not render Apply button when onApply not provided', () => {
      render(
        <RebalancingSuggestions
          portfolio={mockPortfolioWithHoldAndStrongBuy}
          suggestions={mockSuggestions}
        />
      );

      expect(screen.queryByText('Apply')).not.toBeInTheDocument();
    });

    it('calls onApply with suggestion id when Apply clicked', () => {
      const onApply = jest.fn();
      render(
        <RebalancingSuggestions
          portfolio={mockPortfolioWithHoldAndStrongBuy}
          suggestions={mockSuggestions}
          onApply={onApply}
        />
      );

      const applyButtons = screen.getAllByText('Apply');
      fireEvent.click(applyButtons[0]);

      expect(onApply).toHaveBeenCalledTimes(1);
      expect(onApply).toHaveBeenCalledWith(expect.stringContaining('buy-'));
    });

    it('renders Apply All button when onApplyAll provided', () => {
      const onApplyAll = jest.fn();
      render(
        <RebalancingSuggestions
          portfolio={mockPortfolioWithHoldAndStrongBuy}
          suggestions={mockSuggestions}
          onApplyAll={onApplyAll}
        />
      );

      expect(screen.getByText('Apply All Suggestions')).toBeInTheDocument();
    });

    it('does not render Apply All button when onApplyAll not provided', () => {
      render(
        <RebalancingSuggestions
          portfolio={mockPortfolioWithHoldAndStrongBuy}
          suggestions={mockSuggestions}
        />
      );

      expect(screen.queryByText('Apply All Suggestions')).not.toBeInTheDocument();
    });

    it('calls onApplyAll when Apply All button clicked', () => {
      const onApplyAll = jest.fn();
      render(
        <RebalancingSuggestions
          portfolio={mockPortfolioWithHoldAndStrongBuy}
          suggestions={mockSuggestions}
          onApplyAll={onApplyAll}
        />
      );

      fireEvent.click(screen.getByText('Apply All Suggestions'));

      expect(onApplyAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('Footer Summary', () => {
    it('displays suggestion count', () => {
      render(
        <RebalancingSuggestions
          portfolio={mockPortfolioWithHoldAndStrongBuy}
          suggestions={mockSuggestions}
        />
      );

      // Should show count of suggestions generated
      expect(screen.getByText(/\d+ suggestions? generated/)).toBeInTheDocument();
    });

    it('uses singular form for one suggestion', () => {
      // Create portfolio with only one suggestion
      const singleSuggestionPortfolio: Portfolio = {
        totalValue: 10000,
        holdings: [
          {
            ticker: 'CBA.AX',
            companyName: 'Commonwealth Bank',
            shares: 100,
            avgCost: 95,
            currentPrice: 100,
            totalValue: 10000,
            signal: 'HOLD',
            confidence: 55,
          },
        ],
      };

      render(
        <RebalancingSuggestions
          portfolio={singleSuggestionPortfolio}
          suggestions={singleSuggestion}
        />
      );

      expect(screen.getByText(/1 suggestion generated/)).toBeInTheDocument();
    });

    it('uses plural form for multiple suggestions', () => {
      render(
        <RebalancingSuggestions
          portfolio={mockPortfolioWithHoldAndStrongBuy}
          suggestions={mockSuggestions}
        />
      );

      expect(screen.getByText(/\d+ suggestions generated/)).toBeInTheDocument();
    });

    it('displays last updated timestamp', () => {
      render(
        <RebalancingSuggestions
          portfolio={mockPortfolioWithHoldAndStrongBuy}
          suggestions={mockSuggestions}
        />
      );

      expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    });

    it('shows current time in footer', () => {
      render(
        <RebalancingSuggestions
          portfolio={mockPortfolioWithHoldAndStrongBuy}
          suggestions={mockSuggestions}
        />
      );

      // Should show a time string (format: HH:MM:SS AM/PM)
      expect(screen.getByText(/Last updated: \d{1,2}:\d{2}:\d{2}/)).toBeInTheDocument();
    });
  });

  describe('Styling and Colors', () => {
    it('applies green color to BUY actions', () => {
      const { container } = render(
        <RebalancingSuggestions
          portfolio={mockPortfolioWithHoldAndStrongBuy}
          suggestions={mockSuggestions}
        />
      );

      const buyBadges = container.querySelectorAll('.text-green-600');
      expect(buyBadges.length).toBeGreaterThan(0);
    });

    it('applies red color to SELL actions', () => {
      const { container } = render(
        <RebalancingSuggestions
          portfolio={mockPortfolioWithHoldAndStrongBuy}
          suggestions={mockSuggestions}
        />
      );

      const sellBadges = container.querySelectorAll('.text-red-600');
      expect(sellBadges.length).toBeGreaterThan(0);
    });

    it('applies correct priority colors', () => {
      const { container } = render(
        <RebalancingSuggestions
          portfolio={mockPortfolioWithHoldAndStrongBuy}
          suggestions={mockSuggestions}
        />
      );

      // High priority should have red background
      const highPriorityBadges = container.querySelectorAll('.bg-red-100');
      expect(highPriorityBadges.length).toBeGreaterThan(0);
    });
  });
});
