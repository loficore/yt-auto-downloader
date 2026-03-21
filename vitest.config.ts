import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['apps/**/*.ts'],
    },
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@yt-auto-downloader/shared': path.resolve(__dirname, './packages/shared'),
    },
  },
});
