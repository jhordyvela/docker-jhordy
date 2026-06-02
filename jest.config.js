export default {
  testEnvironment: 'node',
  testMatch: ['**/test/unit/**/*.test.js'],
  transform: {},
  collectCoverageFrom: ['src/services/**/*.js'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};