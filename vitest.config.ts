import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: __dirname,
    environment: 'node',
    coverage: {
      enabled: true,
      reporter: ['text', 'html', 'lcov', 'clover'],
      reportsDirectory: 'coverage',
      include: ['packages/**/*.ts'],
      exclude: ['packages/**/*.test.ts'],
    },
  },
});
