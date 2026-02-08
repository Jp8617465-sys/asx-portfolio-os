'use client';

import { useETFStore } from '../stores/etf-store';
import { ETFListPage } from './ETFListPage';
import { ETFDetailPage } from './ETFDetailPage';
import { ETFBreadcrumb } from './ETFBreadcrumb';

export function ETFPage() {
  const { selectedETF, drillDownPath, selectETF, navigateBack, navigateToHome } = useETFStore();

  const handleNavigate = (index: number) => {
    if (index === 0) {
      navigateToHome();
    } else {
      // Navigate back to the ETF list level
      navigateToHome();
    }
  };

  const handleSelectETF = (symbol: string) => {
    selectETF(symbol);
  };

  return (
    <div className="space-y-4">
      {drillDownPath.length > 0 && (
        <ETFBreadcrumb path={drillDownPath} onNavigate={handleNavigate} />
      )}

      {selectedETF ? (
        <ETFDetailPage symbol={selectedETF} />
      ) : (
        <ETFListPage onSelectETF={handleSelectETF} />
      )}
    </div>
  );
}
