'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  LayoutGrid,
  ListChecks,
  MessageCircle,
  Settings,
  Sparkles,
  Bookmark,
  Briefcase,
  Bell,
  Search,
  PieChart,
  Wallet,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/app/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { href: '/app/stocks', label: 'Browse Stocks', icon: Search },
  { href: '/app/watchlist', label: 'Watchlist', icon: Bookmark },
  { href: '/app/portfolio', label: 'Portfolio', icon: Briefcase },
  { href: '/app/etfs', label: 'ETFs', icon: PieChart },
  { href: '/app/budgeting', label: 'Budgeting', icon: Wallet },
  { href: '/app/alerts', label: 'Alerts', icon: Bell },
  { href: '/app/models', label: 'Models', icon: Sparkles },
  { href: '/app/jobs', label: 'Jobs', icon: ListChecks },
  { href: '/app/insights', label: 'Insights', icon: Activity },
  { href: '/app/assistant', label: 'Assistant', icon: MessageCircle },
  { href: '/app/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-full w-64 flex-col gap-6 border-r border-slate-200/70 bg-white/80 p-6 backdrop-blur dark:border-white/10 dark:bg-slate-900/60 lg:flex">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
          ASX Portfolio OS
        </p>
        <h1 className="text-2xl font-semibold">Control Deck</h1>
      </div>
      <nav className="flex flex-col gap-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl border px-4 py-2 text-sm font-medium transition',
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
      </nav>
      <div className="mt-auto rounded-2xl border border-slate-200/80 bg-slate-50 p-4 text-sm text-ink dark:border-white/10 dark:bg-white/5 dark:text-mist">
        <p className="font-semibold">Live Status</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">Render API + Supabase</p>
      </div>
      <ThemeToggle />
    </aside>
  );
}
