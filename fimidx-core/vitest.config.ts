import { defineConfig } from "vitest/config";
import { envVars } from "./src/definitions/coreConfig";
import { getFimidaraSourceMapsFolder } from "./src/vitest/fimidara";

export default defineConfig({
  test: {
    globalSetup: "./vitest.setup.ts",
    env: {
      ...process.env,
      [envVars.FIMIDARA_SOURCE_MAPS_FOLDERPATH]: getFimidaraSourceMapsFolder(),
    },
  },
});
