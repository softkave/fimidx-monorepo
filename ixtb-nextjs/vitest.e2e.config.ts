import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["api-e2e/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 10000,
    globalSetup: ["./vitest.e2e.setup.ts"],
    fileParallelism: false,
  },
});
