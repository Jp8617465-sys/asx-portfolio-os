'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import ThemeToggle from '../ThemeToggle';

export interface InternalLayoutProps {
  children: ReactNode;
  title?: string;
  navigation?: ReactNode;
  statusIndicators?: ReactNode;
}

export function InternalLayout({
  children,
  title,
  navigation,
  statusIndicators,
}: InternalLayoutProps) {
  return (
    <div className="min-h-screen bg-dark-primary" data-dashboard="internal">
      {/* Technical Header */}
      <header className="bg-dark-secondary border-b border-gray-700">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Title and Navigation */}
            <div className="flex items-center gap-8">
              <h1 className="text-lg font-mono font-bold text-white">
                {title || 'INTERNAL DASHBOARD'}
              </h1>
              {navigation && (
                <nav className="hidden md:flex items-center gap-4 font-mono text-sm">
                  {navigation}
                </nav>
              )}
            </div>

            {/* Status and Controls */}
            <div className="flex items-center gap-4">
              {statusIndicators}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">{children}</main>
    </div>
  );
}

// System Status Indicator Component
interface SystemStatusProps {
  status: 'healthy' | 'degraded' | 'down';
  label?: string;
}

export function SystemStatus({ status, label = 'System' }: SystemStatusProps) {
  const statusConfig = {
    healthy: {
      color: 'bg-system-healthy',
      text: 'text-system-healthy',
      label: 'HEALTHY',
    },
    degraded: {
      color: 'bg-system-degraded',
      text: 'text-system-degraded',
      label: 'DEGRADED',
    },
    down: {
      color: 'bg-system-down',
      text: 'text-system-down',
      label: 'DOWN',
    },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2 font-mono text-xs">
      <div className={cn('h-2 w-2 rounded-full', config.color)} />
      <span className="text-gray-400">{label}:</span>
      <span className={config.text}>{config.label}</span>
    </div>
  );
}

// Navigation Link Component
interface NavLinkProps {
  href: string;
  active?: boolean;
  children: ReactNode;
}

export function InternalNavLink({ href, active, children }: NavLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        'px-3 py-1 rounded transition-colors',
        active
          ? 'bg-accent-subtle text-accent-primary'
          : 'text-gray-400 hover:text-white hover:bg-dark-tertiary'
      )}
    >
      {children}
    </a>
  );
}
