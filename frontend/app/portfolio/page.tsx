'use client';

import React, { useState, useEffect } from 'react';
import { Portfolio, PortfolioHolding } from '@/lib/types';
import { api } from '@/lib/api-client';
import PortfolioUpload from '@/components/portfolio-upload';
import HoldingsTable from '@/components/holdings-table';
import { exportHoldingsToCSV } from '@/lib/utils/export';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Briefcase,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface PortfolioStats {
  totalValue: number;
  todayChange: number;
  todayChangePercent: number;
  totalPL: number;
  totalPLPercent: number;
  holdingsCount: number;
}

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.getPortfolio();
      setPortfolio(response.data.data);
      setShowUpload(false);
    } catch (err: any) {
      // If 404, user hasn't uploaded portfolio yet
      if (err.response?.status === 404) {
        setShowUpload(true);
        setPortfolio(null);
      } else {
        setError(err.response?.data?.message || 'Failed to load portfolio');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadSuccess = () => {
    loadPortfolio();
  };

  const handleExport = () => {
    if (portfolio?.holdings) {
      exportHoldingsToCSV(portfolio.holdings);
    }
  };

  // Calculate stats
  const stats: PortfolioStats = React.useMemo(() => {
    if (!portfolio) {
      return {
        totalValue: 0,
        todayChange: 0,
        todayChangePercent: 0,
        totalPL: 0,
        totalPLPercent: 0,
        holdingsCount: 0,
      };
    }

    const totalValue = portfolio.holdings.reduce((sum, h) => sum + h.totalValue, 0);
    const totalCost = portfolio.holdings.reduce((sum, h) => sum + h.avgCost * h.shares, 0);
    const totalPL = totalValue - totalCost;
    const totalPLPercent = (totalPL / totalCost) * 100;

    // Mock today's change (would come from API in production)
    const todayChange = totalValue * 0.012; // Mock 1.2% change
    const todayChangePercent = 1.2;

    return {
      totalValue,
      todayChange,
      todayChangePercent,
      totalPL,
      totalPLPercent,
      holdingsCount: portfolio.holdings.length,
    };
  }, [portfolio]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !showUpload) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-start gap-3 p-6 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900 dark:text-red-100">Failed to load portfolio</p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
              <button
                onClick={loadPortfolio}
                className="mt-3 flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Portfolio
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Track your holdings with AI-powered insights
            </p>
          </div>
          {portfolio && (
            <button
              onClick={() => setShowUpload(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Upload New Portfolio
            </button>
          )}
        </div>

        {/* Show upload if no portfolio or user clicked upload button */}
        {showUpload && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {portfolio ? 'Replace Portfolio' : 'Upload Portfolio'}
              </h2>
              {portfolio && (
                <button
                  onClick={() => setShowUpload(false)}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Cancel
                </button>
              )}
            </div>
            <PortfolioUpload onSuccess={handleUploadSuccess} />
          </div>
        )}

        {/* Portfolio content */}
        {portfolio && !showUpload && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Value */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Value</span>
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <div
                  className={`flex items-center gap-1 mt-2 text-sm font-medium ${
                    stats.todayChange >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {stats.todayChange >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>
                    {stats.todayChange >= 0 ? '+' : ''}${Math.abs(stats.todayChange).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({stats.todayChange >= 0 ? '+' : ''}{stats.todayChangePercent.toFixed(2)}%)
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Today's change</p>
              </div>

              {/* Total P&L */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total P&L</span>
                  {stats.totalPL >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <p
                  className={`text-2xl font-bold ${
                    stats.totalPL >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {stats.totalPL >= 0 ? '+' : ''}${Math.abs(stats.totalPL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className={`text-sm font-medium mt-2 ${stats.totalPL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {stats.totalPL >= 0 ? '+' : ''}{stats.totalPLPercent.toFixed(2)}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">All-time return</p>
              </div>

              {/* Holdings Count */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Holdings</span>
                  <Briefcase className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.holdingsCount}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Unique positions
                </p>
              </div>

              {/* Strong Signals */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Strong Signals</span>
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {portfolio.holdings.filter(h => h.signal === 'STRONG_BUY' || h.signal === 'STRONG_SELL').length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Requires attention
                </p>
              </div>
            </div>

            {/* Holdings Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Holdings
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Your portfolio positions with AI signals
                </p>
              </div>
              <HoldingsTable
                holdings={portfolio.holdings}
                onExport={handleExport}
                isLoading={false}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
