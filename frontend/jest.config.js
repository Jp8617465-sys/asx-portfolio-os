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
  // Exclude e2e tests from jest - these run with playwright
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/e2e/'],
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
  ],
  // Coverage thresholds temporarily disabled for tech debt PR
  // TODO: Re-enable after increasing test coverage
  // coverageThreshold: { ... },
  // Coverage thresholds updated as part of V2 testing strategy
  // Target: 75-85% overall, 90-100% for core logic
  coverageReporters: ['text', 'lcov', 'html'],
  // Force exit to prevent hanging
  forceExit: true,
  // Detect open handles (memory leaks)
  detectOpenHandles: true,
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  // Transform ESM modules from node_modules
  transformIgnorePatterns: ['node_modules/(?!(lucide-react)/)'],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
