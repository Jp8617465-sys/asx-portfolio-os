'use client';

import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ETFBreadcrumbItem } from '@/contracts';

interface ETFBreadcrumbProps {
  path: ETFBreadcrumbItem[];
  onNavigate: (index: number) => void;
  className?: string;
}

export function ETFBreadcrumb({ path, onNavigate, className }: ETFBreadcrumbProps) {
  if (path.length === 0) return null;

  return (
    <nav className={cn('flex items-center gap-1 text-sm', className)} aria-label="Breadcrumb">
      {path.map((item, index) => {
        const isLast = index === path.length - 1;

        return (
          <span key={`${item.type}-${index}`} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-slate-400" data-testid="breadcrumb-separator" />
            )}
            {isLast ? (
              <span className="font-medium text-slate-900 dark:text-white">{item.label}</span>
            ) : (
              <button
                onClick={() => onNavigate(index)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
              >
                {item.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
