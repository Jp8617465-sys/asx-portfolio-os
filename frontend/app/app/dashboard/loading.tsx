export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          <div className="h-4 w-80 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mt-2" />
        </div>

        {/* Stats cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Filter bar skeleton */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-4">
            <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Table skeleton */}
        <div className="mb-8">
          <div className="h-6 w-36 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-4" />
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Table header */}
            <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex gap-8">
              {['w-12', 'w-20', 'w-16', 'w-32', 'w-24'].map((width, i) => (
                <div
                  key={i}
                  className={`h-4 ${width} bg-gray-200 dark:bg-gray-700 rounded animate-pulse`}
                />
              ))}
            </div>
            {/* Table rows */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="px-6 py-4 flex gap-8 border-b border-gray-200 dark:border-gray-700 last:border-0"
              >
                <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
