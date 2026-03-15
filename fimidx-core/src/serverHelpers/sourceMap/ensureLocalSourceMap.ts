import { mkdir } from "fs/promises";
import path from "path";
import { getCoreConfig } from "../../common/getCoreConfig.js";
import { downloadFimidaraFile, listFimidaraFolder } from "../fimidara/index.js";
import { getSourceMapUpload } from "./getSourceMapUploads.js";
import {
  getLocalSourceMapCacheEntry,
  upsertLocalSourceMapCacheEntry,
} from "./localSourceMapCache.js";

function getSourceMapsLocalDir(): string {
  const dir = getCoreConfig().sourceMaps?.localDir;
  return dir;
}

async function downloadFolderRecursive(
  fimidaraFolderPath: string,
  localDir: string
): Promise<void> {
  await mkdir(localDir, { recursive: true });
  const entries = await listFimidaraFolder(fimidaraFolderPath);
  for (const entry of entries) {
    if (entry.isFile && entry.filepath) {
      const localPath = path.join(
        localDir,
        entry.name ?? path.basename(entry.filepath)
      );
      await downloadFimidaraFile(entry.filepath, localPath);
    } else if (entry.isFolder && entry.folderpath) {
      const subLocal = path.join(localDir, entry.name ?? "folder");
      await downloadFolderRecursive(entry.folderpath, subLocal);
    }
  }
}

/**
 * Ensure the source map for (projectId, repoIdentifier, version) is available
 * locally. Returns the local directory path or null if not available (e.g. zip
 * not yet unzipped).
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
    return cached.localPath;
  }

  const upload = await getSourceMapUpload(projectId, repoIdentifier, version);
  if (!upload) return null;

  const sourcePath =
    upload.unzippedFimidaraPath ?? (upload.isZip ? null : upload.fimidaraPath);
  if (!sourcePath) return null;

  const localDir = getSourceMapsLocalDir();
  const localPath = path.join(
    localDir,
    "maps",
    projectId,
    repoIdentifier,
    version
  );
  await downloadFolderRecursive(sourcePath, localPath);

  await upsertLocalSourceMapCacheEntry({
    projectId,
    repoIdentifier,
    version,
    localPath,
    lastUsedCycleCount: cycleCount,
  });
  return localPath;
}
