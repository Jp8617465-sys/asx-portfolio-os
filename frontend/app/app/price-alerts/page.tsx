'use client';

import React from 'react';
import { PriceAlertsPage } from '@/features/alerts';
import Header from '@/components/header';
import Footer from '@/components/footer';

export default function PriceAlertsPageRoute() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Header />
      <div className="max-w-7xl mx-auto p-6">
        <PriceAlertsPage />
      </div>
      <Footer />
    </div>
  );
}
