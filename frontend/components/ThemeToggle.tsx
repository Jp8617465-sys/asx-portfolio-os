'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const storageKey = 'asx-portfolio-theme';

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    // Default to dark mode
    const nextDark = stored ? stored === 'dark' : prefersDark !== false;
    setIsDark(nextDark);
    document.documentElement.classList.toggle('dark', nextDark);
    document.documentElement.setAttribute('data-theme', nextDark ? 'dark' : 'light');
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    document.documentElement.classList.toggle('dark', nextDark);
    document.documentElement.setAttribute('data-theme', nextDark ? 'dark' : 'light');
    localStorage.setItem(storageKey, nextDark ? 'dark' : 'light');
  };

  if (!mounted) {
    return <div className="h-9 w-9 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />;
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="rounded-lg p-2 transition-colors duration-200 
        bg-gray-100 hover:bg-gray-200 dark:bg-dark-tertiary dark:hover:bg-dark-elevated
        text-gray-700 dark:text-gray-300
        focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="h-5 w-5 transition-transform duration-200 rotate-0 hover:rotate-12" />
      ) : (
        <Moon className="h-5 w-5 transition-transform duration-200 rotate-0 hover:-rotate-12" />
      )}
    </button>
  );
}
