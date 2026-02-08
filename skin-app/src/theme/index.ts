/**
 * Glow AI Design System
 *
 * Modern, warm aesthetic targeting 18-35 demographic.
 * Soft gradients, rounded corners, accessible contrast ratios.
 */

export const colors = {
  // Primary palette — warm rose/blush tones
  primary: {
    50: '#FFF0F5',
    100: '#FFE0EB',
    200: '#FFC2D9',
    300: '#FF99BE',
    400: '#FF6B9D',
    500: '#FF3D7F',
    600: '#E8356F',
    700: '#C42B5C',
    800: '#9E2249',
    900: '#7A1B3A',
  },

  // Secondary — soft lavender
  secondary: {
    50: '#F5F0FF',
    100: '#EDE5FF',
    200: '#D9C7FF',
    300: '#BEA3FF',
    400: '#A07EFF',
    500: '#8B5CF6',
    600: '#7C3AED',
    700: '#6D28D9',
    800: '#5B21B6',
    900: '#4C1D95',
  },

  // Accent — warm coral/peach
  accent: {
    50: '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316',
    600: '#EA580C',
    700: '#C2410C',
    800: '#9A3412',
    900: '#7C2D12',
  },

  // Mint — fresh, clean feeling
  mint: {
    50: '#F0FDF9',
    100: '#CCFBEF',
    200: '#99F6E0',
    300: '#5EEAD4',
    400: '#2DD4BF',
    500: '#14B8A6',
    600: '#0D9488',
    700: '#0F766E',
    800: '#115E59',
    900: '#134E4A',
  },

  // Neutrals — warm grays
  neutral: {
    0: '#FFFFFF',
    50: '#FAFAF9',
    100: '#F5F5F4',
    200: '#E7E5E4',
    300: '#D6D3D1',
    400: '#A8A29E',
    500: '#78716C',
    600: '#57534E',
    700: '#44403C',
    800: '#292524',
    900: '#1C1917',
  },

  // Semantic colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Skin analysis specific
  skin: {
    hydration: '#60A5FA',
    oiliness: '#FBBF24',
    sensitivity: '#F87171',
    aging: '#A78BFA',
    pigmentation: '#FB923C',
    acne: '#F43F5E',
    texture: '#34D399',
    elasticity: '#818CF8',
  },
} as const;

export const gradients = {
  primary: ['#FF6B9D', '#FF3D7F', '#E8356F'],
  secondary: ['#A07EFF', '#8B5CF6', '#7C3AED'],
  warm: ['#FFC2D9', '#FFB4D2', '#FF99BE'],
  sunset: ['#FF6B9D', '#FB923C', '#FBBF24'],
  lavender: ['#D9C7FF', '#BEA3FF', '#A07EFF'],
  mint: ['#99F6E0', '#5EEAD4', '#2DD4BF'],
  glow: ['#FFF0F5', '#FFE0EB', '#FFC2D9'],
  card: ['#FFFFFF', '#FAFAF9'],
  hero: ['#FF3D7F', '#8B5CF6'],
} as const;

export const typography = {
  fontFamily: {
    heading: 'System',
    body: 'System',
    mono: 'SpaceMono',
  },
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 30,
    '3xl': 36,
    '4xl': 48,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  glow: {
    shadowColor: '#FF3D7F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
} as const;

const theme = {
  colors,
  gradients,
  typography,
  spacing,
  borderRadius,
  shadows,
} as const;

export type Theme = typeof theme;
export default theme;
