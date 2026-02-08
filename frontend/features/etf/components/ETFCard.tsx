'use client';

import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import type { ETFSummary } from '@/contracts';

interface ETFCardProps {
  etf: ETFSummary;
  onSelect: (symbol: string) => void;
  className?: string;
}

function formatReturn(value?: number): { text: string; colorClass: string } {
  if (value === undefined || value === null) {
    return { text: '--', colorClass: 'text-slate-400' };
  }
  const prefix = value >= 0 ? '+' : '';
  const text = `${prefix}${value.toFixed(2)}%`;
  const colorClass =
    value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  return { text, colorClass };
}

export function ETFCard({ etf, onSelect, className }: ETFCardProps) {
  const return1w = formatReturn(etf.return1w);
  const return1m = formatReturn(etf.return1m);
  const return3m = formatReturn(etf.return3m);

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600',
        className
      )}
      onClick={() => onSelect(etf.symbol)}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{etf.symbol}</h3>
          {etf.etfName && (
            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1">{etf.etfName}</p>
          )}
        </div>
        {etf.nav !== undefined && etf.nav !== null && (
          <span className="text-lg font-semibold text-slate-900 dark:text-white">
            ${etf.nav.toFixed(2)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">1W</p>
          <p className={cn('text-sm font-medium', return1w.colorClass)}>{return1w.text}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">1M</p>
          <p className={cn('text-sm font-medium', return1m.colorClass)}>{return1m.text}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">3M</p>
          <p className={cn('text-sm font-medium', return3m.colorClass)}>{return3m.text}</p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-3">
        <span className="text-xs text-slate-500 dark:text-slate-400">Holdings</span>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {etf.holdingsCount}
        </span>
      </div>
    </Card>
  );
}
