import { rm } from "fs/promises";
import path from "path";
import { getCoreConfig } from "../../common/getCoreConfig.js";
import { getLocalSourceMapCacheModel } from "../../db/sourceMap.mongo.js";
import type { ILocalSourceMapCacheEntry } from "../../definitions/sourceMap.js";

const kPurgeFetchBatchSize = 500;
const kPurgeDeleteBatchSize = 1000;

type CacheEntryKey = {
  projectId: string;
  repoIdentifier: string;
  version: string;
};

export async function getLocalSourceMapCacheEntry(
  projectId: string,
  repoIdentifier: string,
  version: string
): Promise<ILocalSourceMapCacheEntry | null> {
  const model = getLocalSourceMapCacheModel();
  const doc = await model
    .findOne({ projectId, repoIdentifier, version })
    .lean()
    .exec();
  return doc ? (doc as ILocalSourceMapCacheEntry) : null;
}

export async function upsertLocalSourceMapCacheEntry(
  params: ILocalSourceMapCacheEntry
): Promise<ILocalSourceMapCacheEntry> {
  const model = getLocalSourceMapCacheModel();
  const doc = await model
    .findOneAndUpdate(
      {
        projectId: params.projectId,
        repoIdentifier: params.repoIdentifier,
        version: params.version,
      },
      {
        $set: {
          localPath: params.localPath,
          lastUsedCycleCount: params.lastUsedCycleCount,
        },
      },
      { upsert: true, new: true, runValidators: true }
    )
    .lean()
    .exec();
  return doc as ILocalSourceMapCacheEntry;
}

/** Fetch a batch of cache entries (for batched purge). */
async function fetchLocalSourceMapCacheBatch(
  skip: number,
  limit: number
): Promise<ILocalSourceMapCacheEntry[]> {
  const model = getLocalSourceMapCacheModel();
  const docs = await model
    .find({})
    .sort({ _id: 1 })
    .skip(skip)
    .limit(limit)
    .lean()
    .exec();
  return docs as ILocalSourceMapCacheEntry[];
}

/** From a batch of entries, return keys and local paths that are stale. */
function filterStaleCacheEntries(
  entries: ILocalSourceMapCacheEntry[],
  projectCycleCounts: Map<string, number>,
  maxUnusedCycles: number
): { keys: CacheEntryKey[]; localPaths: string[] } {
  const keys: CacheEntryKey[] = [];
  const localPaths: string[] = [];
  for (const entry of entries) {
    const current = projectCycleCounts.get(entry.projectId) ?? 0;
    if (current - entry.lastUsedCycleCount > maxUnusedCycles) {
      keys.push({
        projectId: entry.projectId,
        repoIdentifier: entry.repoIdentifier,
        version: entry.version,
      });
      localPaths.push(entry.localPath);
    }
  }
  return { keys, localPaths };
}

/** Delete cache entries by keys in batches (avoids oversized $or). */
async function deleteCacheEntriesByKeys(
  keys: CacheEntryKey[]
): Promise<number> {
  if (keys.length === 0) return 0;
  const model = getLocalSourceMapCacheModel();
  let totalDeleted = 0;
  for (let i = 0; i < keys.length; i += kPurgeDeleteBatchSize) {
    const chunk = keys.slice(i, i + kPurgeDeleteBatchSize);
    const result = await model
      .deleteMany({
        $or: chunk.map((t) => ({
          projectId: t.projectId,
          repoIdentifier: t.repoIdentifier,
          version: t.version,
        })),
      })
      .exec();
    totalDeleted += result.deletedCount ?? 0;
  }
  return totalDeleted;
}

/** Remove local directories/files under baseDir. Paths outside baseDir are
 * skipped. */
async function removeLocalPathsUnderBaseDir(
  baseDir: string,
  localPaths: string[]
): Promise<void> {
  const baseResolved = path.resolve(baseDir);
  for (const localPath of localPaths) {
    const resolved = path.resolve(localPath);
    if (resolved.startsWith(baseResolved)) {
      try {
        await rm(resolved, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  }
}

/** Delete cache entries where currentCycleCount - lastUsedCycleCount >
 * maxUnusedCycles. Fetches and deletes in batches. */
export async function deleteLocalSourceMapCacheEntriesOlderThanCycle(
  maxUnusedCycles: number,
  projectCycleCounts: Map<string, number>
): Promise<number> {
  const allKeys: CacheEntryKey[] = [];
  const allLocalPaths: string[] = [];

  let skip = 0;
  let batch: ILocalSourceMapCacheEntry[];
  do {
    batch = await fetchLocalSourceMapCacheBatch(skip, kPurgeFetchBatchSize);
    const { keys, localPaths } = filterStaleCacheEntries(
      batch,
      projectCycleCounts,
      maxUnusedCycles
    );
    allKeys.push(...keys);
    allLocalPaths.push(...localPaths);
    skip += batch.length;
  } while (batch.length === kPurgeFetchBatchSize);

  if (allKeys.length === 0) return 0;

  // Delete local paths first before deleting in DB to avoid orphaned files if
  // DB deletion fails.
  const baseDir = getCoreConfig().sourceMaps?.localDir;
  if (baseDir) {
    await removeLocalPathsUnderBaseDir(baseDir, allLocalPaths);
  }

  const deleted = await deleteCacheEntriesByKeys(allKeys);
  return deleted;
}
