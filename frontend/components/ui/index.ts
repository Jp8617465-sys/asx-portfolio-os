/**
 * ASX Portfolio OS - UI Components Index
 *
 * Central export point for all design system components
 */

// Core UI Components
export { Badge } from './badge';
export type { BadgeProps, BadgeVariant, BadgeSize } from './badge';

export { Button } from './button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './button';

export { Card, CardHeader, CardTitle, CardContent, CardFooter } from './card';

export { Input } from './Input';
export type { InputProps } from './Input';

export { StockCard } from './StockCard';
export type { StockCardProps, SignalType } from './StockCard';

export { ModelMetricCard } from './ModelMetricCard';
export type { ModelMetricCardProps, MetricFormat } from './ModelMetricCard';

export { DataTable, SignalBadge } from './DataTable';
export type { DataTableProps, Column, SortDirection } from './DataTable';

// Toast System
export { default as Toaster } from './toaster';
export { useToast } from './use-toast';

// Table Components
export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

// Dropdown Menu
export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from './dropdown-menu';

// Skeleton
export { Skeleton } from './skeleton';

// Chart Components
export { ChartContainer } from './chart';

// Loading States
export { LoadingSpinner, PageLoader, InlineLoader } from './loading-spinner';
export {
  TableSkeleton,
  CardSkeleton,
  StatsCardSkeleton,
  ChartSkeleton,
  StockDetailSkeleton,
  PortfolioSkeleton,
  DashboardSkeleton,
} from './skeleton-loaders';

// Empty States
export { EmptyState, EmptyStateCard } from './empty-state';
export {
  NoPortfolioState,
  NoWatchlistState,
  NoSearchResultsState,
  NoSignalsState,
  NoDataState,
  NoHoldingsState,
  UploadRequiredState,
  NoNotificationsState,
  NoReportsState,
} from './empty-states';

// Error Handling
export { ErrorAlert, InlineError } from './error-alert';

// Responsive Tables
export { ResponsiveTable, MobileCard, MobileCardRow } from './responsive-table';
