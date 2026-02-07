export default function StockDetailLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button skeleton */}
        <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-6" />

        {/* Stock header skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
              </div>
              <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1" />
              </div>
              <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>

        {/* Main content grid skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Gauge */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 flex items-center justify-center">
              <div className="w-[180px] h-[180px] rounded-full border-[12px] border-gray-200 dark:border-gray-700 animate-pulse" />
            </div>
          </div>
          {/* Chart */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
              <div className="flex gap-1 mb-3">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-8 w-10 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse"
                  />
                ))}
              </div>
              <div className="h-[350px] bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Tabs skeleton */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
          <div className="flex space-x-8">
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse py-4" />
            <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse py-4" />
          </div>
        </div>

        {/* Tab content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-64 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse" />
          <div className="h-64 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
