import Header from '@/components/header';
import Footer from '@/components/footer';
import DashboardClient from './DashboardClient';
import { getSignalsLive } from '@/lib/api';

export const metadata = {
  title: 'Dashboard | ASX Portfolio OS',
  description: 'Real-time AI-powered stock signals from the Model A machine learning model',
};

// Revalidate every 60 seconds via ISR
export const revalidate = 60;

export default async function DashboardPage() {
  // Server-side fetch – user sees data on first paint, no loading spinner
  let initialData: { signals: any[]; as_of: string } | null = null;

  try {
    const data = await getSignalsLive('model_a_ml', 100, {
      next: { revalidate: 60 },
    });
    initialData = {
      signals: data.signals || [],
      as_of: data.as_of || new Date().toISOString(),
    };
  } catch (err) {
    // If server fetch fails, client will retry via SWR
    console.error('Server-side signal fetch failed:', err);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Model A Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time AI-powered stock signals from our machine learning model
          </p>
        </div>

        <DashboardClient initialData={initialData} />
      </main>

      <Footer />
    </div>
  );
}
