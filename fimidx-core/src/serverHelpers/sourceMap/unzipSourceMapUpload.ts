import AdmZip from "adm-zip";
import { mkdir } from "fs/promises";
import path from "path";
import { getCoreConfig } from "../../common/getCoreConfig.js";
import type { ISourceMapUpload } from "../../definitions/sourceMap.js";
import { kSourceMapZipFileName } from "../fimidara/fimidaraClient.js";
import { downloadFimidaraFile } from "../fimidara/index.js";
import { getProjectCycleCounts } from "./getProjectCycleCounts.js";
import { upsertLocalSourceMapCacheEntry } from "./localSourceMapCache.js";

function getSourceMapsLocalDir(): string {
  const dir = getCoreConfig().sourceMaps?.localDir;
  return dir;
}

/**
 * Unzip a source map upload locally: download zip from Fimidara, extract to
 * local cache dir, and upsert local_source_map_cache. No re-upload to Fimidara.
 * Symbolication will use this cache when ensuring a local source map.
 */
export async function unzipSourceMapUpload(
  upload: ISourceMapUpload
): Promise<void> {
  const localDir = getSourceMapsLocalDir();
  const localPath = path.join(
    localDir,
    "maps",
    upload.projectId,
    upload.repoIdentifier,
    upload.version
  );
  await mkdir(localPath, { recursive: true });

  const zipLocalPath = path.join(localPath, kSourceMapZipFileName);
  await downloadFimidaraFile(upload.fimidaraPath, zipLocalPath);

  const zip = new AdmZip(zipLocalPath);
  zip.extractAllTo(localPath, true);

  const cycleCounts = await getProjectCycleCounts();
  const cycleCount = cycleCounts.get(upload.projectId) ?? 0;

  await upsertLocalSourceMapCacheEntry({
    projectId: upload.projectId,
    repoIdentifier: upload.repoIdentifier,
    version: upload.version,
    localPath,
    lastUsedCycleCount: cycleCount,
  });
}
