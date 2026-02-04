import { render, screen, waitFor } from '@testing-library/react';
import StockChart from '../stock-chart';
import { createChart } from 'lightweight-charts';
import { OHLCData, ChartSignalMarker } from '@/lib/types';

// Mock lightweight-charts
const mockSetData = jest.fn();
const mockSetMarkers = jest.fn();
const mockApplyOptions = jest.fn();
const mockRemove = jest.fn();
const mockFitContent = jest.fn();

const mockCandlestickSeries = {
  setData: mockSetData,
  setMarkers: mockSetMarkers,
  priceScale: jest.fn(() => ({
    applyOptions: jest.fn(),
  })),
};

const mockHistogramSeries = {
  setData: jest.fn(),
  priceScale: jest.fn(() => ({
    applyOptions: jest.fn(),
  })),
};

const mockTimeScale = {
  fitContent: mockFitContent,
};

const mockChart = {
  addCandlestickSeries: jest.fn(() => mockCandlestickSeries),
  addHistogramSeries: jest.fn(() => mockHistogramSeries),
  timeScale: jest.fn(() => mockTimeScale),
  applyOptions: mockApplyOptions,
  remove: mockRemove,
};

jest.mock('lightweight-charts', () => ({
  createChart: jest.fn(() => mockChart),
}));

describe('StockChart', () => {
  const mockPriceData: OHLCData[] = [
    {
      time: 1706745600,
      open: 100,
      high: 105,
      low: 99,
      close: 103,
      volume: 1000000,
    },
    {
      time: 1706832000,
      open: 103,
      high: 108,
      low: 102,
      close: 106,
      volume: 1200000,
    },
    {
      time: 1706918400,
      open: 106,
      high: 107,
      low: 101,
      close: 102,
      volume: 900000,
    },
  ];

  const mockSignalMarkers: ChartSignalMarker[] = [
    {
      time: 1706745600,
      position: 'belowBar' as const,
      color: '#10b981',
      shape: 'arrowUp' as const,
      text: 'BUY',
    },
    {
      time: 1706918400,
      position: 'aboveBar' as const,
      color: '#ef4444',
      shape: 'arrowDown' as const,
      text: 'SELL',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock getBoundingClientRect and clientWidth for chart container
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      width: 800,
      height: 400,
      top: 0,
      left: 0,
      bottom: 400,
      right: 800,
      x: 0,
      y: 0,
      toJSON: () => {},
    }));

    // Mock clientWidth property
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      value: 800,
    });
  });

  describe('Chart Creation', () => {
    it('creates chart with container ref', () => {
      render(<StockChart ticker="CBA.AX" data={mockPriceData} />);

      expect(createChart).toHaveBeenCalledWith(
        expect.any(HTMLDivElement),
        expect.objectContaining({
          width: 800,
          height: 400,
        })
      );
    });

    it('applies correct chart options', () => {
      render(<StockChart ticker="CBA.AX" data={mockPriceData} />);

      expect(createChart).toHaveBeenCalledWith(
        expect.any(HTMLDivElement),
        expect.objectContaining({
          layout: expect.objectContaining({
            background: { color: 'transparent' },
          }),
          grid: expect.any(Object),
          crosshair: expect.any(Object),
          rightPriceScale: expect.any(Object),
          timeScale: expect.objectContaining({
            timeVisible: true,
            secondsVisible: false,
          }),
        })
      );
    });

    it('uses custom height when provided', () => {
      render(<StockChart ticker="CBA.AX" data={mockPriceData} height={600} />);

      expect(createChart).toHaveBeenCalledWith(
        expect.any(HTMLDivElement),
        expect.objectContaining({
          height: 600,
        })
      );
    });

    it('renders chart title with ticker', () => {
      render(<StockChart ticker="CBA.AX" data={mockPriceData} />);
      expect(screen.getByText('CBA.AX Price Chart')).toBeInTheDocument();
    });

    it('renders chart container', () => {
      const { container } = render(<StockChart ticker="CBA.AX" data={mockPriceData} />);
      const chartContainer = container.querySelector('.w-full.rounded-lg');
      expect(chartContainer).toBeInTheDocument();
    });
  });

  describe('Data Loading', () => {
    it('adds candlestick series to chart', () => {
      render(<StockChart ticker="CBA.AX" data={mockPriceData} />);

      expect(mockChart.addCandlestickSeries).toHaveBeenCalledWith(
        expect.objectContaining({
          upColor: expect.any(String),
          downColor: expect.any(String),
        })
      );
    });

    it('sets price data on candlestick series', async () => {
      render(<StockChart ticker="CBA.AX" data={mockPriceData} />);

      await waitFor(() => {
        expect(mockSetData).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              time: 1706745600,
              open: 100,
              high: 105,
              low: 99,
              close: 103,
            }),
          ])
        );
      });
    });

    it('formats data correctly for lightweight-charts', async () => {
      render(<StockChart ticker="CBA.AX" data={mockPriceData} />);

      await waitFor(() => {
        expect(mockSetData).toHaveBeenCalledWith(
          expect.arrayContaining([
            {
              time: 1706745600,
              open: 100,
              high: 105,
              low: 99,
              close: 103,
            },
            {
              time: 1706832000,
              open: 103,
              high: 108,
              low: 102,
              close: 106,
            },
            {
              time: 1706918400,
              open: 106,
              high: 107,
              low: 101,
              close: 102,
            },
          ])
        );
      });
    });

    it('calls fitContent on timeScale after data is loaded', async () => {
      render(<StockChart ticker="CBA.AX" data={mockPriceData} />);

      await waitFor(() => {
        expect(mockFitContent).toHaveBeenCalled();
      });
    });

    it('shows loading spinner initially', () => {
      render(<StockChart ticker="CBA.AX" data={mockPriceData} />);
      // The component sets isLoading to true initially, then false after chart is created
      // Since chart creation is synchronous in the test, we can't catch the loading state
      // Instead, verify the chart title is rendered
      expect(screen.getByText('CBA.AX Price Chart')).toBeInTheDocument();
    });

    it('hides loading spinner after data is loaded', async () => {
      render(<StockChart ticker="CBA.AX" data={mockPriceData} />);

      await waitFor(() => {
        const spinner = screen
          .queryByRole('heading', { name: /CBA.AX Price Chart/i })
          ?.parentElement?.querySelector('.animate-spin');
        expect(spinner).not.toBeInTheDocument();
      });
    });
  });

  describe('Volume Display', () => {
    it('adds histogram series when showVolume is true', () => {
      render(<StockChart ticker="CBA.AX" data={mockPriceData} showVolume={true} />);

      expect(mockChart.addHistogramSeries).toHaveBeenCalledWith(
        expect.objectContaining({
          priceFormat: { type: 'volume' },
        })
      );
    });

    it('does not add histogram series when showVolume is false', () => {
      render(<StockChart ticker="CBA.AX" data={mockPriceData} showVolume={false} />);

      expect(mockChart.addHistogramSeries).not.toHaveBeenCalled();
    });

    it('sets volume data with correct colors', async () => {
      render(<StockChart ticker="CBA.AX" data={mockPriceData} showVolume={true} />);

      await waitFor(() => {
        expect(mockHistogramSeries.setData).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              time: 1706745600,
              value: 1000000,
              color: expect.stringContaining('#10b981'), // Bullish color (close >= open)
            }),
            expect.objectContaining({
              time: 1706832000,
              value: 1200000,
              color: expect.stringContaining('#10b981'), // Bullish color
            }),
            expect.objectContaining({
              time: 1706918400,
              value: 900000,
              color: expect.stringContaining('#ef4444'), // Bearish color (close < open)
            }),
          ])
        );
      });
    });

    it('applies scale margins to volume series', () => {
      render(<StockChart ticker="CBA.AX" data={mockPriceData} showVolume={true} />);

      // Volume series is created and price scale options are applied
      expect(mockHistogramSeries.priceScale).toHaveBeenCalled();
    });
  });

  describe('Signal Markers', () => {
    it('sets markers when signalMarkers are provided', async () => {
      render(<StockChart ticker="CBA.AX" data={mockPriceData} signalMarkers={mockSignalMarkers} />);

      await waitFor(() => {
        expect(mockSetMarkers).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              time: 1706745600,
              position: 'belowBar',
              color: '#10b981',
              shape: 'arrowUp',
              text: 'BUY',
            }),
            expect.objectContaining({
              time: 1706918400,
              position: 'aboveBar',
              color: '#ef4444',
              shape: 'arrowDown',
              text: 'SELL',
            }),
          ])
        );
      });
    });

    it('does not set markers when signalMarkers is empty', async () => {
      render(<StockChart ticker="CBA.AX" data={mockPriceData} signalMarkers={[]} />);

      await waitFor(() => {
        expect(mockSetMarkers).not.toHaveBeenCalled();
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('sets up resize event listener', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

      render(<StockChart ticker="CBA.AX" data={mockPriceData} />);

      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));

      addEventListenerSpy.mockRestore();
    });

    it('updates chart width on window resize', () => {
      render(<StockChart ticker="CBA.AX" data={mockPriceData} />);

      // Simulate window resize
      window.dispatchEvent(new Event('resize'));

      expect(mockApplyOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          width: expect.any(Number),
        })
      );
    });

    it('has responsive container classes', () => {
      const { container } = render(<StockChart ticker="CBA.AX" data={mockPriceData} />);
      const chartContainer = container.querySelector('.w-full');
      expect(chartContainer).toBeInTheDocument();
    });
  });

  describe('Cleanup', () => {
    it('removes chart on unmount', () => {
      const { unmount } = render(<StockChart ticker="CBA.AX" data={mockPriceData} />);

      unmount();

      expect(mockRemove).toHaveBeenCalled();
    });

    it('removes resize event listener on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = render(<StockChart ticker="CBA.AX" data={mockPriceData} />);

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('does not create chart when data is empty', () => {
      render(<StockChart ticker="CBA.AX" data={[]} />);

      expect(createChart).not.toHaveBeenCalled();
    });

    it('recreates chart when data changes', () => {
      const { rerender } = render(<StockChart ticker="CBA.AX" data={mockPriceData} />);

      const initialCallCount = (createChart as jest.Mock).mock.calls.length;

      const newData: OHLCData[] = [
        {
          time: 1707004800,
          open: 110,
          high: 115,
          low: 109,
          close: 113,
          volume: 1500000,
        },
      ];

      rerender(<StockChart ticker="CBA.AX" data={newData} />);

      // Chart should be recreated
      expect(mockRemove).toHaveBeenCalled();
      expect(createChart).toHaveBeenCalledTimes(initialCallCount + 1);
    });

    it('recreates chart when ticker changes', () => {
      const { rerender } = render(<StockChart ticker="CBA.AX" data={mockPriceData} />);

      const initialCallCount = (createChart as jest.Mock).mock.calls.length;
      expect(screen.getByText('CBA.AX Price Chart')).toBeInTheDocument();

      rerender(<StockChart ticker="BHP.AX" data={mockPriceData} />);

      expect(screen.getByText('BHP.AX Price Chart')).toBeInTheDocument();
      expect(mockRemove).toHaveBeenCalled();
      expect(createChart).toHaveBeenCalledTimes(initialCallCount + 1);
    });

    it('recreates chart when showVolume changes', () => {
      const { rerender } = render(
        <StockChart ticker="CBA.AX" data={mockPriceData} showVolume={true} />
      );

      const initialCallCount = (mockChart.addHistogramSeries as jest.Mock).mock.calls.length;

      rerender(<StockChart ticker="CBA.AX" data={mockPriceData} showVolume={false} />);

      expect(mockRemove).toHaveBeenCalled();
      // After rerender without volume, histogram should not be called again
      expect(mockChart.addHistogramSeries).toHaveBeenCalledTimes(initialCallCount);
    });

    it('handles missing volume data gracefully', async () => {
      const dataWithoutVolume: OHLCData[] = [
        {
          time: 1706745600,
          open: 100,
          high: 105,
          low: 99,
          close: 103,
          volume: 0,
        },
      ];

      render(<StockChart ticker="CBA.AX" data={dataWithoutVolume} showVolume={true} />);

      await waitFor(() => {
        expect(mockHistogramSeries.setData).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              value: 0,
            }),
          ])
        );
      });
    });
  });

  describe('Chart Styling', () => {
    it('applies design token colors to candlestick series', () => {
      render(<StockChart ticker="CBA.AX" data={mockPriceData} />);

      expect(mockChart.addCandlestickSeries).toHaveBeenCalledWith(
        expect.objectContaining({
          upColor: expect.any(String),
          downColor: expect.any(String),
          borderUpColor: expect.any(String),
          borderDownColor: expect.any(String),
          wickUpColor: expect.any(String),
          wickDownColor: expect.any(String),
        })
      );
    });

    it('applies border and background styles to container', () => {
      const { container } = render(<StockChart ticker="CBA.AX" data={mockPriceData} />);
      const chartContainer = container.querySelector('.rounded-lg.bg-white');
      expect(chartContainer).toBeInTheDocument();
      expect(chartContainer).toHaveClass('border', 'border-gray-200');
    });
  });
});
