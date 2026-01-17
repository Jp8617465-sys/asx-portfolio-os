import './globals.css';
import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav';
import Toaster from '../components/ui/toaster';

export const metadata = {
  title: 'ASX Portfolio OS',
  description: 'AI-driven portfolio and model management platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-paper text-ink dark:bg-graphite dark:text-mist">
        <div className="gradient-shell min-h-screen">
          <div className="mx-auto flex min-h-screen max-w-[1440px]">
            <Sidebar />
            <main className="flex-1 px-6 py-10 lg:px-12">
              <MobileNav />
              {children}
            </main>
          </div>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
