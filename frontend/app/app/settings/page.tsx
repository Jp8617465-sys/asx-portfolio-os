import PageTransition from '@/components/PageTransition';
import Topbar from '@/components/Topbar';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SettingsStatus from '@/components/SettingsStatus';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      <PageTransition>
        <div className="flex flex-col gap-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Topbar
            title="Settings"
            subtitle="Confirm environment configuration and verify the backend connection."
            eyebrow="System"
          />

          <section className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Environment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-center justify-between">
                  <span>API Base URL</span>
                  <span className="font-semibold text-ink dark:text-mist">
                    {process.env.NEXT_PUBLIC_API_URL || 'Not set'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Data Mode</span>
                  <Badge variant="secondary">Sample (&lt;=50 tickers)</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Supabase (Phase 3)</span>
                  <Badge variant="secondary">Planned</Badge>
                </div>
                <p className="text-xs text-slate-500">
                  Fundamentals ingestion is capped while EODHD stabilizes. Add API keys and Supabase
                  auth once Phase 3 is activated.
                </p>
              </CardContent>
            </Card>

            <SettingsStatus />
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <p>
                Backend Health:{' '}
                <a
                  className="text-accent underline"
                  href="https://asx-portfolio-os.onrender.com/health"
                  target="_blank"
                  rel="noreferrer"
                >
                  Render Health Check
                </a>
              </p>
              <p>
                API Docs:{' '}
                <a
                  className="text-accent underline"
                  href="https://asx-portfolio-os.onrender.com/docs"
                  target="_blank"
                  rel="noreferrer"
                >
                  OpenAPI Docs
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
      <Footer />
    </div>
  );
}
