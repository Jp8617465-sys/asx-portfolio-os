'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import { designTokens } from '@/lib/design-tokens';
import { OHLCData, ChartSignalMarker, SignalType } from '@/lib/types';

export type Timeframe = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

interface StockChartProps {
  ticker: string;
  data: OHLCData[];
  signalMarkers?: ChartSignalMarker[];
  height?: number;
  showVolume?: boolean;
  onTimeframeChange?: (timeframe: Timeframe) => void;
  initialTimeframe?: Timeframe;
}

export default function StockChart({
  ticker,
  data,
  signalMarkers = [],
  height = 400,
  showVolume = true,
  onTimeframeChange,
  initialTimeframe = '3M',
}: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>(initialTimeframe);

  const timeframes: Timeframe[] = ['1D', '1W', '1M', '3M', '6M', '1Y', 'ALL'];

  const handleTimeframeChange = (timeframe: Timeframe) => {
    setSelectedTimeframe(timeframe);
    if (onTimeframeChange) {
      onTimeframeChange(timeframe);
    }
  };

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    // Initialize chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height,
      layout: {
        background: { color: 'transparent' },
        textColor: designTokens.colors.neutral[600],
      },
      grid: {
        vertLines: { color: designTokens.colors.neutral[200] },
        horzLines: { color: designTokens.colors.neutral[200] },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: designTokens.colors.neutral[300],
      },
      timeScale: {
        borderColor: designTokens.colors.neutral[300],
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: designTokens.colors.chart.bullish,
      downColor: designTokens.colors.chart.bearish,
      borderUpColor: designTokens.colors.chart.bullish,
      borderDownColor: designTokens.colors.chart.bearish,
      wickUpColor: designTokens.colors.chart.bullish,
      wickDownColor: designTokens.colors.chart.bearish,
    });

    candlestickSeriesRef.current = candlestickSeries;

    // Format data for lightweight-charts
    const formattedData = data.map((d) => ({
      time: d.time as UTCTimestamp,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    candlestickSeries.setData(formattedData);

    // Add signal markers
    if (signalMarkers.length > 0) {
      const markers = signalMarkers.map((marker) => ({
        time: marker.time as UTCTimestamp,
        position: marker.position,
        color: marker.color,
        shape: marker.shape,
        text: marker.text,
      }));
      candlestickSeries.setMarkers(markers);
    }

    // Add volume series if enabled
    if (showVolume) {
      const volumeSeries = chart.addHistogramSeries({
        color: designTokens.colors.neutral[400],
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
      });

      volumeSeriesRef.current = volumeSeries;

      const volumeData = data.map((d) => ({
        time: d.time as UTCTimestamp,
        value: d.volume,
        color:
          d.close >= d.open
            ? `${designTokens.colors.chart.bullish}80`
            : `${designTokens.colors.chart.bearish}80`,
      }));

      volumeSeries.setData(volumeData);

      volumeSeries.priceScale().applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });
    }

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    chart.timeScale().fitContent();
    setIsLoading(false);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, signalMarkers, height, showVolume]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {ticker} Price Chart
        </h3>
        <div className="flex items-center gap-2">
          {isLoading && (
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
          )}
        </div>
      </div>

      {/* Timeframe Selector */}
      <div className="flex gap-1 mb-3 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
        {timeframes.map((timeframe) => (
          <button
            key={timeframe}
            onClick={() => handleTimeframeChange(timeframe)}
            className={`
              px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200
              ${
                selectedTimeframe === timeframe
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }
            `}
          >
            {timeframe}
          </button>
        ))}
      </div>

      <div
        ref={chartContainerRef}
        className="w-full rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
      />
    </div>
  );
}
