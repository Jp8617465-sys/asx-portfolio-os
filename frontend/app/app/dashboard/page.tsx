'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';
import Footer from '@/components/footer';
import WatchlistTable from '@/components/watchlist-table';
import SignalBadge from '@/components/signal-badge';
import { api } from '@/lib/api-client';
import { WatchlistItem, Signal } from '@/lib/types';
import { TrendingUp, TrendingDown, Activity, AlertCircle } from 'lucide-react';
import { designTokens } from '@/lib/design-tokens';
import { useAutoRefresh } from '@/lib/hooks/useAutoRefresh';

interface DashboardStats {
  totalStocks: number;
  strongSignals: number;
  avgConfidence: number;
  todayChanges: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [topSignals, setTopSignals] = useState<Signal[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalStocks: 0,
    strongSignals: 0,
    avgConfidence: 0,
    todayChanges: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load watchlist from real API
      const watchlistResponse = await api.getWatchlist();
      const watchlistData = watchlistResponse.data.items || [];

      // Transform backend response to component format
      const transformedWatchlist: WatchlistItem[] = watchlistData.map((item: any) => ({
        ticker: item.ticker,
        companyName: item.name || item.ticker, // Map to companyName
        signal: item.current_signal || 'HOLD',
        confidence: (item.signal_confidence || 0.5) * 100, // Convert 0-1 to 0-100
        lastPrice: item.current_price || 0,
        priceChange: item.price_change_pct || 0,
        priceChangeAmount: 0, // Calculate if needed
        lastUpdated: item.added_at || new Date().toISOString(),
        addedAt: item.added_at || new Date().toISOString(),
      }));

      setWatchlist(transformedWatchlist);

      // Calculate stats from TRANSFORMED data
      const strongSignals = transformedWatchlist.filter(
        (item: WatchlistItem) => item.signal === 'STRONG_BUY' || item.signal === 'STRONG_SELL'
      ).length;

      const avgConf =
        transformedWatchlist.length > 0
          ? transformedWatchlist.reduce(
              (sum: number, item: WatchlistItem) => sum + item.confidence,
              0
            ) / transformedWatchlist.length
          : 0;

      const todayChanges = transformedWatchlist.filter(
        (item: WatchlistItem) => Math.abs(item.priceChange) > 2
      ).length;

      setStats({
        totalStocks: transformedWatchlist.length,
        strongSignals,
        avgConfidence: Math.round(avgConf),
        todayChanges,
      });

      // Load top signals from real API
      try {
        const topSignalsResponse = await api.getTopSignals({ limit: 5 });
        const topSignalsData = topSignalsResponse.data;

        if (topSignalsData?.signals && Array.isArray(topSignalsData.signals)) {
          // Transform backend response to frontend format
          const transformedTopSignals: Signal[] = topSignalsData.signals.map((signal: any) => {
            // Convert ml_prob (0-1) to confidence (0-100)
            const confidence = Math.round((signal.ml_prob || 0) * 100);

            // Determine signal type based on confidence
            let signalType = 'HOLD';
            if (confidence >= 80) signalType = 'STRONG_BUY';
            else if (confidence >= 60) signalType = 'BUY';
            else if (confidence <= 20) signalType = 'STRONG_SELL';
            else if (confidence <= 40) signalType = 'SELL';

            return {
              ticker: signal.symbol,
              companyName: signal.symbol.replace('.AU', '').replace('.AX', ''), // Use ticker as name for now
              signal: signalType,
              confidence,
              lastPrice: 0, // Price data will come from separate endpoint if needed
              priceChange: 0,
              priceChangeAmount: 0,
              lastUpdated: topSignalsData.as_of || new Date().toISOString(),
            };
          });

          setTopSignals(transformedTopSignals);
        }
      } catch (topSignalsError) {
        console.error('Failed to load top signals, using empty array:', topSignalsError);
        setTopSignals([]);
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Auto-refresh every 60 seconds
  useAutoRefresh({
    onRefresh: loadDashboardData,
    intervalMs: 60000, // 60 seconds
    enabled: !isLoading, // Don't refresh while loading
  });

  const handleRemoveFromWatchlist = async (ticker: string) => {
    try {
      await api.removeFromWatchlist(ticker);
      setWatchlist((prev) => prev.filter((item) => item.ticker !== ticker));
      setStats((prev) => ({
        ...prev,
        totalStocks: prev.totalStocks - 1,
      }));
    } catch (err) {
      console.error('Error removing from watchlist:', err);
      alert('Failed to remove stock from watchlist');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor your watchlist and discover top AI-powered signals
          </p>
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Watchlist Stocks
              </span>
              <Activity className="h-5 w-5 text-gray-400" />
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {isLoading ? '...' : stats.totalStocks}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Strong Signals
              </span>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {isLoading ? '...' : stats.strongSignals}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Avg Confidence
              </span>
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {isLoading ? '...' : `${stats.avgConfidence}%`}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Big Movers Today
              </span>
              <TrendingDown className="h-5 w-5 text-orange-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {isLoading ? '...' : stats.todayChanges}
            </div>
          </div>
        </div>

        {/* Top signals */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Top Signals Today
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {isLoading
              ? [...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 animate-pulse"
                  >
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                ))
              : topSignals.map((signal) => (
                  <button
                    key={signal.ticker}
                    onClick={() => router.push(`/stock/${signal.ticker}`)}
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6
                           hover:shadow-lg transition-all text-left"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                          {signal.ticker}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {signal.companyName}
                        </div>
                      </div>
                      <SignalBadge signal={signal.signal} size="sm" showIcon={true} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          ${signal.lastPrice.toFixed(2)}
                        </div>
                        <div
                          className={`text-sm font-semibold ${
                            signal.priceChange >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {signal.priceChange >= 0 ? '+' : ''}
                          {signal.priceChange.toFixed(2)}%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500 dark:text-gray-400">Confidence</div>
                        <div
                          className="text-lg font-bold"
                          style={{ color: designTokens.colors.brand.primary }}
                        >
                          {signal.confidence}%
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
          </div>
        </div>

        {/* Watchlist table */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Your Watchlist
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <WatchlistTable
              data={watchlist}
              onRemove={handleRemoveFromWatchlist}
              isLoading={isLoading}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
