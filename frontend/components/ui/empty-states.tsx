/**
 * Pre-configured empty state components for common scenarios
 */

import {
  Briefcase,
  Search,
  Bookmark,
  TrendingUp,
  FileText,
  AlertCircle,
  Upload,
  BarChart3,
} from 'lucide-react';
import { EmptyState, EmptyStateCard } from './empty-state';

interface EmptyStatesProps {
  onAction?: () => void;
  onSecondaryAction?: () => void;
}

export function NoPortfolioState({ onAction }: EmptyStatesProps) {
  return (
    <EmptyStateCard
      icon={Briefcase}
      title="No Portfolio Found"
      description="Get started by uploading your portfolio. We'll analyze your holdings and provide AI-powered insights."
      action={
        onAction
          ? {
              label: 'Upload Portfolio',
              onClick: onAction,
              variant: 'default',
            }
          : undefined
      }
    />
  );
}

export function NoWatchlistState({ onAction }: EmptyStatesProps) {
  return (
    <EmptyStateCard
      icon={Bookmark}
      title="Your Watchlist is Empty"
      description="Start tracking stocks by adding them to your watchlist. Search for stocks and add them to stay updated on their signals."
      action={
        onAction
          ? {
              label: 'Search Stocks',
              onClick: onAction,
            }
          : undefined
      }
    />
  );
}

export function NoSearchResultsState({ searchTerm }: { searchTerm?: string }) {
  return (
    <EmptyState
      icon={Search}
      title="No Results Found"
      description={
        searchTerm
          ? `No stocks found matching "${searchTerm}". Try adjusting your search term.`
          : 'Try a different search term or filter.'
      }
    />
  );
}

export function NoSignalsState({ onAction }: EmptyStatesProps) {
  return (
    <EmptyState
      icon={TrendingUp}
      title="No Signals Available"
      description="There are currently no signals available for this stock. Check back later or try another stock."
      action={
        onAction
          ? {
              label: 'Browse Stocks',
              onClick: onAction,
            }
          : undefined
      }
    />
  );
}

export function NoDataState({ title, description }: { title?: string; description?: string }) {
  return (
    <EmptyState
      icon={BarChart3}
      title={title || 'No Data Available'}
      description={description || 'There is no data to display at this time.'}
    />
  );
}

export function NoHoldingsState() {
  return (
    <EmptyState
      icon={Briefcase}
      title="No Holdings Found"
      description="Your portfolio doesn't have any holdings yet. Upload a portfolio file to get started."
    />
  );
}

export function UploadRequiredState({ onAction }: EmptyStatesProps) {
  return (
    <EmptyStateCard
      icon={Upload}
      title="Upload Required"
      description="To see this information, you need to upload your portfolio first."
      action={
        onAction
          ? {
              label: 'Upload Now',
              onClick: onAction,
            }
          : undefined
      }
    />
  );
}

export function NoNotificationsState() {
  return (
    <EmptyState
      icon={AlertCircle}
      title="No Notifications"
      description="You're all caught up! We'll notify you when there are important updates."
    />
  );
}

export function NoReportsState({ onAction }: EmptyStatesProps) {
  return (
    <EmptyState
      icon={FileText}
      title="No Reports Available"
      description="Generate your first report to see detailed portfolio insights and analysis."
      action={
        onAction
          ? {
              label: 'Generate Report',
              onClick: onAction,
            }
          : undefined
      }
    />
  );
}
