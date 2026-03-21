import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['test/e2e/**'],
    environment: 'node',
    globals: true,
    pool: 'vmForks',
  },
  resolve: {
    alias: {
      '@yt-auto-downloader/shared': path.resolve(__dirname, '../../packages/shared'),
    },
  },
});
