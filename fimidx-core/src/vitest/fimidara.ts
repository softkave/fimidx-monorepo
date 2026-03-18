import path from "path";
import { getNewId } from "softkave-js-utils";
import { envVars } from "../definitions/coreConfig.js";

export function getFimidaraSourceMapsFolder() {
  const original = process.env[envVars.FIMIDARA_SOURCE_MAPS_FOLDERPATH];
  return path.join(original ?? "", `source-maps-${getNewId()}`);
}
