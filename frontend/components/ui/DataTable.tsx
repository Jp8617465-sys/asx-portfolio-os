import { ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from './badge';

export type SortDirection = 'asc' | 'desc' | null;

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (value: T) => ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  onRowClick?: (item: T) => void;
  className?: string;
  stickyHeader?: boolean;
  striped?: boolean;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  className,
  stickyHeader = false,
  striped = false,
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const handleSort = (columnKey: string, sortable?: boolean) => {
    if (!sortable) return;

    if (sortColumn === columnKey) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortColumn(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortColumn || !sortDirection) return 0;

    const aValue = a[sortColumn];
    const bValue = b[sortColumn];

    if (aValue === bValue) return 0;

    // Handle comparison with type safety
    const comparison = (aValue as number | string) < (bValue as number | string) ? -1 : 1;
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const getAlignClass = (align?: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return 'text-left';
    }
  };

  return (
    <div
      className={cn(
        'overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700',
        className
      )}
    >
      <table className="w-full">
        <thead
          className={cn(
            'bg-gray-50 dark:bg-dark-tertiary border-b border-gray-200 dark:border-gray-700',
            stickyHeader && 'sticky top-0 z-10'
          )}
        >
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'px-4 py-3 text-xs font-semibold uppercase tracking-wider',
                  'text-gray-700 dark:text-gray-300',
                  getAlignClass(column.align),
                  column.sortable &&
                    'cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-dark-elevated',
                  column.className
                )}
                onClick={() => handleSort(column.key, column.sortable)}
              >
                <div className="flex items-center gap-1">
                  <span>{column.header}</span>
                  {column.sortable && (
                    <span className="text-gray-400">
                      {sortColumn === column.key ? (
                        sortDirection === 'asc' ? (
                          '↑'
                        ) : (
                          '↓'
                        )
                      ) : (
                        <span className="opacity-50">↕</span>
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-dark-secondary">
          {sortedData.map((row, rowIndex) => (
            <tr
              key={keyExtractor(row)}
              className={cn(
                'transition-colors',
                onRowClick && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-tertiary',
                striped && rowIndex % 2 === 1 && 'bg-gray-50/50 dark:bg-dark-tertiary/50'
              )}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    'px-4 py-3 text-sm',
                    'text-gray-900 dark:text-white',
                    getAlignClass(column.align),
                    column.className
                  )}
                >
                  {column.render ? column.render(row) : (row[column.key] as ReactNode)}
                </td>
              ))}
            </tr>
          ))}
          {sortedData.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
              >
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// Helper component for signal badges in tables
export function SignalBadge({ signal }: { signal: string }) {
  const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
    STRONG_BUY: 'default',
    BUY: 'default',
    HOLD: 'secondary',
    SELL: 'outline',
    STRONG_SELL: 'outline',
  };

  return <Badge variant={variants[signal] || 'secondary'}>{signal.replace('_', ' ')}</Badge>;
}
