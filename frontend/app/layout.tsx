import './globals.css';
import Toaster from '../components/ui/toaster';
import { ErrorBoundary } from '../components/ErrorBoundary';

// Initialize Sentry
import '../lib/sentry';

export const metadata = {
  title: 'ASX Portfolio OS',
  description: 'AI-driven portfolio and model management platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white dark:bg-[#0B1121] text-slate-900 dark:text-slate-100">
        <ErrorBoundary>
          {/* Skip to content link for keyboard / screen reader users */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus:shadow-lg"
          >
            Skip to content
          </a>
          <main id="main-content">{children}</main>
          <Toaster />
        </ErrorBoundary>
      </body>
    </html>
  );
}
