'use client';

import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorAlert } from '@/components/ui/error-alert';
import { useETFHoldings, useSectorAllocation } from '../hooks/useETFs';
import { ETFSectorChart } from './ETFSectorChart';
import { HoldingsTable } from './HoldingsTable';

interface ETFDetailPageProps {
  symbol: string;
}

export function ETFDetailPage({ symbol }: ETFDetailPageProps) {
  const {
    data: holdingsData,
    error: holdingsError,
    isLoading: holdingsLoading,
    mutate: mutateHoldings,
  } = useETFHoldings(symbol, true);

  const {
    data: sectorsData,
    error: sectorsError,
    isLoading: sectorsLoading,
  } = useSectorAllocation(symbol);

  if (holdingsLoading || sectorsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" label={`Loading ${symbol} details...`} />
      </div>
    );
  }

  if (holdingsError) {
    return (
      <ErrorAlert
        title={`Failed to load ${symbol}`}
        message={holdingsError.message || 'An unexpected error occurred'}
        onRetry={() => mutateHoldings()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{symbol}</h1>
        {holdingsData?.asOfDate && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Data as of {holdingsData.asOfDate}
          </p>
        )}
        {holdingsData && (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {holdingsData.count} holdings
          </p>
        )}
      </div>

      {sectorsData && sectorsData.length > 0 && (
        <Card>
          <ETFSectorChart sectors={sectorsData} />
        </Card>
      )}

      {holdingsData && (
        <Card>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Holdings</h3>
          <HoldingsTable holdings={holdingsData.holdings} />
        </Card>
      )}
    </div>
  );
}
