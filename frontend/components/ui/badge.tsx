import { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-accentSoft text-accent dark:bg-accent-subtle dark:text-accent-primary',
  secondary: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
  outline: 'border border-slate-200 text-slate-500 dark:border-white/10 dark:text-slate-300',
  success: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  error: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
  neutral: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-xs',
  lg: 'px-4 py-1.5 text-sm',
};

export function Badge({ variant = 'default', size = 'md', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    />
  );
}

export type { BadgeProps, BadgeVariant, BadgeSize };
