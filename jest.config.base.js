/** @type {import('jest').Config} */
const config = {
  "preset": "ts-jest",
  "testEnvironment": "node",
  "transform": {
    "^.+\\.ts": "babel-jest"
  },
  "coverageReporters": [
    "json",
    "text",
    "html",
    "lcov",
    "clover"
  ],
  "collectCoverage": true,
  "coverageDirectory": "coverage",
  "collectCoverageFrom": [
    "src/**/*.ts"
  ]
}

module.exports = config;
