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
import FundamentalsTab from '@/components/FundamentalsTab';
import ModelComparisonPanel from '@/components/ModelComparisonPanel';
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
  const [activeTab, setActiveTab] = useState<'overview' | 'fundamentals'>('overview');

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
      const signalData = signalResponse.data;
      setSignal(signalData);

      // Load reasoning
      try {
        const reasoningResponse = await api.getSignalReasoning(ticker);
        setReasoning(reasoningResponse.data);
      } catch (err) {
        console.warn('Reasoning not available:', err);
      }

      // Load historical price data
      await loadChartData(selectedTimeframe);

      // Load accuracy data
      try {
        const accuracyResponse = await api.getAccuracy(ticker);
        const accuracyData = accuracyResponse.data;

        // Transform backend response to component format
        const totalSignals = accuracyData.signals_analyzed || 0;
        const overallAccuracy = (accuracyData.overall_accuracy || 0) * 100;
        const bySignal: any = {};

        if (accuracyData.by_signal) {
          Object.entries(accuracyData.by_signal).forEach(([signal, stats]: [string, any]) => {
            bySignal[signal] = {
              total: stats.count,
              correct: stats.correct,
              accuracy: stats.accuracy * 100,
            };
          });
        }

        setAccuracy({
          ticker,
          totalPredictions: totalSignals,
          correctPredictions: Math.round(totalSignals * (accuracyData.overall_accuracy || 0)),
          accuracyRate: overallAccuracy,
          bySignal,
        });
      } catch (err) {
        console.warn('Accuracy data not available:', err);
      }

      // Check if in watchlist
      checkWatchlistStatus();
    } catch (err) {
      console.error('Error loading stock data:', err);
      setError('Failed to load stock data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadChartData = async (timeframe: string) => {
    try {
      // Map timeframe to period parameter
      const periodMap: Record<string, string> = {
        '1D': '1D',
        '1W': '1W',
        '1M': '1M',
        '3M': '3M',
        '6M': '6M',
        '1Y': '1Y',
        ALL: '5Y',
      };

      const period = periodMap[timeframe] || '3M';

      // Fetch real price history from API
      const response = await api.getPriceHistory(ticker, { period });

      const priceHistory = response.data.data || [];

      // Transform to chart format
      const formattedData: OHLCData[] = priceHistory.map((point: any) => ({
        time: Math.floor(new Date(point.date).getTime() / 1000),
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
        volume: point.volume,
      }));

      setChartData(formattedData);
    } catch (err) {
      console.error('Failed to load chart data:', err);
      // Fall back to empty chart if data unavailable
      setChartData([]);
    }
  };

  const handleTimeframeChange = async (timeframe: string) => {
    setSelectedTimeframe(timeframe);
    await loadChartData(timeframe);
  };

  const checkWatchlistStatus = async () => {
    try {
      const response = await api.getWatchlist();
      const watchlist = response.data || [];
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

        {/* Model Comparison Panel - V2 Feature */}
        <ModelComparisonPanel ticker={ticker} />

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

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('overview')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('fundamentals')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'fundamentals'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Fundamentals
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
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
        )}

        {activeTab === 'fundamentals' && (
          <div>
            <FundamentalsTab ticker={ticker} />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
