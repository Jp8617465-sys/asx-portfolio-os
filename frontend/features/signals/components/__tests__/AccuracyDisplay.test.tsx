import { render, screen } from '@testing-library/react';
import AccuracyDisplay from '../AccuracyDisplay';
import { AccuracyMetric } from '@/contracts';

const sampleAccuracy: AccuracyMetric = {
  ticker: 'CBA.AX',
  totalPredictions: 100,
  correctPredictions: 72,
  accuracyRate: 72.0,
  bySignal: {
    STRONG_BUY: { total: 20, correct: 18, accuracy: 90.0 },
    BUY: { total: 25, correct: 20, accuracy: 80.0 },
    HOLD: { total: 30, correct: 24, accuracy: 80.0 },
    SELL: { total: 15, correct: 7, accuracy: 46.7 },
    STRONG_SELL: { total: 10, correct: 3, accuracy: 30.0 },
  },
};

describe('AccuracyDisplay', () => {
  it('renders the header', () => {
    render(<AccuracyDisplay accuracy={sampleAccuracy} />);
    expect(screen.getByText('Historical Accuracy')).toBeInTheDocument();
  });

  it('renders the ticker', () => {
    render(<AccuracyDisplay accuracy={sampleAccuracy} />);
    expect(screen.getByText('CBA.AX')).toBeInTheDocument();
  });

  it('renders overall accuracy percentage', () => {
    render(<AccuracyDisplay accuracy={sampleAccuracy} />);
    expect(screen.getByText('72.0%')).toBeInTheDocument();
  });

  it('renders correct and incorrect counts', () => {
    render(<AccuracyDisplay accuracy={sampleAccuracy} />);
    expect(screen.getByText('72 correct')).toBeInTheDocument();
    expect(screen.getByText('28 incorrect')).toBeInTheDocument();
  });

  it('renders per-signal breakdown when showBreakdown is true (default)', () => {
    render(<AccuracyDisplay accuracy={sampleAccuracy} />);
    expect(screen.getByText('Accuracy by Signal Type')).toBeInTheDocument();
    // Signal labels use signal.replace('_', ' ') — raw uppercase
    expect(screen.getByText('STRONG BUY')).toBeInTheDocument();
    expect(screen.getByText('BUY')).toBeInTheDocument();
    expect(screen.getByText('HOLD')).toBeInTheDocument();
    expect(screen.getByText('SELL')).toBeInTheDocument();
    expect(screen.getByText('STRONG SELL')).toBeInTheDocument();
  });

  it('renders per-signal accuracy percentages', () => {
    render(<AccuracyDisplay accuracy={sampleAccuracy} />);
    expect(screen.getByText('90.0%')).toBeInTheDocument();
    expect(screen.getByText('46.7%')).toBeInTheDocument();
    expect(screen.getByText('30.0%')).toBeInTheDocument();
  });

  it('renders per-signal prediction counts', () => {
    render(<AccuracyDisplay accuracy={sampleAccuracy} />);
    expect(screen.getByText('18 / 20 predictions')).toBeInTheDocument();
    expect(screen.getByText('3 / 10 predictions')).toBeInTheDocument();
  });

  it('hides breakdown when showBreakdown is false', () => {
    render(<AccuracyDisplay accuracy={sampleAccuracy} showBreakdown={false} />);
    expect(screen.queryByText('Accuracy by Signal Type')).not.toBeInTheDocument();
  });

  it('renders the disclaimer note', () => {
    render(<AccuracyDisplay accuracy={sampleAccuracy} />);
    expect(screen.getByText(/Past performance does not guarantee/i)).toBeInTheDocument();
  });
});
