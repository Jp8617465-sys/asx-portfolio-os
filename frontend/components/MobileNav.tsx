'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, LayoutGrid, ListChecks, MessageCircle, Settings, Sparkles } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/app/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { href: '/app/models', label: 'Models', icon: Sparkles },
  { href: '/app/jobs', label: 'Jobs', icon: ListChecks },
  { href: '/app/insights', label: 'Insights', icon: Activity },
  { href: '/app/assistant', label: 'Assistant', icon: MessageCircle },
  { href: '/app/settings', label: 'Settings', icon: Settings },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 pb-4 dark:border-white/10 lg:hidden">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
          ASX Portfolio OS
        </p>
        <p className="text-lg font-semibold">Control Deck</p>
      </div>
      <details className="relative">
        <summary className="cursor-pointer rounded-full border border-slate-300/60 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm dark:border-white/10 dark:bg-slate-900 dark:text-slate-200">
          Menu
        </summary>
        <div className="absolute right-0 mt-3 w-52 rounded-2xl border border-slate-200/80 bg-white/95 p-3 text-sm shadow-card dark:border-white/10 dark:bg-slate-900">
          <div className="flex flex-col gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition',
                    isActive
                      ? 'border-slate-200 bg-slate-100 text-ink dark:border-white/10 dark:bg-white/10 dark:text-mist'
                      : 'border-transparent text-ink hover:border-slate-200 hover:bg-slate-100 dark:text-mist dark:hover:border-white/10 dark:hover:bg-white/5'
                  )}
                >
                  <item.icon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="mt-3 border-t border-white/10 pt-3">
            <ThemeToggle />
          </div>
        </div>
      </details>
    </div>
  );
}
