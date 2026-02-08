export default function WatchlistLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="h-8 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          <div className="h-4 w-56 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mt-2" />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="px-6 py-4 flex items-center gap-6 border-b border-gray-200 dark:border-gray-700 last:border-0"
            >
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="ml-auto h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
