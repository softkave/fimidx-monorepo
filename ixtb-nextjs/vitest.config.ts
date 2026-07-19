import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    exclude: ["**/api-e2e/**", "**/node_modules/**"],
  },
  resolve: {
    alias: {
      "@": root,
    },
  },
});
