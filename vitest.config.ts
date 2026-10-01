import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'api',
          environment: 'node',
          include: ['apps/api/**/*.test.ts', 'packages/**/*.test.ts'],
          testTimeout: 15000,
        },
      },
      {
        test: {
          name: 'web',
          environment: 'jsdom',
          include: ['apps/web/**/*.test.tsx'],
          setupFiles: ['apps/web/src/test-setup.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['apps/api/src/**/*.ts', 'apps/web/src/**/*.tsx', 'packages/contracts/src/**/*.ts'],
      exclude: ['**/*.test.*', '**/server.ts', '**/cli.ts', '**/main.tsx'],
    },
  },
});
