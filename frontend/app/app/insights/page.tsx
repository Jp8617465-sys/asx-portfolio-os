import PageTransition from '@/components/PageTransition';
import InsightsClient from '@/components/InsightsClient';
import Header from '@/components/header';
import Footer from '@/components/footer';

export default function InsightsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      <PageTransition>
        <InsightsClient />
      </PageTransition>
      <Footer />
    </div>
  );
}
