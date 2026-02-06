import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 60000, // 60s timeout for container startup
    hookTimeout: 120000, // 2 min for setup/teardown
    pool: 'forks', // Use forks for better isolation with containers
    poolOptions: {
      forks: {
        singleFork: true, // Run tests sequentially to avoid port conflicts
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        '../../packages/*/src/**/*.ts',
        '../../apps/*/src/**/*.ts',
      ],
    },
    reporters: ['verbose'],
  },
});
