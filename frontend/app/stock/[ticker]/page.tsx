'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/header';
import Footer from '@/components/footer';
import ConfidenceGauge from '@/components/confidence-gauge';
import StockChart from '@/components/stock-chart';
import ReasoningPanel from '@/components/reasoning-panel';
import AccuracyDisplay from '@/components/accuracy-display';
import SignalBadge from '@/components/signal-badge';
import { api } from '@/lib/api-client';
import { Signal, SignalReasoning, AccuracyMetric, OHLCData, WatchlistItem } from '@/lib/types';
import {
  TrendingUp,
  TrendingDown,
  Bookmark,
  BookmarkCheck,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { designTokens } from '@/lib/design-tokens';

export default function StockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticker = params.ticker as string;

  const [signal, setSignal] = useState<Signal | null>(null);
  const [reasoning, setReasoning] = useState<SignalReasoning | null>(null);
  const [accuracy, setAccuracy] = useState<AccuracyMetric | null>(null);
  const [chartData, setChartData] = useState<OHLCData[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('3M');
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ticker) {
      loadStockData();
    }
  }, [ticker]);

  const loadStockData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load signal data
      const signalResponse = await api.getSignal(ticker);
      const signalData = signalResponse.data.data;
      setSignal(signalData);

      // Load reasoning
      try {
        const reasoningResponse = await api.getSignalReasoning(ticker);
        setReasoning(reasoningResponse.data.data);
      } catch (err) {
        console.warn('Reasoning not available:', err);
      }

      // Mock chart data (replace with real API call)
      const mockChartData: OHLCData[] = generateMockChartData();
      setChartData(mockChartData);

      // Mock accuracy data (replace with real API call)
      const mockAccuracy: AccuracyMetric = {
        ticker,
        totalPredictions: 48,
        correctPredictions: 34,
        accuracyRate: 70.8,
        bySignal: {
          STRONG_BUY: { total: 12, correct: 10, accuracy: 83.3 },
          BUY: { total: 15, correct: 11, accuracy: 73.3 },
          HOLD: { total: 8, correct: 6, accuracy: 75.0 },
          SELL: { total: 10, correct: 5, accuracy: 50.0 },
          STRONG_SELL: { total: 3, correct: 2, accuracy: 66.7 },
        },
      };
      setAccuracy(mockAccuracy);

      // Check if in watchlist
      checkWatchlistStatus();
    } catch (err) {
      console.error('Error loading stock data:', err);
      setError('Failed to load stock data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockChartData = (): OHLCData[] => {
    const data: OHLCData[] = [];
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    let price = 100;

    for (let i = 90; i >= 0; i--) {
      const change = (Math.random() - 0.5) * 2;
      const open = price;
      const close = price + change;
      const high = Math.max(open, close) + Math.random() * 1;
      const low = Math.min(open, close) - Math.random() * 1;
      const volume = Math.floor(1000000 + Math.random() * 5000000);

      data.push({
        time: Math.floor((now - i * dayMs) / 1000),
        open,
        high,
        low,
        close,
        volume,
      });

      price = close;
    }

    return data;
  };

  const handleTimeframeChange = async (timeframe: string) => {
    setSelectedTimeframe(timeframe);

    // TODO: Fetch historical data from API based on timeframe
    // For now, regenerate mock data (in production, this would call:
    // const response = await api.getHistoricalPrices(ticker, { timeframe });
    // setChartData(response.data.data);

    console.log(`Timeframe changed to: ${timeframe}`);
    // Regenerate mock data for the new timeframe
    const mockData = generateMockChartData();
    setChartData(mockData);
  };

  const checkWatchlistStatus = async () => {
    try {
      const response = await api.getWatchlist();
      const watchlist = response.data.data || [];
      setIsInWatchlist(watchlist.some((item: WatchlistItem) => item.ticker === ticker));
    } catch (err) {
      console.error('Error checking watchlist:', err);
    }
  };

  const toggleWatchlist = async () => {
    try {
      if (isInWatchlist) {
        await api.removeFromWatchlist(ticker);
        setIsInWatchlist(false);
      } else {
        await api.addToWatchlist(ticker);
        setIsInWatchlist(true);
      }
    } catch (err) {
      console.error('Error toggling watchlist:', err);
      alert('Failed to update watchlist');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Header />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="grid grid-cols-2 gap-6">
              <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !signal) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Header />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">
              {error || 'Stock not found'}
            </h2>
            <button
              onClick={() => router.back()}
              className="mt-4 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>

        {/* Stock header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {signal.ticker}
                </h1>
                <SignalBadge signal={signal.signal} confidence={signal.confidence} size="md" />
              </div>
              <p className="text-lg text-gray-600 dark:text-gray-400">{signal.companyName}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  ${signal.lastPrice.toFixed(2)}
                </div>
                <div
                  className={`flex items-center gap-1 text-sm font-semibold ${
                    signal.priceChange >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {signal.priceChange >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span>
                    {signal.priceChange >= 0 ? '+' : ''}
                    {signal.priceChange.toFixed(2)}% ($
                    {Math.abs(signal.priceChangeAmount).toFixed(2)})
                  </span>
                </div>
              </div>
              <button
                onClick={toggleWatchlist}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                  isInWatchlist
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {isInWatchlist ? (
                  <>
                    <BookmarkCheck className="h-4 w-4" />
                    In Watchlist
                  </>
                ) : (
                  <>
                    <Bookmark className="h-4 w-4" />
                    Add to Watchlist
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Left column - Gauge */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 flex items-center justify-center">
              <ConfidenceGauge
                confidence={signal.confidence}
                signal={signal.signal}
                size="lg"
                animate={true}
              />
            </div>
          </div>

          {/* Right column - Chart */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <StockChart
                ticker={signal.ticker}
                data={chartData}
                height={350}
                showVolume={true}
                onTimeframeChange={handleTimeframeChange}
                initialTimeframe={selectedTimeframe as any}
              />
            </div>
          </div>
        </div>

        {/* Reasoning and Accuracy */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {reasoning && (
            <div>
              <ReasoningPanel reasoning={reasoning} />
            </div>
          )}
          {accuracy && (
            <div>
              <AccuracyDisplay accuracy={accuracy} showBreakdown={true} />
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
