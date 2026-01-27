// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    };
  },
  usePathname() {
    return '/';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

/**
 * Mock all lucide-react icons used in the codebase
 *
 * Each icon is mocked as a simple functional component that returns its name.
 * This allows React Testing Library to render components with icons without
 * requiring the full lucide-react library in tests.
 *
 * If you add a new lucide-react icon to any component, add it here to prevent test failures.
 *
 * To find all icons in use:
 * grep -r "from 'lucide-react'" app components --include="*.tsx"
 */
jest.mock('lucide-react', () => ({
  // Trending & Direction Icons
  TrendingUp: () => 'TrendingUp',
  TrendingDown: () => 'TrendingDown',
  ArrowLeft: () => 'ArrowLeft',
  ArrowUp: () => 'ArrowUp',
  ArrowDown: () => 'ArrowDown',
  ArrowUpDown: () => 'ArrowUpDown',

  // Alert & Status Icons
  AlertCircle: () => 'AlertCircle',
  AlertTriangle: () => 'AlertTriangle',
  CheckCircle: () => 'CheckCircle',
  XCircle: () => 'XCircle',
  Info: () => 'Info',

  // Navigation & Layout Icons
  Menu: () => 'Menu',
  X: () => 'X',
  LayoutDashboard: () => 'LayoutDashboard',
  LayoutGrid: () => 'LayoutGrid',
  ChevronDown: () => 'ChevronDown',
  ChevronUp: () => 'ChevronUp',
  ExternalLink: () => 'ExternalLink',

  // Feature Icons
  Bell: () => 'Bell',
  Bookmark: () => 'Bookmark',
  BookmarkCheck: () => 'BookmarkCheck',
  Search: () => 'Search',
  User: () => 'User',
  Settings: () => 'Settings',
  Sparkles: () => 'Sparkles',

  // Business & Finance Icons
  DollarSign: () => 'DollarSign',
  Briefcase: () => 'Briefcase',
  Target: () => 'Target',
  Activity: () => 'Activity',
  BarChart3: () => 'BarChart3',

  // File & Data Icons
  Download: () => 'Download',
  Upload: () => 'Upload',
  FileText: () => 'FileText',
  FileDown: () => 'FileDown',

  // Communication Icons
  Mail: () => 'Mail',
  MessageCircle: () => 'MessageCircle',
  MessageSquare: () => 'MessageSquare',
  Smartphone: () => 'Smartphone',

  // Action Icons
  RefreshCw: () => 'RefreshCw',
  Check: () => 'Check',
  CheckCheck: () => 'CheckCheck',
  Minus: () => 'Minus',
  ListChecks: () => 'ListChecks',

  // Feature/Marketing Icons
  Zap: () => 'Zap',
  Shield: () => 'Shield',
  Clock: () => 'Clock',
  Loader2: () => 'Loader2',

  // Social Icons
  Github: () => 'Github',
  Twitter: () => 'Twitter',
}));

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000/api/v1';
