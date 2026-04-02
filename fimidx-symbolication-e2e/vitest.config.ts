import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 120_000,
    hookTimeout: 120_000,
    include: ["src/**/*.e2e.test.ts"],
    globalSetup: ["./vitest.setup.ts"],
  },
});
