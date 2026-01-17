'use client';

import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  ColumnDef,
  flexRender,
} from '@tanstack/react-table';
import { WatchlistItem } from '@/lib/types';
import SignalBadge from './signal-badge';
import { ArrowUpDown, ArrowUp, ArrowDown, X, TrendingUp, TrendingDown } from 'lucide-react';
import { designTokens } from '@/lib/design-tokens';
import { useRouter } from 'next/navigation';

interface WatchlistTableProps {
  data: WatchlistItem[];
  onRemove?: (ticker: string) => void;
  isLoading?: boolean;
}

export default function WatchlistTable({ data, onRemove, isLoading = false }: WatchlistTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([{ id: 'confidence', desc: true }]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo<ColumnDef<WatchlistItem>[]>(
    () => [
      {
        accessorKey: 'ticker',
        header: 'Ticker',
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
        accessorKey: 'companyName',
        header: 'Company',
        cell: (info) => (
          <span className="text-gray-900 dark:text-white">{info.getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'signal',
        header: 'Signal',
        cell: (info) => <SignalBadge signal={info.getValue() as any} size="sm" showIcon={true} />,
        sortingFn: (rowA, rowB) => {
          const signalOrder = ['STRONG_SELL', 'SELL', 'HOLD', 'BUY', 'STRONG_BUY'];
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
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
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
        accessorKey: 'lastPrice',
        header: ({ column }) => {
          return (
            <button
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
            >
              Price
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
          <span className="font-mono text-gray-900 dark:text-white">
            ${(info.getValue() as number).toFixed(2)}
          </span>
        ),
      },
      {
        accessorKey: 'priceChange',
        header: ({ column }) => {
          return (
            <button
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
            >
              Change
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
          const change = info.getValue() as number;
          const isPositive = change >= 0;
          return (
            <div
              className={`flex items-center gap-1 font-semibold ${
                isPositive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>
                {isPositive ? '+' : ''}
                {change.toFixed(2)}%
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'lastUpdated',
        header: 'Updated',
        cell: (info) => {
          const date = new Date(info.getValue() as string);
          const now = new Date();
          const diffMs = now.getTime() - date.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMins / 60);

          let timeAgo = '';
          if (diffMins < 1) {
            timeAgo = 'Just now';
          } else if (diffMins < 60) {
            timeAgo = `${diffMins}m ago`;
          } else if (diffHours < 24) {
            timeAgo = `${diffHours}h ago`;
          } else {
            timeAgo = date.toLocaleDateString();
          }

          return <span className="text-sm text-gray-500 dark:text-gray-400">{timeAgo}</span>;
        },
      },
      {
        id: 'actions',
        header: '',
        cell: (info) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.(info.row.original.ticker);
            }}
            className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            title="Remove from watchlist"
          >
            <X className="h-4 w-4" />
          </button>
        ),
      },
    ],
    [router, onRemove]
  );

  const table = useReactTable({
    data,
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
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400 text-lg">Your watchlist is empty</p>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
          Search for stocks to add to your watchlist
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Search filter */}
      <div className="mb-4">
        <input
          type="text"
          value={globalFilter ?? ''}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Filter by ticker or company name..."
          className="w-full max-w-md px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                onClick={() => router.push(`/stock/${row.original.ticker}`)}
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

      {/* Table info */}
      <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        Showing {table.getRowModel().rows.length} of {data.length} stocks
      </div>
    </div>
  );
}
