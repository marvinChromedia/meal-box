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
    // Explicit, not incidental: component/hook tests exercise the typed mock
    // (AC5 of TEST-155) regardless of the app's own default, which is now
    // "http" (TEST-154) now that the real endpoints exist.
    env: { VITE_API_MODE: 'mock' },
  },
});
