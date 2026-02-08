'use client';

import { BarChart3 } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorAlert } from '@/components/ui/error-alert';
import { EmptyState } from '@/components/ui/empty-state';
import { useETFList } from '../hooks/useETFs';
import { ETFCard } from './ETFCard';

interface ETFListPageProps {
  onSelectETF: (symbol: string) => void;
}

export function ETFListPage({ onSelectETF }: ETFListPageProps) {
  const { data, error, isLoading, mutate } = useETFList();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" label="Loading ETFs..." />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorAlert
        title="Failed to load ETFs"
        message={error.message || 'An unexpected error occurred'}
        onRetry={() => mutate()}
      />
    );
  }

  if (!data || data.etfs.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No ETFs Found"
        description="There are no ETFs available at this time."
      />
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">ETF Explorer</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          {data.count} ETFs available
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.etfs.map((etf) => (
          <ETFCard key={etf.symbol} etf={etf} onSelect={onSelectETF} />
        ))}
      </div>
    </div>
  );
}
