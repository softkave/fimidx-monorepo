import { rm } from "fs/promises";
import path from "path";
import { getCoreConfig } from "../../common/getCoreConfig.js";
import { getLocalSourceMapCacheModel } from "../../db/sourceMap.mongo.js";
import type { ILocalSourceMapCacheEntry } from "../../definitions/sourceMap.js";

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

/** Delete cache entries where currentCycleCount - lastUsedCycleCount >
 * maxUnusedCycles. */
export async function deleteLocalSourceMapCacheEntriesOlderThanCycle(
  maxUnusedCycles: number,
  projectCycleCounts: Map<string, number>
): Promise<number> {
  const model = getLocalSourceMapCacheModel();
  const all = await model.find({}).lean().exec();
  const toDelete: {
    projectId: string;
    repoIdentifier: string;
    version: string;
  }[] = [];
  for (const entry of all as ILocalSourceMapCacheEntry[]) {
    const current = projectCycleCounts.get(entry.projectId) ?? 0;
    if (current - entry.lastUsedCycleCount > maxUnusedCycles) {
      toDelete.push({
        projectId: entry.projectId,
        repoIdentifier: entry.repoIdentifier,
        version: entry.version,
      });
    }
  }
  if (toDelete.length === 0) return 0;

  const baseDir = getCoreConfig().sourceMaps?.localDir;
  const localPathsToRemove = (all as ILocalSourceMapCacheEntry[])
    .filter((e) =>
      toDelete.some(
        (t) =>
          t.projectId === e.projectId &&
          t.repoIdentifier === e.repoIdentifier &&
          t.version === e.version
      )
    )
    .map((e) => e.localPath);

  const result = await model.deleteMany({
    $or: toDelete.map((t) => ({
      projectId: t.projectId,
      repoIdentifier: t.repoIdentifier,
      version: t.version,
    })),
  });

  if (baseDir) {
    for (const localPath of localPathsToRemove) {
      const resolved = path.resolve(localPath);
      const baseResolved = path.resolve(baseDir);
      if (resolved.startsWith(baseResolved)) {
        try {
          await rm(resolved, { recursive: true, force: true });
        } catch {
          // ignore
        }
      }
    }
  }

  return result.deletedCount ?? 0;
}
