'use client';

import Link from 'next/link';
import { Activity, LayoutGrid, ListChecks, MessageCircle, Settings, Sparkles } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutGrid },
  { href: '/models', label: 'Models', icon: Sparkles },
  { href: '/jobs', label: 'Jobs', icon: ListChecks },
  { href: '/insights', label: 'Insights', icon: Activity },
  { href: '/assistant', label: 'Assistant', icon: MessageCircle },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="hidden h-full w-64 flex-col gap-6 border-r border-slate-200/70 bg-white/80 p-6 backdrop-blur dark:border-white/10 dark:bg-slate-900/60 lg:flex">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
          ASX Portfolio OS
        </p>
        <h1 className="text-2xl font-semibold">Control Deck</h1>
      </div>
      <nav className="flex flex-col gap-3">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-xl border border-transparent px-4 py-2 text-sm font-medium text-ink transition hover:border-slate-200 hover:bg-slate-100 dark:text-mist dark:hover:border-white/10 dark:hover:bg-white/5"
          >
            <item.icon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto rounded-2xl border border-slate-200/80 bg-slate-50 p-4 text-sm text-ink dark:border-white/10 dark:bg-white/5 dark:text-mist">
        <p className="font-semibold">Live Status</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">Render API + Supabase</p>
      </div>
      <ThemeToggle />
    </aside>
  );
}
