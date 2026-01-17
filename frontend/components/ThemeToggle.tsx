'use client';

import { useEffect, useState } from 'react';

const storageKey = 'asx-portfolio-theme';

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const nextDark = stored ? stored === 'dark' : prefersDark;
    setIsDark(nextDark);
    document.documentElement.classList.toggle('dark', nextDark);
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    document.documentElement.classList.toggle('dark', nextDark);
    localStorage.setItem(storageKey, nextDark ? 'dark' : 'light');
  };

  if (!mounted) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="rounded-full border border-slate-300/60 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm transition hover:border-slate-400 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
    >
      {isDark ? 'Dark' : 'Light'}
    </button>
  );
}
