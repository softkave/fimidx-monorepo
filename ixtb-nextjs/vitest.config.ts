import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["**/api-e2e/**", "**/node_modules/**"],
  },
});
