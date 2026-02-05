import { AlertCircle, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface ErrorAlertProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: 'error' | 'warning';
  className?: string;
}

export function ErrorAlert({
  title = 'Something went wrong',
  message,
  onRetry,
  onDismiss,
  variant = 'error',
  className,
}: ErrorAlertProps) {
  const colors = {
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      icon: 'text-red-600 dark:text-red-400',
      title: 'text-red-900 dark:text-red-100',
      message: 'text-red-700 dark:text-red-300',
      button: 'bg-red-600 hover:bg-red-700',
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      icon: 'text-yellow-600 dark:text-yellow-400',
      title: 'text-yellow-900 dark:text-yellow-100',
      message: 'text-yellow-700 dark:text-yellow-300',
      button: 'bg-yellow-600 hover:bg-yellow-700',
    },
  };

  const color = colors[variant];

  return (
    <div
      className={cn('rounded-lg border p-4', color.bg, color.border, className)}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className={cn('h-5 w-5 flex-shrink-0 mt-0.5', color.icon)} />

        <div className="flex-1 min-w-0">
          <p className={cn('font-semibold mb-1', color.title)}>{title}</p>
          <p className={cn('text-sm', color.message)}>{message}</p>

          {onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              className={cn('mt-3', color.button, 'text-white')}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className={cn(
              'flex-shrink-0 rounded p-1 transition-colors',
              color.icon,
              'hover:bg-black/5 dark:hover:bg-white/5'
            )}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="text-center max-w-md">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400 mb-4">{message}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}
