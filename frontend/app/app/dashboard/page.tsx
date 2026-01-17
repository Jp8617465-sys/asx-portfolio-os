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

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load watchlist
      const watchlistResponse = await api.getWatchlist();
      const watchlistData = watchlistResponse.data.data || [];
      setWatchlist(watchlistData);

      // Calculate stats
      const strongSignals = watchlistData.filter(
        (item: WatchlistItem) => item.signal === 'STRONG_BUY' || item.signal === 'STRONG_SELL'
      ).length;

      const avgConf =
        watchlistData.length > 0
          ? watchlistData.reduce((sum: number, item: WatchlistItem) => sum + item.confidence, 0) /
            watchlistData.length
          : 0;

      const todayChanges = watchlistData.filter(
        (item: WatchlistItem) => Math.abs(item.priceChange) > 2
      ).length;

      setStats({
        totalStocks: watchlistData.length,
        strongSignals,
        avgConfidence: Math.round(avgConf),
        todayChanges,
      });

      // Mock top signals data (replace with real API call later)
      setTopSignals([
        {
          ticker: 'BHP.AX',
          companyName: 'BHP Group',
          signal: 'STRONG_BUY',
          confidence: 87,
          lastPrice: 45.32,
          priceChange: 3.2,
          priceChangeAmount: 1.45,
          lastUpdated: new Date().toISOString(),
        },
        {
          ticker: 'CBA.AX',
          companyName: 'Commonwealth Bank',
          signal: 'BUY',
          confidence: 78,
          lastPrice: 102.45,
          priceChange: 1.5,
          priceChangeAmount: 1.52,
          lastUpdated: new Date().toISOString(),
        },
        {
          ticker: 'FMG.AX',
          companyName: 'Fortescue Metals',
          signal: 'STRONG_BUY',
          confidence: 82,
          lastPrice: 19.87,
          priceChange: 4.1,
          priceChangeAmount: 0.78,
          lastUpdated: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Dashboard
          </h1>
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
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Confidence
                        </div>
                        <div className="text-lg font-bold" style={{ color: designTokens.colors.brand.primary }}>
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
