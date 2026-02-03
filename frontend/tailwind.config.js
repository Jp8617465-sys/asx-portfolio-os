/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'SF Mono', 'Monaco', 'monospace'],
        numeric: ['SF Pro Display', '-apple-system', 'sans-serif'],
      },
      colors: {
        // Legacy colors for backward compatibility
        ink: '#121417',
        graphite: '#1E2127',
        mist: '#E7E9ED',
        paper: '#F7F7F5',
        accent: '#2F6FED',
        accentSoft: '#E6EEFF',

        // Design system colors
        primary: {
          500: '#2B6CB0',
          600: '#1E4E8C',
        },
        signal: {
          'strong-buy': '#059669',
          buy: '#10B981',
          hold: '#6B7280',
          sell: '#EF4444',
          'strong-sell': '#DC2626',
        },
        'signal-dark': {
          'strong-buy': '#10B981',
          buy: '#34D399',
          hold: '#9CA3AF',
          sell: '#F87171',
          'strong-sell': '#EF4444',
        },
        dark: {
          primary: '#1A1A1A',
          secondary: '#242424',
          tertiary: '#2E2E2E',
          elevated: '#333333',
        },
        light: {
          primary: '#FFFFFF',
          secondary: '#F7F7F5',
          tertiary: '#E7E9ED',
          elevated: '#FFFFFF',
        },
        metric: {
          positive: '#10B981',
          negative: '#F87171',
          neutral: '#9CA3AF',
        },
        model: {
          excellent: '#059669',
          good: '#10B981',
          acceptable: '#F59E0B',
          poor: '#EF4444',
        },
        system: {
          healthy: '#10B981',
          degraded: '#F59E0B',
          down: '#EF4444',
        },
      },
      boxShadow: {
        card: '0 16px 40px rgba(15, 23, 42, 0.08)',
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
      borderRadius: {
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        full: '9999px',
      },
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
        88: '22rem',
        120: '30rem',
      },
    },
  },
  plugins: [],
};
