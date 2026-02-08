'use client';

import { useState, FormEvent, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AlertType, CreateAlertPayload } from '@/contracts';

const ALERT_TYPES: { value: AlertType; label: string }[] = [
  { value: 'PRICE_ABOVE', label: 'Price Above' },
  { value: 'PRICE_BELOW', label: 'Price Below' },
  { value: 'SIGNAL_CHANGE', label: 'Signal Change' },
  { value: 'VOLUME_SPIKE', label: 'Volume Spike' },
];

const CHANNELS = [
  { value: 'email', label: 'Email' },
  { value: 'push', label: 'Push Notification' },
];

interface CreateAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateAlertPayload) => Promise<void>;
  initialSymbol?: string;
}

export function CreateAlertModal({
  isOpen,
  onClose,
  onSubmit,
  initialSymbol = '',
}: CreateAlertModalProps) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [alertType, setAlertType] = useState<AlertType>('PRICE_ABOVE');
  const [threshold, setThreshold] = useState('');
  const [channel, setChannel] = useState('email');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setSymbol(initialSymbol);
  }, [initialSymbol]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!symbol.trim()) {
      newErrors.symbol = 'Symbol is required';
    }
    if (!threshold || isNaN(Number(threshold)) || Number(threshold) <= 0) {
      newErrors.threshold = 'Valid threshold is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        symbol: symbol.trim(),
        alertType,
        threshold: Number(threshold),
        notificationChannel: channel,
      });
      // Reset form on success
      setSymbol('');
      setThreshold('');
      setAlertType('PRICE_ABOVE');
      setChannel('email');
      setErrors({});
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Alert</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="alert-symbol"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Symbol
            </label>
            <input
              id="alert-symbol"
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="e.g. CBA.AX"
              className={cn(
                'mt-1 block w-full rounded-lg border px-3 py-2 text-sm',
                'bg-white dark:bg-slate-800 dark:text-white',
                'border-gray-300 dark:border-slate-700',
                'focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
                errors.symbol && 'border-red-500'
              )}
            />
            {errors.symbol && <p className="mt-1 text-xs text-red-500">{errors.symbol}</p>}
          </div>

          <div>
            <label
              htmlFor="alert-type"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Alert Type
            </label>
            <select
              id="alert-type"
              value={alertType}
              onChange={(e) => setAlertType(e.target.value as AlertType)}
              className={cn(
                'mt-1 block w-full rounded-lg border px-3 py-2 text-sm',
                'bg-white dark:bg-slate-800 dark:text-white',
                'border-gray-300 dark:border-slate-700',
                'focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
              )}
            >
              {ALERT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="alert-threshold"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Threshold
            </label>
            <input
              id="alert-threshold"
              type="number"
              step="0.01"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="0.00"
              className={cn(
                'mt-1 block w-full rounded-lg border px-3 py-2 text-sm',
                'bg-white dark:bg-slate-800 dark:text-white',
                'border-gray-300 dark:border-slate-700',
                'focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
                errors.threshold && 'border-red-500'
              )}
            />
            {errors.threshold && <p className="mt-1 text-xs text-red-500">{errors.threshold}</p>}
          </div>

          <div>
            <label
              htmlFor="alert-channel"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Notification Channel
            </label>
            <select
              id="alert-channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className={cn(
                'mt-1 block w-full rounded-lg border px-3 py-2 text-sm',
                'bg-white dark:bg-slate-800 dark:text-white',
                'border-gray-300 dark:border-slate-700',
                'focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
              )}
            >
              {CHANNELS.map((ch) => (
                <option key={ch.value} value={ch.value}>
                  {ch.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Creating...' : 'Create Alert'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
