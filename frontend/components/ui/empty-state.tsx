import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}
    >
      <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-4 mb-4">
        <Icon className="h-12 w-12 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>

      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mb-6">{description}</p>
      )}

      {children}

      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-4">
          {action && (
            <Button onClick={action.onClick} variant={action.variant || 'default'}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button onClick={secondaryAction.onClick} variant="outline">
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function EmptyStateCard({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  children,
}: EmptyStateProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      <EmptyState
        icon={Icon}
        title={title}
        description={description}
        action={action}
        secondaryAction={secondaryAction}
      >
        {children}
      </EmptyState>
    </div>
  );
}
