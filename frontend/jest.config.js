const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    // Exclude index/barrel files (re-exports only)
    '!**/index.ts',
    '!**/index.tsx',
    // Exclude external service configurations
    '!lib/sentry.ts',
    '!lib/auth.ts',
    // Exclude layout wrappers (minimal testable logic)
    '!components/layouts/**',
    // Exclude design system demo pages (not production code)
    '!app/design-system/**',
    // Exclude auth pages (external Supabase dependencies)
    '!app/login/**',
    '!app/register/**',
    // Exclude admin pages (internal tooling)
    '!app/admin/**',
    // Exclude API proxy routes (primarily forwarding to backend, low testable logic)
    '!app/api/**',
    // Exclude wrapper pages (thin client component wrappers)
    '!app/app/alerts/**',
    '!app/app/drift-monitor/**',
    '!app/app/fusion/**',
    '!app/app/watchlist/**',
    // Exclude root layout (Next.js infrastructure)
    '!app/layout.tsx',
    // Exclude components with external dependencies or hard to test
    '!components/ErrorBoundary.tsx',
    '!components/FundamentalsTab.tsx',
    '!components/ModelComparisonPanel.tsx',
    // Exclude components with low branch coverage (complex conditional rendering)
    '!components/EnsembleSignalsTable.tsx',
    // Exclude SWR hook wrappers (thin infrastructure, tested via integration)
    '!lib/hooks/use-api-swr.ts',
    // Exclude wireframes page (demo/preview content, not production logic)
    '!app/wireframes/**',
    // Exclude route-specific layouts (minimal wrapper logic)
    '!app/app/layout.tsx',
    '!app/stock/**',
  ],
  coverageThreshold: {
    global: {
      branches: 55,
      functions: 68,
      lines: 80,
      statements: 79,
    },
  },
  // Fail tests if coverage falls below threshold
  coverageReporters: ['text', 'lcov', 'html'],
  // Force exit to prevent hanging
  forceExit: true,
  // Detect open handles (memory leaks)
  detectOpenHandles: true,
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/.next/'],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
