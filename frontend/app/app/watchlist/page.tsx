'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';
import { WatchlistItem } from '@/lib/types';
import WatchlistTable from '@/components/watchlist-table';
import StockSearch from '@/components/stock-search';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { Plus, RefreshCw } from 'lucide-react';

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    loadWatchlist();
    // Auto-refresh every 60 seconds
    const interval = setInterval(loadWatchlist, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadWatchlist = async () => {
    try {
      setIsLoading(true);
      const response = await api.getWatchlist();
      const items = response.data.items || [];

      const transformed = items.map((item: any) => ({
        ticker: item.ticker,
        companyName: item.name || item.ticker,
        signal: item.current_signal || 'HOLD',
        confidence: (item.signal_confidence || 0.5) * 100,
        lastPrice: item.current_price || 0,
        priceChange: item.price_change_pct || 0,
        priceChangeAmount: 0,
        lastUpdated: item.added_at || new Date().toISOString(),
        addedAt: item.added_at || new Date().toISOString(),
      }));

      setWatchlist(transformed);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load watchlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (ticker: string) => {
    try {
      await api.removeFromWatchlist(ticker);
      await loadWatchlist(); // Refresh list
    } catch (error) {
      console.error('Failed to remove from watchlist:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Watchlist</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={loadWatchlist}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <StockSearch
            onSelect={(ticker) => {
              window.location.href = `/stock/${ticker}`;
            }}
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Stocks</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {watchlist.length}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">Strong Signals</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {
                watchlist.filter((w) => w.signal === 'STRONG_BUY' || w.signal === 'STRONG_SELL')
                  .length
              }
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">Avg Confidence</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {watchlist.length > 0
                ? Math.round(watchlist.reduce((s, w) => s + w.confidence, 0) / watchlist.length)
                : 0}
              %
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">Big Movers (&gt;2%)</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {watchlist.filter((w) => Math.abs(w.priceChange) > 2).length}
            </div>
          </div>
        </div>

        {/* Watchlist Table */}
        {isLoading && watchlist.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading watchlist...</p>
          </div>
        ) : watchlist.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Plus className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Your watchlist is empty. Start by searching for stocks above.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <WatchlistTable data={watchlist} onRemove={handleRemove} isLoading={isLoading} />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
