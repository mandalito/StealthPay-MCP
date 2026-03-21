import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 180_000,
    include: ['test/fork/**/*.integration.test.ts'],
    exclude: [
      '**/.local/**',
      '**/node_modules/**',
      '**/dist/**',
    ],
  },
});
