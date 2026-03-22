import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 60_000,
    include: ['test/**/*.integration.test.ts'],
    exclude: [
      '**/.local/**',
      '**/node_modules/**',
      '**/dist/**',
      'test/fork/**/*.integration.test.ts',
    ],
  },
});
