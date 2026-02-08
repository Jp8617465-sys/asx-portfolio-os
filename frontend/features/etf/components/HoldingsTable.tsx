'use client';

import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import type { ETFHolding, SignalType } from '@/contracts';

interface HoldingsTableProps {
  holdings: ETFHolding[];
  pageSize?: number;
}

type SortField = 'holdingSymbol' | 'holdingName' | 'weight' | 'sector' | 'signal' | 'confidence';
type SortDirection = 'asc' | 'desc';

function getSignalColor(signal?: SignalType | string): string {
  switch (signal) {
    case 'STRONG_BUY':
    case 'BUY':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'HOLD':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'SELL':
    case 'STRONG_SELL':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
  }
}

export function HoldingsTable({ holdings, pageSize = 20 }: HoldingsTableProps) {
  const [sortField, setSortField] = useState<SortField>('weight');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const sortedHoldings = useMemo(() => {
    const sorted = [...holdings].sort((a, b) => {
      const aVal = a[sortField] ?? '';
      const bVal = b[sortField] ?? '';
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
    return sorted;
  }, [holdings, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedHoldings.length / pageSize);
  const paginatedHoldings = sortedHoldings.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  if (holdings.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No Holdings"
        description="This ETF has no holdings data available."
      />
    );
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4 inline ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 inline ml-1" />
    );
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th
                className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                onClick={() => handleSort('holdingSymbol')}
              >
                Symbol
                <SortIcon field="holdingSymbol" />
              </th>
              <th
                className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                onClick={() => handleSort('holdingName')}
              >
                Name
                <SortIcon field="holdingName" />
              </th>
              <th
                className="text-right py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                onClick={() => handleSort('weight')}
              >
                Weight
                <SortIcon field="weight" />
              </th>
              <th
                className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                onClick={() => handleSort('sector')}
              >
                Sector
                <SortIcon field="sector" />
              </th>
              <th
                className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                onClick={() => handleSort('signal')}
              >
                Signal
                <SortIcon field="signal" />
              </th>
              <th
                className="text-right py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                onClick={() => handleSort('confidence')}
              >
                Confidence
                <SortIcon field="confidence" />
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedHoldings.map((holding) => (
              <tr
                key={holding.holdingSymbol}
                className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                  {holding.holdingSymbol}
                </td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                  {holding.holdingName || '--'}
                </td>
                <td className="py-3 px-4 text-right font-medium text-slate-700 dark:text-slate-300">
                  {holding.weight !== undefined && holding.weight !== null
                    ? `${holding.weight.toFixed(2)}%`
                    : '--'}
                </td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                  {holding.sector || '--'}
                </td>
                <td className="py-3 px-4 text-center">
                  {holding.signal ? (
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold',
                        getSignalColor(holding.signal)
                      )}
                    >
                      {holding.signal}
                    </span>
                  ) : (
                    <span className="text-slate-400">--</span>
                  )}
                </td>
                <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                  {holding.confidence !== undefined && holding.confidence !== null
                    ? `${holding.confidence}%`
                    : '--'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-4">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Page {currentPage} of {totalPages} ({holdings.length} holdings)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm rounded border border-slate-200 dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm rounded border border-slate-200 dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
