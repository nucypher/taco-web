/** @type {import('jest').Config} */
const config = {
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['json', 'text', 'html', 'lcov', 'clover'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.js': 'babel-jest',
  },
};

module.exports = config;
