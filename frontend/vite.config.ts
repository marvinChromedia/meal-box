import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // TEST-235: raised from Vitest's 5000ms default for the same reason as
    // asyncUtilTimeout in test/setup.ts — tolerance for a shared, contended
    // dev machine, not a fix for a race. See docs/testing.md.
    testTimeout: 15000,
  },
});
