import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
    exclude: ['test/e2e/**'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup-vitest.ts', './test/setup.tsx'],
  },
  resolve: {
    alias: {
      '@yt-auto-downloader/shared': path.resolve(__dirname, '../../packages/shared'),
    },
  },
});
