import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: __dirname,
    watch: false,
    pool: 'forks',
    environment: 'jsdom',
    poolOptions: {
      forks: {
        minForks: 1,
        maxForks: 8,
      },
    },
    logHeapUsage: true,
    coverage: {
      enabled: true,
      reporter: ['text', 'html', 'lcov', 'clover'],
      reportsDirectory: 'coverage',
      include: ['packages/taco/integration-test/**/*.ts'],
    },
  },
});
