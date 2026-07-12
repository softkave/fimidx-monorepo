import { defineConfig } from "vitest/config";
import { envVars } from "./src/definitions/coreConfig";
import { getFimidaraSourceMapsFolder } from "./src/vitest/fimidara";

export default defineConfig({
  test: {
    // Integration tests share one MongoDB — run files sequentially to avoid races.
    fileParallelism: false,
    globalSetup: "./vitest.setup.ts",
    env: {
      ...process.env,
      [envVars.FIMIDARA_SOURCE_MAPS_FOLDERPATH]: getFimidaraSourceMapsFolder(),
    },
  },
});
