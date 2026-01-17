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

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  TrendingUp: () => 'TrendingUp',
  TrendingDown: () => 'TrendingDown',
  AlertCircle: () => 'AlertCircle',
  CheckCircle: () => 'CheckCircle',
  XCircle: () => 'XCircle',
  Info: () => 'Info',
  Bell: () => 'Bell',
  Bookmark: () => 'Bookmark',
  BookmarkCheck: () => 'BookmarkCheck',
  ArrowLeft: () => 'ArrowLeft',
  ArrowUp: () => 'ArrowUp',
  ArrowDown: () => 'ArrowDown',
  DollarSign: () => 'DollarSign',
  Briefcase: () => 'Briefcase',
  Download: () => 'Download',
  FileText: () => 'FileText',
  RefreshCw: () => 'RefreshCw',
  Upload: () => 'Upload',
  X: () => 'X',
  Check: () => 'Check',
  CheckCheck: () => 'CheckCheck',
  Target: () => 'Target',
  Activity: () => 'Activity',
  AlertTriangle: () => 'AlertTriangle',
}));

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000/api/v1';
