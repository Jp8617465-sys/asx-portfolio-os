import PageTransition from '@/components/PageTransition';
import AssistantClient from '@/components/AssistantClient';
import Header from '@/components/header';
import Footer from '@/components/footer';

export default function AssistantPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      <PageTransition>
        <AssistantClient />
      </PageTransition>
      <Footer />
    </div>
  );
}
