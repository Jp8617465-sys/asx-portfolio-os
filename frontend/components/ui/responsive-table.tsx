/**
 * Responsive table wrapper that provides horizontal scrolling on mobile
 * and proper overflow handling
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveTableProps {
  children: ReactNode;
  className?: string;
}

export function ResponsiveTable({ children, className }: ResponsiveTableProps) {
  return (
    <div className={cn('overflow-x-auto -mx-4 sm:mx-0', className)}>
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

interface MobileCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * Card layout for displaying table data on mobile devices
 */
export function MobileCard({ children, className, onClick }: MobileCardProps) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3',
        onClick && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}

interface MobileCardRowProps {
  label: string;
  value: ReactNode;
  className?: string;
}

export function MobileCardRow({ label, value, className }: MobileCardRowProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">{label}</span>
      <div className="text-sm text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}
