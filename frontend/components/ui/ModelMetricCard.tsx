import { cn } from '@/lib/utils';

export type MetricFormat = 'percentage' | 'decimal' | 'integer';

export interface ModelMetricCardProps {
  label: string;
  value: number;
  subtitle?: string;
  format?: MetricFormat;
  threshold?: {
    excellent: number;
    good: number;
    acceptable: number;
  };
  className?: string;
}

function formatValue(value: number, format: MetricFormat): string {
  switch (format) {
    case 'percentage':
      return `${(value * 100).toFixed(2)}%`;
    case 'decimal':
      return value.toFixed(4);
    case 'integer':
      return Math.round(value).toString();
    default:
      return value.toString();
  }
}

function getPerformanceColor(value: number, threshold?: ModelMetricCardProps['threshold']): string {
  if (!threshold) return 'text-gray-900 dark:text-white';

  if (value >= threshold.excellent) return 'text-model-excellent';
  if (value >= threshold.good) return 'text-model-good';
  if (value >= threshold.acceptable) return 'text-model-acceptable';
  return 'text-model-poor';
}

function getPerformanceBg(value: number, threshold?: ModelMetricCardProps['threshold']): string {
  if (!threshold) return 'bg-gray-100 dark:bg-gray-800';

  if (value >= threshold.excellent) return 'bg-green-100 dark:bg-green-950/30';
  if (value >= threshold.good) return 'bg-green-50 dark:bg-green-900/20';
  if (value >= threshold.acceptable) return 'bg-amber-50 dark:bg-amber-900/20';
  return 'bg-red-50 dark:bg-red-900/20';
}

export function ModelMetricCard({
  label,
  value,
  subtitle,
  format = 'decimal',
  threshold,
  className,
}: ModelMetricCardProps) {
  const formattedValue = formatValue(value, format);
  const colorClass = getPerformanceColor(value, threshold);
  const bgClass = getPerformanceBg(value, threshold);

  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 dark:border-gray-700',
        'bg-white dark:bg-dark-secondary',
        'p-4 transition-all duration-200',
        'hover:shadow-md',
        className
      )}
    >
      {/* Label */}
      <div className="mb-2">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {label}
        </p>
      </div>

      {/* Value */}
      <div className={cn('mb-1 rounded-md px-2 py-1 inline-block', bgClass)}>
        <p className={cn('text-2xl font-bold font-mono tabular-nums', colorClass)}>
          {formattedValue}
        </p>
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 font-mono">{subtitle}</p>
      )}
    </div>
  );
}
