/**
 * Design Tokens for ASX Portfolio OS
 * "Midnight Indigo" palette
 * Central source of truth for all design values
 */

export const designTokens = {
  colors: {
    brand: {
      primary: '#6366F1',
      primaryHover: '#4F46E5',
      primaryActive: '#4338CA',
      primaryLight: '#818CF8',
      primarySubtle: '#EEF2FF',
    },
    semantic: {
      success: '#10b981',
      successLight: '#34d399',
      successDark: '#059669',
      danger: '#ef4444',
      dangerLight: '#f87171',
      dangerDark: '#dc2626',
      warning: '#f59e0b',
      warningLight: '#fbbf24',
      warningDark: '#d97706',
      info: '#6366F1',
      infoLight: '#818CF8',
      infoDark: '#4F46E5',
    },
    signals: {
      strongBuy: '#10b981',
      buy: '#34d399',
      hold: '#94a3b8',
      sell: '#f87171',
      strongSell: '#ef4444',
    },
    chart: {
      bullish: '#10b981',
      bearish: '#ef4444',
      neutral: '#94a3b8',
    },
    neutral: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#020617',
    },
    dark: {
      background: '#0B1121',
      surface: '#111827',
      surfaceHover: '#1E293B',
      border: '#1E293B',
      text: '#f1f5f9',
      textMuted: '#94a3b8',
    },
    light: {
      background: '#ffffff',
      surface: '#f8fafc',
      surfaceHover: '#f1f5f9',
      border: '#e2e8f0',
      text: '#0f172a',
      textMuted: '#64748b',
    },
  },
  typography: {
    fontFamily: {
      sans: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      mono: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
      '6xl': '3.75rem',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  spacing: {
    0: '0',
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
  },
  borderRadius: {
    none: '0',
    sm: '0.375rem',
    base: '0.5rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    glow: '0 0 20px rgba(99, 102, 241, 0.15)',
  },
  animations: {
    duration: {
      fast: '150ms',
      base: '300ms',
      slow: '500ms',
      slower: '800ms',
    },
    easing: {
      linear: 'linear',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
  components: {
    confidenceGauge: {
      thresholds: {
        strongBuy: 80,
        buy: 60,
        hold: 40,
        sell: 20,
        strongSell: 0,
      },
    },
  },
} as const;

export type DesignTokens = typeof designTokens;
