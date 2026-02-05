'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  SortingState,
  ColumnDef,
  flexRender,
} from '@tanstack/react-table';
import Header from '@/components/header';
import Footer from '@/components/footer';
import StockSearch from '@/components/stock-search';
import { SignalBadge } from '@/features/signals';
import { api } from '@/lib/api-client';
import { SignalType } from '@/lib/types';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { designTokens } from '@/lib/design-tokens';

interface StockData {
  symbol: string;
  name: string;
  signal: SignalType;
  confidence: number;
  expectedReturn: number;
  rank: number;
  sector?: string;
  price?: number;
  priceChange?: number;
}

type SignalFilter = 'ALL' | 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';

export default function BrowseStocksPage() {
  const router = useRouter();
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'confidence', desc: true }]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [signalFilter, setSignalFilter] = useState<SignalFilter>('ALL');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadStocks = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get ensemble signals with a high limit to show all available stocks
      const response = await api.getEnsembleSignals({ limit: 500, agreement_only: false });
      const signalsData = response.data;

      if (signalsData?.signals && Array.isArray(signalsData.signals)) {
        const transformedStocks: StockData[] = signalsData.signals.map((signal: any) => {
          // Convert confidence (0-1) to percentage (0-100)
          const confidence = Math.round((signal.confidence || 0) * 100);

          // Use the signal from the backend directly
          let signalType: SignalType = 'HOLD';
          if (signal.signal) {
            signalType = signal.signal as SignalType;
          } else {
            // Fallback: determine signal based on confidence
            if (confidence >= 80) signalType = 'STRONG_BUY';
            else if (confidence >= 60) signalType = 'BUY';
            else if (confidence <= 20) signalType = 'STRONG_SELL';
            else if (confidence <= 40) signalType = 'SELL';
          }

          return {
            symbol: signal.symbol || '',
            name: signal.symbol?.replace('.AU', '').replace('.AX', '') || '', // Use ticker as name for now
            signal: signalType,
            confidence,
            expectedReturn: signal.ensemble_score || 0,
            rank: signal.rank || 0,
            sector: undefined, // Can be added when backend provides it
            price: undefined, // Can be added when backend provides it
            priceChange: undefined, // Can be added when backend provides it
          };
        });

        setStocks(transformedStocks);
        setLastRefresh(new Date());
      } else {
        setStocks([]);
      }
    } catch (err) {
      console.error('Error loading stocks:', err);
      setError('Failed to load stocks. Please try again.');
      setStocks([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStocks();
  }, []);

  // Filter stocks by signal type
  const filteredStocks = useMemo(() => {
    if (signalFilter === 'ALL') return stocks;
    return stocks.filter((stock) => stock.signal === signalFilter);
  }, [stocks, signalFilter]);

  const columns = useMemo<ColumnDef<StockData>[]>(
    () => [
      {
        accessorKey: 'rank',
        header: '#',
        size: 60,
        cell: (info) => (
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {info.getValue() as number}
          </span>
        ),
      },
      {
        accessorKey: 'symbol',
        header: 'Ticker',
        size: 120,
        cell: (info) => (
          <button
            onClick={() => router.push(`/stock/${info.getValue()}`)}
            className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            {info.getValue() as string}
          </button>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Company',
        cell: (info) => (
          <span className="text-gray-900 dark:text-white">{info.getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'signal',
        header: ({ column }) => {
          return (
            <button
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
            >
              Signal
              {column.getIsSorted() === 'asc' ? (
                <ArrowUp className="h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ArrowDown className="h-4 w-4" />
              ) : (
                <ArrowUpDown className="h-4 w-4 opacity-50" />
              )}
            </button>
          );
        },
        cell: (info) => (
          <SignalBadge signal={info.getValue() as SignalType} size="sm" showIcon={true} />
        ),
        sortingFn: (rowA, rowB) => {
          const signalOrder: SignalType[] = ['STRONG_SELL', 'SELL', 'HOLD', 'BUY', 'STRONG_BUY'];
          const aIndex = signalOrder.indexOf(rowA.original.signal);
          const bIndex = signalOrder.indexOf(rowB.original.signal);
          return aIndex - bIndex;
        },
      },
      {
        accessorKey: 'confidence',
        header: ({ column }) => {
          return (
            <button
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
            >
              Confidence
              {column.getIsSorted() === 'asc' ? (
                <ArrowUp className="h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ArrowDown className="h-4 w-4" />
              ) : (
                <ArrowUpDown className="h-4 w-4 opacity-50" />
              )}
            </button>
          );
        },
        cell: (info) => {
          const confidence = info.getValue() as number;
          return (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden min-w-[60px]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${confidence}%`,
                    backgroundColor: designTokens.colors.brand.primary,
                  }}
                />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12 text-right">
                {confidence}%
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'expectedReturn',
        header: ({ column }) => {
          return (
            <button
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
            >
              Score
              {column.getIsSorted() === 'asc' ? (
                <ArrowUp className="h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ArrowDown className="h-4 w-4" />
              ) : (
                <ArrowUpDown className="h-4 w-4 opacity-50" />
              )}
            </button>
          );
        },
        cell: (info) => {
          const value = info.getValue() as number;
          return (
            <span className="font-mono text-sm text-gray-900 dark:text-white">
              {value.toFixed(2)}
            </span>
          );
        },
      },
    ],
    [router]
  );

  const table = useReactTable({
    data: filteredStocks,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  const signalFilterOptions: { value: SignalFilter; label: string; color: string }[] = [
    {
      value: 'ALL',
      label: 'All Signals',
      color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    },
    {
      value: 'STRONG_BUY',
      label: 'Strong Buy',
      color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    },
    {
      value: 'BUY',
      label: 'Buy',
      color: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-500',
    },
    {
      value: 'HOLD',
      label: 'Hold',
      color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    },
    {
      value: 'SELL',
      label: 'Sell',
      color: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-500',
    },
    {
      value: 'STRONG_SELL',
      label: 'Strong Sell',
      color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    },
  ];

  const statsCards = [
    { label: 'Total Stocks', value: stocks.length, icon: TrendingUp },
    {
      label: 'Strong Buy',
      value: stocks.filter((s) => s.signal === 'STRONG_BUY').length,
      icon: TrendingUp,
    },
    { label: 'Buy', value: stocks.filter((s) => s.signal === 'BUY').length, icon: TrendingUp },
    { label: 'Hold', value: stocks.filter((s) => s.signal === 'HOLD').length, icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Browse Stocks</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Explore ASX stocks with AI-powered signals and confidence scores
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((stat, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {stat.label}
                </span>
                <stat.icon className="h-5 w-5 text-gray-400" />
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {isLoading ? '...' : stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Search and filters */}
        <div className="mb-6 space-y-4">
          {/* Search bar */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <StockSearch placeholder="Search for stocks..." />
            </div>
            <button
              onClick={loadStocks}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {/* Filter buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Filter by:</span>
            {signalFilterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSignalFilter(option.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  signalFilter === option.value
                    ? option.color + ' ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-950'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {option.label}
                {signalFilter === option.value && (
                  <span className="ml-1 font-semibold">({filteredStocks.length})</span>
                )}
              </button>
            ))}
          </div>

          {/* Text search */}
          <div>
            <input
              type="text"
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Filter table by ticker or company name..."
              className="w-full max-w-md px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
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

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : filteredStocks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 text-lg">No stocks found</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                Try adjusting your filters or search term
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                            style={{ width: header.column.getSize() }}
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer"
                        onClick={() => router.push(`/stock/${row.original.symbol}`)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing{' '}
                  {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}{' '}
                  to{' '}
                  {Math.min(
                    (table.getState().pagination.pageIndex + 1) *
                      table.getState().pagination.pageSize,
                    filteredStocks.length
                  )}{' '}
                  of {filteredStocks.length} stocks
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700
                             text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700
                             disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                  </span>
                  <button
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700
                             text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700
                             disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
