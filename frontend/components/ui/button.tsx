import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { LoadingSpinner } from './loading-spinner';

type ButtonVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | 'signal-buy'
  | 'signal-sell'
  | 'signal-hold';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  default:
    'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 active:scale-95',
  primary:
    'bg-accent text-white hover:bg-accent/90 dark:bg-accent-primary dark:hover:bg-accent-hover active:scale-95',
  secondary:
    'bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 active:scale-95',
  outline:
    'border border-slate-200 text-slate-700 hover:border-slate-300 dark:border-white/10 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 active:scale-95',
  ghost:
    'bg-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10 active:scale-95',
  destructive:
    'bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 active:scale-95',
  'signal-buy':
    'bg-signal-buy text-white hover:bg-signal-buy/90 dark:bg-signal-dark-buy dark:hover:bg-signal-dark-buy/90 active:scale-95',
  'signal-sell':
    'bg-signal-sell text-white hover:bg-signal-sell/90 dark:bg-signal-dark-sell dark:hover:bg-signal-dark-sell/90 active:scale-95',
  'signal-hold':
    'bg-signal-hold text-white hover:bg-signal-hold/90 dark:bg-signal-dark-hold dark:hover:bg-signal-dark-hold/90 active:scale-95',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs h-8',
  md: 'px-4 py-2 text-sm h-10',
  lg: 'px-5 py-2.5 text-base h-12',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      isLoading = false,
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none',
        'select-none touch-manipulation',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      aria-disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <LoadingSpinner size="sm" className="!h-4 !w-4" />}
      <span className={cn(isLoading && 'opacity-70')}>{children}</span>
    </button>
  )
);

Button.displayName = 'Button';

export { Button };
export type { ButtonProps, ButtonVariant, ButtonSize };
