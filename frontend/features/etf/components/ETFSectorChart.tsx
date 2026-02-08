'use client';

import { useMemo } from 'react';
import { PieChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import type { ETFSectorAllocationEntry } from '@/contracts';

interface ETFSectorChartProps {
  sectors: ETFSectorAllocationEntry[];
  className?: string;
}

const BAR_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-fuchsia-500',
  'bg-lime-500',
  'bg-orange-500',
  'bg-teal-500',
];

export function ETFSectorChart({ sectors, className }: ETFSectorChartProps) {
  const sortedSectors = useMemo(() => [...sectors].sort((a, b) => b.weight - a.weight), [sectors]);

  if (sectors.length === 0) {
    return (
      <EmptyState
        icon={PieChart}
        title="No Sector Data"
        description="Sector allocation data is not available for this ETF."
      />
    );
  }

  const maxWeight = sortedSectors[0]?.weight ?? 100;

  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Sector Allocation</h3>
      <div className="space-y-2">
        {sortedSectors.map((sector, index) => (
          <div key={sector.sector} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span
                data-testid="sector-name"
                className="font-medium text-slate-700 dark:text-slate-300"
              >
                {sector.sector}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {sector.holdingCount} holdings
                </span>
                <span className="font-semibold text-slate-900 dark:text-white w-16 text-right">
                  {sector.weight.toFixed(2)}%
                </span>
              </div>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  BAR_COLORS[index % BAR_COLORS.length]
                )}
                style={{ width: `${(sector.weight / maxWeight) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
