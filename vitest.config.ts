import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: loadEnv('test', process.cwd(), ''),
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
      include: ['packages/**/*.ts'],
      exclude: [
        'packages/**/*.test.ts',
        'packages/taco/examples/*.ts',
        'packages/shared/scripts/*.ts',
        'packages/test-utils/**/*.ts',
      ],
    },
  },
});
