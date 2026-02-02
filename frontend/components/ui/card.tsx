import { ReactNode, HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200/70 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/70',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: CardProps) {
  return <div className={cn('mb-4', className)}>{children}</div>;
}

export function CardTitle({ children, className = '' }: CardProps) {
  return <h3 className={cn('text-lg font-semibold', className)}>{children}</h3>;
}

export function CardContent({ children, className = '' }: CardProps) {
  return <div className={className}>{children}</div>;
}

export function CardDescription({ children, className = '' }: CardProps) {
  return <p className={cn('text-sm text-slate-600 dark:text-slate-400', className)}>{children}</p>;
}

export function CardFooter({ children, className = '' }: CardProps) {
  return (
    <div className={cn('mt-4 pt-4 border-t border-slate-200 dark:border-slate-800', className)}>
      {children}
    </div>
  );
}
