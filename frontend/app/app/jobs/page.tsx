import PageTransition from '@/components/PageTransition';
import JobsClient from '@/components/JobsClient';
import Header from '@/components/header';
import Footer from '@/components/footer';

export default function JobsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      <PageTransition>
        <JobsClient />
      </PageTransition>
      <Footer />
    </div>
  );
}
