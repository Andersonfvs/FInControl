import { defineConfig } from 'vitest/config';
import path from 'path';

// Config mínima do Vitest pro Next.js: resolve o alias "@/..." pra src/.
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
