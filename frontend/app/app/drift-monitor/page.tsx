import DriftMonitoringDashboard from '@/components/DriftMonitoringDashboard';

export const metadata = {
  title: 'Drift Monitoring - ASX Portfolio OS',
  description: 'Monitor model drift and feature stability',
};

export default function DriftMonitorPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Model Drift Monitoring
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Track Population Stability Index (PSI) and feature drift to ensure model performance remains optimal
        </p>
      </div>

      <DriftMonitoringDashboard />
    </div>
  );
}
