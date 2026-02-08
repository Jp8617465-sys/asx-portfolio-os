import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AlertHistoryEntry, AlertType } from '@/contracts';

const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  PRICE_ABOVE: 'Price Above',
  PRICE_BELOW: 'Price Below',
  SIGNAL_CHANGE: 'Signal Change',
  VOLUME_SPIKE: 'Volume Spike',
};

function formatPrice(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface AlertHistoryTableProps {
  history: AlertHistoryEntry[];
}

export function AlertHistoryTable({ history }: AlertHistoryTableProps) {
  if (history.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        No alert history yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-slate-700">
            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Symbol</th>
            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Type</th>
            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Threshold</th>
            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
              Price at Trigger
            </th>
            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Triggered At</th>
            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Notification</th>
          </tr>
        </thead>
        <tbody>
          {history.map((entry) => (
            <tr
              key={entry.id}
              className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50"
            >
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                {entry.symbol}
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                {ALERT_TYPE_LABELS[entry.alertType]}
              </td>
              <td className="px-4 py-3 text-gray-900 dark:text-white">
                {formatPrice(entry.threshold)}
              </td>
              <td className="px-4 py-3 text-gray-900 dark:text-white">
                {formatPrice(entry.priceAtTrigger)}
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                {formatDate(entry.triggeredAt)}
              </td>
              <td className="px-4 py-3">
                {entry.notificationSent ? (
                  <span
                    aria-label="Notification sent"
                    className="inline-flex items-center text-green-600"
                  >
                    <Check className="h-4 w-4" />
                  </span>
                ) : (
                  <span
                    aria-label="Notification not sent"
                    className="inline-flex items-center text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
