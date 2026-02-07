'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  Menu,
  X,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/app/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { href: '/app/watchlist', label: 'Watchlist', icon: Bookmark },
  { href: '/app/portfolio', label: 'Portfolio', icon: Briefcase },
  { href: '/app/alerts', label: 'Alerts', icon: Bell },
  { href: '/app/models', label: 'Models', icon: Sparkles },
  { href: '/app/jobs', label: 'Jobs', icon: ListChecks },
  { href: '/app/insights', label: 'Insights', icon: Activity },
  { href: '/app/assistant', label: 'Assistant', icon: MessageCircle },
  { href: '/app/settings', label: 'Settings', icon: Settings },
];

export default function MobileNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 pb-4 dark:border-white/10 lg:hidden">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
          ASX Portfolio OS
        </p>
        <p className="text-lg font-semibold">Control Deck</p>
      </div>

      <div className="relative">
        <button
          ref={buttonRef}
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
          className="cursor-pointer rounded-full border border-slate-300/60 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
        >
          {isOpen ? (
            <X className="h-4 w-4 inline-block mr-1" />
          ) : (
            <Menu className="h-4 w-4 inline-block mr-1" />
          )}
          Menu
        </button>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
              aria-hidden="true"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu panel */}
            <nav
              ref={menuRef}
              role="navigation"
              aria-label="Mobile navigation"
              className="absolute right-0 mt-3 w-52 rounded-2xl border border-slate-200/80 bg-white/95 p-3 text-sm shadow-card dark:border-white/10 dark:bg-slate-900 z-50"
            >
              <div className="flex flex-col gap-2">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? 'page' : undefined}
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
            </nav>
          </>
        )}
      </div>
    </div>
  );
}
