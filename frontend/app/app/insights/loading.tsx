export default function InsightsLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="h-8 w-28 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          <div className="h-4 w-72 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mt-2" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 h-80 animate-pulse" />
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 h-80 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
