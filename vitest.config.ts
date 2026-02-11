import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'tinyland-credentials-generator',
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
