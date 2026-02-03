import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'signal-buy' | 'signal-sell' | 'signal-hold';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-white hover:bg-accent/90 dark:bg-accent-primary dark:hover:bg-accent-hover',
  outline:
    'border border-slate-200 text-slate-700 hover:border-slate-300 dark:border-white/10 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5',
  ghost:
    'bg-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10',
  'signal-buy':
    'bg-signal-buy text-white hover:bg-signal-buy/90 dark:bg-signal-dark-buy dark:hover:bg-signal-dark-buy/90',
  'signal-sell':
    'bg-signal-sell text-white hover:bg-signal-sell/90 dark:bg-signal-dark-sell dark:hover:bg-signal-dark-sell/90',
  'signal-hold':
    'bg-signal-hold text-white hover:bg-signal-hold/90 dark:bg-signal-dark-hold dark:hover:bg-signal-dark-hold/90',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'rounded-lg font-semibold transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-primary',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    />
  )
);

Button.displayName = 'Button';

export { Button };
export type { ButtonProps, ButtonVariant, ButtonSize };
