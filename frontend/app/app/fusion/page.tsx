import FusionDashboard from '@/components/FusionDashboard';

export const metadata = {
  title: 'Portfolio Fusion - ASX Portfolio OS',
  description: 'Unified multi-asset portfolio view across equities, property, and loans',
};

export default function FusionPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Portfolio Fusion
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Unified view of your complete financial portfolio across all asset classes
        </p>
      </div>

      <FusionDashboard />
    </div>
  );
}
