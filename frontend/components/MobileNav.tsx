"use client";

import Link from "next/link";
import { Activity, LayoutGrid, ListChecks, Settings, Sparkles } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/models", label: "Models", icon: Sparkles },
  { href: "/jobs", label: "Jobs", icon: ListChecks },
  { href: "/insights", label: "Insights", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings }
];

export default function MobileNav() {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 pb-4 dark:border-white/10 lg:hidden">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">ASX Portfolio OS</p>
        <p className="text-lg font-semibold">Control Deck</p>
      </div>
      <details className="relative">
        <summary className="cursor-pointer rounded-full border border-slate-300/60 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm dark:border-white/10 dark:bg-slate-900 dark:text-slate-200">
          Menu
        </summary>
        <div className="absolute right-0 mt-3 w-52 rounded-2xl border border-slate-200/80 bg-white/95 p-3 text-sm shadow-card dark:border-white/10 dark:bg-slate-900">
          <div className="flex flex-col gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-ink transition hover:border-slate-200 hover:bg-slate-100 dark:text-mist dark:hover:border-white/10 dark:hover:bg-white/5"
              >
                <item.icon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                {item.label}
              </Link>
            ))}
          </div>
          <div className="mt-3 border-t border-white/10 pt-3">
            <ThemeToggle />
          </div>
        </div>
      </details>
    </div>
  );
}
