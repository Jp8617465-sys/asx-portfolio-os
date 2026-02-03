import { cn } from '@/lib/utils';

export type SignalType = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';

export interface StockCardProps {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  signal: SignalType;
  confidence: number;
  expectedReturn: number;
  onClick?: () => void;
  className?: string;
}

const signalConfig: Record<
  SignalType,
  { label: string; borderColor: string; bgColor: string; textColor: string }
> = {
  STRONG_BUY: {
    label: 'Strong Buy',
    borderColor: 'border-signal-strong-buy dark:border-signal-dark-strong-buy',
    bgColor: 'bg-green-50 dark:bg-green-950/20',
    textColor: 'text-signal-strong-buy dark:text-signal-dark-strong-buy',
  },
  BUY: {
    label: 'Buy',
    borderColor: 'border-signal-buy dark:border-signal-dark-buy',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    textColor: 'text-signal-buy dark:text-signal-dark-buy',
  },
  HOLD: {
    label: 'Hold',
    borderColor: 'border-signal-hold dark:border-signal-dark-hold',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
    textColor: 'text-signal-hold dark:text-signal-dark-hold',
  },
  SELL: {
    label: 'Sell',
    borderColor: 'border-signal-sell dark:border-signal-dark-sell',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    textColor: 'text-signal-sell dark:text-signal-dark-sell',
  },
  STRONG_SELL: {
    label: 'Strong Sell',
    borderColor: 'border-signal-strong-sell dark:border-signal-dark-strong-sell',
    bgColor: 'bg-red-50 dark:bg-red-950/20',
    textColor: 'text-signal-strong-sell dark:text-signal-dark-strong-sell',
  },
};

export function StockCard({
  ticker,
  name,
  price,
  change,
  changePercent,
  signal,
  confidence,
  expectedReturn,
  onClick,
  className,
}: StockCardProps) {
  const config = signalConfig[signal];
  const isPositive = change >= 0;

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-lg border-l-4 bg-white dark:bg-dark-secondary',
        'shadow-md hover:shadow-lg transition-all duration-200',
        'cursor-pointer hover:scale-[1.02]',
        config.borderColor,
        className
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onClick) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Card Content */}
      <div className="p-4">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white tabular-nums">
              {ticker}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">{name}</p>
          </div>
          <div
            className={cn(
              'rounded-full px-3 py-1 text-xs font-semibold',
              config.bgColor,
              config.textColor
            )}
          >
            {config.label}
          </div>
        </div>

        {/* Price Information */}
        <div className="mb-4 space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
              ${price.toFixed(2)}
            </span>
            <span
              className={cn(
                'text-sm font-medium tabular-nums',
                isPositive ? 'text-metric-positive' : 'text-metric-negative'
              )}
            >
              {isPositive ? '+' : ''}
              {change.toFixed(2)} ({isPositive ? '+' : ''}
              {changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 border-t border-gray-200 dark:border-gray-700 pt-3">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Confidence</p>
            <p className="text-base font-semibold text-gray-900 dark:text-white tabular-nums">
              {(confidence * 100).toFixed(0)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Expected Return</p>
            <p
              className={cn(
                'text-base font-semibold tabular-nums',
                expectedReturn >= 0 ? 'text-metric-positive' : 'text-metric-negative'
              )}
            >
              {expectedReturn >= 0 ? '+' : ''}
              {expectedReturn.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Hover indicator */}
      <div className="absolute inset-0 border border-transparent group-hover:border-gray-300 dark:group-hover:border-gray-600 rounded-lg pointer-events-none transition-colors" />
    </div>
  );
}
