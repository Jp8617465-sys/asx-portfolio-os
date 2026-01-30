import PageTransition from '@/components/PageTransition';
import ModelsClient from '@/components/ModelsClient';
import Header from '@/components/header';
import Footer from '@/components/footer';

export default function ModelsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      <PageTransition>
        <ModelsClient />
      </PageTransition>
      <Footer />
    </div>
  );
}
