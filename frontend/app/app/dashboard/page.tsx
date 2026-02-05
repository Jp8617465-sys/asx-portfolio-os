'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { SignalBadge } from '@/features/signals';
import apiClient from '@/lib/api-client';
import { SignalType } from '@/lib/types';
import { TrendingUp, TrendingDown, Activity, AlertCircle, ArrowUpDown, Filter } from 'lucide-react';
import { designTokens } from '@/lib/design-tokens';
import { useAutoRefresh } from '@/lib/hooks/useAutoRefresh';

interface ModelASignal {
  symbol: string;
  rank: number;
  score: number;
  ml_prob: number;
  ml_expected_return?: number;
}

interface ModelASignalsResponse {
  status: string;
  model: string;
  as_of: string;
  count: number;
  signals: ModelASignal[];
}

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

export default function DashboardPage() {
  const router = useRouter();
  const [signals, setSignals] = useState<DashboardSignal[]>([]);
  const [filteredSignals, setFilteredSignals] = useState<DashboardSignal[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalStocks: 0,
    highConfidenceSignals: 0,
    avgConfidence: 0,
    latestUpdate: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sorting and filtering state
  const [sortField, setSortField] = useState<SortField>('confidence');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [signalFilter, setSignalFilter] = useState<SignalFilter>('ALL');

  const convertToSignalType = (mlProb: number): SignalType => {
    if (mlProb > 0.8) return 'STRONG_BUY';
    if (mlProb > 0.6) return 'BUY';
    if (mlProb >= 0.4) return 'HOLD';
    if (mlProb >= 0.2) return 'SELL';
    return 'STRONG_SELL';
  };

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch Model A signals from backend via proxy
      const response = await apiClient.get<ModelASignalsResponse>('/api/signals/live', {
        params: { model: 'model_a_ml', limit: 100 },
      });

      const backendSignals = response.data.signals || [];

      // Transform backend response to dashboard format
      const transformedSignals: DashboardSignal[] = backendSignals.map((signal) => ({
        ticker: signal.symbol.replace('.AX', '').replace('.AU', ''),
        signal: convertToSignalType(signal.ml_prob),
        confidence: Math.round(signal.ml_prob * 100),
        expectedReturn: signal.ml_expected_return || null,
        rank: signal.rank,
      }));

      setSignals(transformedSignals);

      // Calculate statistics
      const highConfidence = transformedSignals.filter((s) => s.confidence > 70).length;
      const avgConf =
        transformedSignals.length > 0
          ? Math.round(
              transformedSignals.reduce((sum, s) => sum + s.confidence, 0) /
                transformedSignals.length
            )
          : 0;

      setStats({
        totalStocks: transformedSignals.length,
        highConfidenceSignals: highConfidence,
        avgConfidence: avgConf,
        latestUpdate: response.data.as_of || new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error loading dashboard signals:', err);
      setError('Failed to load signals from backend. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Apply filtering and sorting
  useEffect(() => {
    let filtered = [...signals];

    // Apply signal type filter
    if (signalFilter !== 'ALL') {
      filtered = filtered.filter((signal) => {
        if (signalFilter === 'BUY') {
          return signal.signal === 'BUY' || signal.signal === 'STRONG_BUY';
        } else if (signalFilter === 'SELL') {
          return signal.signal === 'SELL' || signal.signal === 'STRONG_SELL';
        } else if (signalFilter === 'HOLD') {
          return signal.signal === 'HOLD';
        }
        return true;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      if (sortField === 'confidence') {
        comparison = a.confidence - b.confidence;
      } else if (sortField === 'rank') {
        comparison = a.rank - b.rank;
      } else if (sortField === 'expectedReturn') {
        const aReturn = a.expectedReturn || 0;
        const bReturn = b.expectedReturn || 0;
        comparison = aReturn - bReturn;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    setFilteredSignals(filtered);
  }, [signals, sortField, sortDirection, signalFilter]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Auto-refresh every 60 seconds
  useAutoRefresh({
    onRefresh: loadDashboardData,
    intervalMs: 60000,
    enabled: !isLoading,
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleRowClick = (ticker: string) => {
    router.push(`/stock/${ticker}.AX`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Model A Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time AI-powered stock signals from our machine learning model
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
              {isLoading
                ? '...'
                : new Date(stats.latestUpdate).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
            </div>
          </div>
        </div>

        {/* Filter and sort controls */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</span>
              <div className="flex gap-2">
                {(['ALL', 'BUY', 'HOLD', 'SELL'] as SignalFilter[]).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setSignalFilter(filter)}
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
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <button
                          onClick={() => handleSort('confidence')}
                          className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
                        >
                          Confidence
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
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
      </main>

      <Footer />
    </div>
  );
}
