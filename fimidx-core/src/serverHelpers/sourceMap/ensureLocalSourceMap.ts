import AdmZip from "adm-zip";
import assert from "assert";
import { mkdir } from "fs/promises";
import path from "path";
import { getCoreConfig } from "../../common/getCoreConfig.js";
import { kSourceMapZipFileName } from "../fimidara/fimidaraClient.js";
import { downloadFimidaraFile } from "../fimidara/index.js";
import {
  getSourceMapUpload,
  markSourceMapUploadLocalZipIngested,
} from "./getSourceMapUploads.js";
import { ingestSourceMapsToMongo } from "./ingestSourceMapsToMongo.js";
import {
  getLocalSourceMapCacheEntry,
  upsertLocalSourceMapCacheEntry,
} from "./localSourceMapCache.js";

function getSourceMapsLocalDir(): string {
  const dir = getCoreConfig().sourceMaps?.localDir;
  assert.ok(dir, "FIMIDX_SOURCE_MAPS_LOCAL_DIR is not set");
  return dir;
}

/**
 * Ensure the source map for (projectId, repoIdentifier, version) is available
 * locally. Only zip uploads are supported: we download the zip from fimidara
 * and unzip to a local cache dir. Returns the local directory path or null if
 * no upload or no zip found.
 */
export async function ensureLocalSourceMap(
  projectId: string,
  repoIdentifier: string,
  version: string,
  cycleCount: number
): Promise<string | null> {
  const cached = await getLocalSourceMapCacheEntry(
    projectId,
    repoIdentifier,
    version
  );
  if (cached) {
    await upsertLocalSourceMapCacheEntry({
      ...cached,
      lastUsedCycleCount: cycleCount,
    });
    await markSourceMapUploadLocalZipIngested(
      projectId,
      repoIdentifier,
      version
    );
    return cached.localPath;
  }

  const upload = await getSourceMapUpload(projectId, repoIdentifier, version);
  if (!upload) return null;

  const localDir = getSourceMapsLocalDir();
  const localPath = path.join(
    localDir,
    "maps",
    projectId,
    repoIdentifier,
    version
  );
  await mkdir(localPath, { recursive: true });

  const zipLocalPath = path.join(localPath, kSourceMapZipFileName);
  await downloadFimidaraFile(upload.fimidaraPath, zipLocalPath);

  const zip = new AdmZip(zipLocalPath);
  zip.extractAllTo(localPath, true);

  await upsertLocalSourceMapCacheEntry({
    projectId,
    repoIdentifier,
    version,
    localPath,
    lastUsedCycleCount: cycleCount,
  });
  await ingestSourceMapsToMongo(projectId, repoIdentifier, version, localPath);
  await markSourceMapUploadLocalZipIngested(
    projectId,
    repoIdentifier,
    version
  );
  return localPath;
}
