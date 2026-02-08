'use client';

import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function StockDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center justify-center py-24">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-8 max-w-lg w-full text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">
              Stock data failed to load
            </h2>
            <p className="text-sm text-red-600 dark:text-red-300 mb-6">
              {error.message || 'An unexpected error occurred while loading stock data.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Go back
              </button>
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
