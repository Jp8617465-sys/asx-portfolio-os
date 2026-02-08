/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './features/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'SF Mono', 'Monaco', 'monospace'],
        numeric: ['Inter', 'SF Pro Display', '-apple-system', 'sans-serif'],
      },
      colors: {
        // Legacy colors for backward compatibility
        ink: '#121417',
        graphite: '#1E2127',
        mist: '#E7E9ED',
        paper: '#F7F7F5',
        accent: '#6366F1',
        accentSoft: '#EEF2FF',

        // Brand palette — "Midnight Indigo"
        brand: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1', // Primary accent
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },

        // Cyan accent for data highlights
        cyan: {
          400: '#22D3EE',
          500: '#06B6D4',
        },

        // Design system colors
        primary: {
          500: '#6366F1',
          600: '#4F46E5',
        },

        // Signal colors — universal semantics
        signal: {
          'strong-buy': '#059669',
          buy: '#10B981',
          hold: '#6B7280',
          sell: '#EF4444',
          'strong-sell': '#DC2626',
        },
        'signal-dark': {
          'strong-buy': '#34D399',
          buy: '#6EE7B7',
          hold: '#9CA3AF',
          sell: '#FCA5A5',
          'strong-sell': '#F87171',
        },

        // Dark mode surfaces — navy-tinted for depth
        dark: {
          primary: '#0B1121',    // Deep midnight
          secondary: '#111827',  // Card surface
          tertiary: '#1E293B',   // Elevated surface
          elevated: '#334155',   // Hover / active
        },
        light: {
          primary: '#FFFFFF',
          secondary: '#F8FAFC',
          tertiary: '#F1F5F9',
          elevated: '#FFFFFF',
        },

        // Semantic metrics
        metric: {
          positive: '#10B981',
          negative: '#F87171',
          neutral: '#94A3B8',
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
        'card-dark': '0 16px 40px rgba(0, 0, 0, 0.3)',
        glow: '0 0 20px rgba(99, 102, 241, 0.15)',
        'glow-lg': '0 0 40px rgba(99, 102, 241, 0.2)',
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
        '3xl': '1.5rem',
        full: '9999px',
      },
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
        88: '22rem',
        120: '30rem',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-glow':
          'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99, 102, 241, 0.15), transparent)',
        'hero-glow-dark':
          'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99, 102, 241, 0.3), transparent)',
        'grid-pattern':
          'linear-gradient(to right, rgba(99, 102, 241, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(99, 102, 241, 0.05) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid-40': '40px 40px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'count-up': 'countUp 0.8s ease-out',
        shimmer: 'shimmer 2s infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        float: 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};
