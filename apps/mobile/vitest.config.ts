import { defineConfig } from 'vitest/config';

// Unit tests for pure logic only (no React Native runtime).
export default defineConfig({
  test: { include: ['src/**/*.test.ts'] },
});
