/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/jest/**/*.test.js'],
      testPathIgnorePatterns: ['<rootDir>/tests/jest/ui/'],
      transform: {
        '^.+\\.js$': 'babel-jest',
      },
      transformIgnorePatterns: [],
      clearMocks: true,
      restoreMocks: true,
    },
    {
      displayName: 'jsdom',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/tests/jest/**/*.ui.test.js'],
      setupFiles: ['<rootDir>/tests/jest/setup-jsdom.cjs'],
      transform: {
        '^.+\\.js$': 'babel-jest',
      },
      transformIgnorePatterns: [],
      clearMocks: true,
      restoreMocks: true,
    },
  ],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['lcov', 'text-summary', 'html'],
  coveragePathIgnorePatterns: ['/node_modules/', '/js/vendor/', '/tests/'],
};
