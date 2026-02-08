import { Edit, Trash2, Bell } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Alert, AlertStatus, AlertType } from '@/contracts';

const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  PRICE_ABOVE: 'Price Above',
  PRICE_BELOW: 'Price Below',
  SIGNAL_CHANGE: 'Signal Change',
  VOLUME_SPIKE: 'Volume Spike',
};

const STATUS_COLORS: Record<AlertStatus, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  triggered: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  disabled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  expired: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

function formatPrice(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface AlertCardProps {
  alert: Alert;
  onEdit: (alert: Alert) => void;
  onDelete: (id: number) => void;
}

export function AlertCard({ alert, onEdit, onDelete }: AlertCardProps) {
  return (
    <Card className="relative">
      <CardContent>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {alert.symbol}
              </h3>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                  STATUS_COLORS[alert.status]
                )}
              >
                {alert.status}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {ALERT_TYPE_LABELS[alert.alertType]}
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {formatPrice(alert.threshold)}
            </p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => onEdit(alert)} aria-label="Edit alert">
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(alert.id)}
              aria-label="Delete alert"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Bell className="h-3 w-3" />
            <span>{alert.notificationChannel}</span>
          </div>
          <span>Created {formatDate(alert.createdAt)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
