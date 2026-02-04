import { render, screen } from '@testing-library/react';
import ReasoningPanel from '../reasoning-panel';
import { SignalReasoning } from '@/lib/types';

const sampleReasoning: SignalReasoning = {
  ticker: 'CBA.AX',
  signal: 'BUY',
  confidence: 78,
  topFactors: [
    { feature: 'RSI Momentum', impact: 42, description: 'Strong upward momentum', value: 68.5 },
    { feature: 'Volume Trend', impact: -12, description: 'Below average volume', value: 1200000 },
    {
      feature: 'MA Crossover',
      impact: 25,
      description: '50-day MA crossed above 200-day',
      value: 'bullish',
    },
  ],
  modelBreakdown: { technicalScore: 72, fundamentalsScore: 65, sentimentScore: 58 },
};

describe('ReasoningPanel', () => {
  it('renders loading skeleton when isLoading', () => {
    const { container } = render(<ReasoningPanel reasoning={sampleReasoning} isLoading={true} />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders Signal Reasoning header when loaded', () => {
    render(<ReasoningPanel reasoning={sampleReasoning} />);
    expect(screen.getByText('Signal Reasoning')).toBeInTheDocument();
  });

  it('renders model breakdown scores', () => {
    render(<ReasoningPanel reasoning={sampleReasoning} />);
    expect(screen.getByText('72%')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(screen.getByText('58%')).toBeInTheDocument();
  });

  it('renders model breakdown labels', () => {
    render(<ReasoningPanel reasoning={sampleReasoning} />);
    expect(screen.getByText('Technical')).toBeInTheDocument();
    expect(screen.getByText('Fundamentals')).toBeInTheDocument();
    expect(screen.getByText('Sentiment')).toBeInTheDocument();
  });

  it('renders factor feature names', () => {
    render(<ReasoningPanel reasoning={sampleReasoning} />);
    expect(screen.getByText('RSI Momentum')).toBeInTheDocument();
    expect(screen.getByText('Volume Trend')).toBeInTheDocument();
    expect(screen.getByText('MA Crossover')).toBeInTheDocument();
  });

  it('renders factor descriptions', () => {
    render(<ReasoningPanel reasoning={sampleReasoning} />);
    expect(screen.getByText('Strong upward momentum')).toBeInTheDocument();
    expect(screen.getByText('Below average volume')).toBeInTheDocument();
  });

  it('renders positive impact with + prefix', () => {
    render(<ReasoningPanel reasoning={sampleReasoning} />);
    expect(screen.getByText('+42')).toBeInTheDocument();
    expect(screen.getByText('+25')).toBeInTheDocument();
  });

  it('renders negative impact without + prefix', () => {
    render(<ReasoningPanel reasoning={sampleReasoning} />);
    expect(screen.getByText('-12')).toBeInTheDocument();
  });

  it('renders numeric factor values formatted to 2 decimals', () => {
    render(<ReasoningPanel reasoning={sampleReasoning} />);
    expect(screen.getByText('68.50')).toBeInTheDocument();
    expect(screen.getByText('1200000.00')).toBeInTheDocument();
  });

  it('renders string factor values as-is', () => {
    render(<ReasoningPanel reasoning={sampleReasoning} />);
    expect(screen.getByText('bullish')).toBeInTheDocument();
  });

  it('renders the SHAP disclaimer', () => {
    render(<ReasoningPanel reasoning={sampleReasoning} />);
    expect(screen.getByText(/SHAP.*SHapley Additive exPlanations/i)).toBeInTheDocument();
  });

  it('positive impact factors have green colour class', () => {
    const { container } = render(<ReasoningPanel reasoning={sampleReasoning} />);
    const greenElements = container.querySelectorAll('.text-green-600');
    // RSI Momentum (+42) and MA Crossover (+25) are positive
    expect(greenElements.length).toBeGreaterThanOrEqual(2);
  });

  it('negative impact factors have red colour class', () => {
    const { container } = render(<ReasoningPanel reasoning={sampleReasoning} />);
    const redElements = container.querySelectorAll('.text-red-600');
    // Volume Trend (-12) is negative
    expect(redElements.length).toBeGreaterThanOrEqual(1);
  });
});
