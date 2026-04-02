import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["api-e2e/**/*.test.ts"],
    testTimeout: 20_000, // 20 seconds
    hookTimeout: 10_000, // 10 seconds
    globalSetup: ["./vitest.e2e.setup.ts"],
    fileParallelism: false,
  },
});
