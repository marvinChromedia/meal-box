import 'dotenv/config';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/contract/**/*.test.ts'],
    globalSetup: ['test/integration/globalSetup.ts'],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
