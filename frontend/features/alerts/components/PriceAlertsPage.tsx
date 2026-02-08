'use client';

import { Plus, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorAlert } from '@/components/ui/error-alert';
import { EmptyState } from '@/components/ui/empty-state';
import { useAlerts, useAlertHistory, useAlertActions } from '../hooks/useAlerts';
import { useAlertStore } from '../stores/alert-store';
import { AlertCard } from './AlertCard';
import { CreateAlertModal } from './CreateAlertModal';
import { AlertHistoryTable } from './AlertHistoryTable';

export function PriceAlertsPage() {
  const { alerts, error, isLoading, mutate } = useAlerts();
  const { history } = useAlertHistory();
  const actions = useAlertActions();
  const store = useAlertStore();

  const handleCreate = async (payload: Parameters<typeof actions.create>[0]) => {
    await actions.create(payload);
    store.closeCreateModal();
  };

  const handleEdit = (alert: Parameters<typeof store.openEditModal>[0]) => {
    store.openEditModal(alert);
  };

  const handleDelete = async (id: number) => {
    await actions.remove(id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" label="Loading alerts..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8">
        <ErrorAlert message="Failed to load alerts. Please try again." onRetry={() => mutate()} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Price Alerts</h1>
        <Button onClick={() => store.openCreateModal()}>
          <Plus className="mr-2 h-4 w-4" />
          Create Alert
        </Button>
      </div>

      {alerts.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No alerts yet"
          description="Create a price alert to get notified when a stock hits your target price."
          action={{
            label: 'Create Alert',
            onClick: () => store.openCreateModal(),
          }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <div>
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Alert History</h2>
        <Card>
          <AlertHistoryTable history={history} />
        </Card>
      </div>

      <CreateAlertModal
        isOpen={store.isCreateModalOpen}
        onClose={store.closeCreateModal}
        onSubmit={handleCreate}
        initialSymbol={store.selectedSymbol}
      />
    </div>
  );
}
