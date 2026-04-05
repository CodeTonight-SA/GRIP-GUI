import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'electron/constants/**',
        'electron/utils/**',
        'electron/services/**',
        'electron/handlers/**',
        'electron/providers/**',
        'mcp-orchestrator/src/utils/**',
        'mcp-orchestrator/src/tools/**',
        'mcp-telegram/src/**',
        'mcp-kanban/src/**',
      ],
    },
  },
});
