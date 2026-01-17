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
import { PortfolioHolding } from '@/lib/types';
import SignalBadge from './signal-badge';
import { ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, TrendingDown, Download } from 'lucide-react';
import { designTokens } from '@/lib/design-tokens';
import { useRouter } from 'next/navigation';

interface HoldingsTableProps {
  holdings: PortfolioHolding[];
  onExport?: () => void;
  isLoading?: boolean;
}

export default function HoldingsTable({
  holdings,
  onExport,
  isLoading = false,
}: HoldingsTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([{ id: 'totalValue', desc: true }]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo<ColumnDef<PortfolioHolding>[]>(
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
        accessorKey: 'shares',
        header: ({ column }) => {
          return (
            <button
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
            >
              Shares
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
            {(info.getValue() as number).toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: 'avgCost',
        header: ({ column }) => {
          return (
            <button
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
            >
              Avg Cost
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
        accessorKey: 'currentPrice',
        header: ({ column }) => {
          return (
            <button
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
            >
              Current Price
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
        accessorKey: 'totalValue',
        header: ({ column }) => {
          return (
            <button
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
            >
              Total Value
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
          <span className="font-mono font-semibold text-gray-900 dark:text-white">
            $
            {(info.getValue() as number).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        ),
      },
      {
        id: 'profitLoss',
        header: ({ column }) => {
          return (
            <button
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
            >
              P&L
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
        accessorFn: (row) => (row.currentPrice - row.avgCost) * row.shares,
        cell: (info) => {
          const holding = info.row.original;
          const pl = (holding.currentPrice - holding.avgCost) * holding.shares;
          const plPercent = ((holding.currentPrice - holding.avgCost) / holding.avgCost) * 100;
          const isPositive = pl >= 0;

          return (
            <div className="space-y-1">
              <div
                className={`flex items-center gap-1 font-semibold ${
                  isPositive
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span className="font-mono">
                  {isPositive ? '+' : ''}$
                  {Math.abs(pl).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div
                className={`text-xs font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
              >
                {isPositive ? '+' : ''}
                {plPercent.toFixed(2)}%
              </div>
            </div>
          );
        },
        sortingFn: (rowA, rowB) => {
          const plA = (rowA.original.currentPrice - rowA.original.avgCost) * rowA.original.shares;
          const plB = (rowB.original.currentPrice - rowB.original.avgCost) * rowB.original.shares;
          return plA - plB;
        },
      },
      {
        accessorKey: 'signal',
        header: 'AI Signal',
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
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden min-w-[60px]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${confidence}%`,
                    backgroundColor: designTokens.colors.brand.primary,
                  }}
                />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-10 text-right">
                {confidence}%
              </span>
            </div>
          );
        },
      },
    ],
    [router]
  );

  const table = useReactTable({
    data: holdings,
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

  // Calculate totals
  const totals = useMemo(() => {
    return holdings.reduce(
      (acc, holding) => {
        const value = holding.totalValue;
        const cost = holding.avgCost * holding.shares;
        const pl = value - cost;
        return {
          totalValue: acc.totalValue + value,
          totalCost: acc.totalCost + cost,
          totalPL: acc.totalPL + pl,
        };
      },
      { totalValue: 0, totalCost: 0, totalPL: 0 }
    );
  }, [holdings]);

  const totalPLPercent = (totals.totalPL / totals.totalCost) * 100;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (holdings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400 text-lg">No holdings in portfolio</p>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
          Upload a CSV file to import your holdings
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Header with search and export */}
      <div className="flex items-center justify-between gap-4">
        <input
          type="text"
          value={globalFilter ?? ''}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Filter by ticker or company name..."
          className="flex-1 max-w-md px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {onExport && (
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        )}
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
          {/* Totals footer */}
          <tfoot className="bg-gray-100 dark:bg-gray-800 border-t-2 border-gray-300 dark:border-gray-600">
            <tr>
              <td
                colSpan={5}
                className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white"
              >
                Totals:
              </td>
              <td className="px-6 py-4 font-mono font-bold text-gray-900 dark:text-white">
                $
                {totals.totalValue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td className="px-6 py-4">
                <div className="space-y-1">
                  <div
                    className={`flex items-center gap-1 font-bold ${
                      totals.totalPL >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {totals.totalPL >= 0 ? (
                      <TrendingUp className="h-5 w-5" />
                    ) : (
                      <TrendingDown className="h-5 w-5" />
                    )}
                    <span className="font-mono">
                      {totals.totalPL >= 0 ? '+' : ''}$
                      {Math.abs(totals.totalPL).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div
                    className={`text-sm font-semibold ${totals.totalPL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                  >
                    {totals.totalPL >= 0 ? '+' : ''}
                    {totalPLPercent.toFixed(2)}%
                  </div>
                </div>
              </td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Table info */}
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Showing {table.getRowModel().rows.length} of {holdings.length} holdings
      </div>
    </div>
  );
}
