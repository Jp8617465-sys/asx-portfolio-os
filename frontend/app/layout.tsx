import './globals.css';
import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav';
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
      <body className="min-h-screen bg-paper text-ink dark:bg-graphite dark:text-mist">
        <ErrorBoundary>
          {/* Skip to content link for keyboard / screen reader users */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:shadow-lg"
          >
            Skip to content
          </a>
          <div className="gradient-shell min-h-screen">
            <div className="mx-auto flex min-h-screen max-w-[1440px]">
              <Sidebar />
              <main id="main-content" className="flex-1 px-6 py-10 lg:px-12">
                <MobileNav />
                {children}
              </main>
            </div>
          </div>
          <Toaster />
        </ErrorBoundary>
      </body>
    </html>
  );
}
