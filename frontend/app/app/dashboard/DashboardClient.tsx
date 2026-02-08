'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SignalBadge } from '@/features/signals';
import { SignalType } from '@/lib/types';
import { TrendingUp, TrendingDown, Activity, AlertCircle, ArrowUpDown, Filter } from 'lucide-react';
import { designTokens } from '@/lib/design-tokens';
import { useLiveSignals } from '@/lib/hooks/use-api-swr';

interface DashboardSignal {
  ticker: string;
  signal: SignalType;
  confidence: number;
  expectedReturn: number | null;
  rank: number;
}

interface DashboardStats {
  totalStocks: number;
  highConfidenceSignals: number;
  avgConfidence: number;
  latestUpdate: string;
}

type SortField = 'confidence' | 'rank' | 'expectedReturn';
type SortDirection = 'asc' | 'desc';
type SignalFilter = 'ALL' | 'BUY' | 'HOLD' | 'SELL';

function convertToSignalType(mlProb: number): SignalType {
  if (mlProb > 0.8) return 'STRONG_BUY';
  if (mlProb > 0.6) return 'BUY';
  if (mlProb >= 0.4) return 'HOLD';
  if (mlProb >= 0.2) return 'SELL';
  return 'STRONG_SELL';
}

interface DashboardClientProps {
  initialData: {
    signals: any[];
    as_of: string;
  } | null;
}

export default function DashboardClient({ initialData }: DashboardClientProps) {
  const router = useRouter();

  // SWR for auto-refresh – falls back to initialData for instant first paint
  const {
    data: liveData,
    error: swrError,
    isLoading: swrLoading,
  } = useLiveSignals('model_a_ml', 100, {
    fallbackData: initialData
      ? { signals: initialData.signals, as_of: initialData.as_of }
      : undefined,
  });

  const [sortField, setSortField] = useState<SortField>('confidence');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [signalFilter, setSignalFilter] = useState<SignalFilter>('ALL');

  // Transform raw backend signals → dashboard format (memoized)
  const signals: DashboardSignal[] = useMemo(() => {
    const rawSignals = liveData?.signals || [];
    return rawSignals.map((s: any) => ({
      ticker: (s.symbol || '').replace('.AX', '').replace('.AU', ''),
      signal: convertToSignalType(s.ml_prob),
      confidence: Math.round(s.ml_prob * 100),
      expectedReturn: s.ml_expected_return || null,
      rank: s.rank,
    }));
  }, [liveData]);

  // Stats (memoized)
  const stats: DashboardStats = useMemo(() => {
    if (signals.length === 0) {
      return { totalStocks: 0, highConfidenceSignals: 0, avgConfidence: 0, latestUpdate: '' };
    }
    const highConf = signals.filter((s) => s.confidence > 70).length;
    const avgConf = Math.round(signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length);
    return {
      totalStocks: signals.length,
      highConfidenceSignals: highConf,
      avgConfidence: avgConf,
      latestUpdate: liveData?.as_of || new Date().toISOString(),
    };
  }, [signals, liveData]);

  // Filtered + sorted signals (memoized – no re-sort on every render)
  const filteredSignals = useMemo(() => {
    let filtered = signals;

    if (signalFilter !== 'ALL') {
      filtered = filtered.filter((s) => {
        if (signalFilter === 'BUY') return s.signal === 'BUY' || s.signal === 'STRONG_BUY';
        if (signalFilter === 'SELL') return s.signal === 'SELL' || s.signal === 'STRONG_SELL';
        if (signalFilter === 'HOLD') return s.signal === 'HOLD';
        return true;
      });
    }

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'confidence') comparison = a.confidence - b.confidence;
      else if (sortField === 'rank') comparison = a.rank - b.rank;
      else if (sortField === 'expectedReturn')
        comparison = (a.expectedReturn || 0) - (b.expectedReturn || 0);
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [signals, sortField, sortDirection, signalFilter]);

  const handleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDirection('desc');
      return field;
    });
  }, []);

  const handleRowClick = useCallback(
    (ticker: string) => router.push(`/stock/${ticker}.AX`),
    [router]
  );

  const isLoading = !initialData && swrLoading;
  const error = swrError ? 'Failed to load signals from backend. Please try again.' : null;

  return (
    <>
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
              Total Stocks
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
              High Confidence (&gt;70%)
            </span>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {isLoading ? '...' : stats.highConfidenceSignals}
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
              Last Updated
            </span>
            <TrendingDown className="h-5 w-5 text-orange-600" />
          </div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {isLoading || !stats.latestUpdate
              ? '...'
              : new Date(stats.latestUpdate).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
          </div>
        </div>
      </div>

      {/* Filter controls */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</span>
            <div className="flex gap-2" role="group" aria-label="Signal filter">
              {(['ALL', 'BUY', 'HOLD', 'SELL'] as SignalFilter[]).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSignalFilter(filter)}
                  aria-pressed={signalFilter === filter}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    signalFilter === filter
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Signals table */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Live Signals ({filteredSignals.length})
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading signals...</p>
            </div>
          ) : filteredSignals.length === 0 ? (
            <div className="p-12 text-center">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No signals match your filter</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      aria-sort={
                        sortField === 'rank'
                          ? sortDirection === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                    >
                      <button
                        onClick={() => handleSort('rank')}
                        className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
                      >
                        Rank
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Ticker
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Signal
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      aria-sort={
                        sortField === 'confidence'
                          ? sortDirection === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                    >
                      <button
                        onClick={() => handleSort('confidence')}
                        className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
                      >
                        Confidence
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      aria-sort={
                        sortField === 'expectedReturn'
                          ? sortDirection === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                    >
                      <button
                        onClick={() => handleSort('expectedReturn')}
                        className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
                      >
                        Expected Return
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredSignals.map((signal) => (
                    <tr
                      key={signal.ticker}
                      onClick={() => handleRowClick(signal.ticker)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                        #{signal.rank}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          {signal.ticker}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <SignalBadge signal={signal.signal} size="sm" showIcon={true} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div
                            className="text-sm font-bold"
                            style={{
                              color:
                                signal.confidence > 70
                                  ? designTokens.colors.signals.strongBuy
                                  : signal.confidence > 50
                                    ? designTokens.colors.signals.buy
                                    : designTokens.colors.signals.hold,
                            }}
                          >
                            {signal.confidence}%
                          </div>
                          <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{
                                width: `${signal.confidence}%`,
                                backgroundColor:
                                  signal.confidence > 70
                                    ? designTokens.colors.signals.strongBuy
                                    : signal.confidence > 50
                                      ? designTokens.colors.signals.buy
                                      : designTokens.colors.signals.hold,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {signal.expectedReturn !== null ? (
                          <span
                            className={`text-sm font-semibold ${
                              signal.expectedReturn > 0
                                ? 'text-green-600'
                                : signal.expectedReturn < 0
                                  ? 'text-red-600'
                                  : 'text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {signal.expectedReturn > 0 ? '+' : ''}
                            {(signal.expectedReturn * 100).toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
