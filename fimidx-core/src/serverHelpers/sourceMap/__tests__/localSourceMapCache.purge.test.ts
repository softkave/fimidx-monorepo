import { mkdir, mkdtemp, rm, stat } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { getMongoConnection } from "../../../db/fimidx.mongo.js";
import {
  getLocalSourceMapCacheModel,
} from "../../../db/sourceMap.mongo.js";
import {
  deleteLocalSourceMapCacheEntriesOlderThanCycle,
  upsertLocalSourceMapCacheEntry,
} from "../localSourceMapCache.js";

describe("localSourceMapCache (integration - purge)", () => {
  let baseDir: string | null = null;
  let outsideDir: string | null = null;
  let previousLocalDir: string | undefined;

  beforeAll(async () => {
    const { promise } = getMongoConnection();
    await promise;
  });

  afterEach(async () => {
    if (baseDir) await rm(baseDir, { recursive: true, force: true });
    if (outsideDir) await rm(outsideDir, { recursive: true, force: true });

    if (previousLocalDir !== undefined) {
      process.env.FIMIDX_SOURCE_MAPS_LOCAL_DIR = previousLocalDir;
    } else {
      delete process.env.FIMIDX_SOURCE_MAPS_LOCAL_DIR;
    }

    baseDir = null;
    outsideDir = null;
    previousLocalDir = undefined;
  });

  it("purges stale entries: deletes under baseDir, preserves outside baseDir but still removes DB rows", async () => {
    previousLocalDir = process.env.FIMIDX_SOURCE_MAPS_LOCAL_DIR;

    baseDir = await mkdtemp(path.join(tmpdir(), "fimidx-localmaps-base-"));
    process.env.FIMIDX_SOURCE_MAPS_LOCAL_DIR = baseDir;

    const staleUnderBase = path.join(baseDir, "maps", "stale-under-base");
    const freshUnderBase = path.join(baseDir, "maps", "fresh-under-base");
    outsideDir = await mkdtemp(path.join(tmpdir(), "fimidx-localmaps-outside-"));

    await mkdir(staleUnderBase, { recursive: true });
    await mkdir(freshUnderBase, { recursive: true });
    await mkdir(outsideDir, { recursive: true });

    const projectIdStale1 = `proj_cache_purge_stale1_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    const projectIdFresh = `proj_cache_purge_fresh_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    const projectIdStale2 = `proj_cache_purge_stale2_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 7)}`;

    const repoIdentifier = "repo_cache_purge";
    const version = "v_cache_purge";

    const staleMaxUnusedCycles = 5;

      // Seed three cache entries:
      // - staleUnderBase: should be deleted from both filesystem + mongo
      // - freshUnderBase: should remain in both
      // - outsideDir stale: should be deleted from mongo, but filesystem should
      //   be preserved because it is outside baseDir.
      await upsertLocalSourceMapCacheEntry({
        projectId: projectIdStale1,
        repoIdentifier,
        version,
        localPath: staleUnderBase,
        lastUsedCycleCount: 1,
      });
      await upsertLocalSourceMapCacheEntry({
        projectId: projectIdFresh,
        repoIdentifier,
        version,
        localPath: freshUnderBase,
        lastUsedCycleCount: 8,
      });
      await upsertLocalSourceMapCacheEntry({
        projectId: projectIdStale2,
        repoIdentifier,
        version,
        localPath: outsideDir,
        lastUsedCycleCount: 1,
      });

      const projectCycleCounts = new Map<string, number>([
        [projectIdStale1, 10],
        [projectIdFresh, 10],
        [projectIdStale2, 10],
      ]);

      const deletedCount = await deleteLocalSourceMapCacheEntriesOlderThanCycle(
        staleMaxUnusedCycles,
        projectCycleCounts
      );
      expect(deletedCount).toBe(2);

      const cacheModel = getLocalSourceMapCacheModel();

      const freshDoc = await cacheModel
        .findOne({ projectId: projectIdFresh, repoIdentifier, version })
        .lean()
        .exec();
      expect(freshDoc).toBeTruthy();

      const stale1Doc = await cacheModel
        .findOne({ projectId: projectIdStale1, repoIdentifier, version })
        .lean()
        .exec();
      expect(stale1Doc).toBeNull();

      const stale2Doc = await cacheModel
        .findOne({ projectId: projectIdStale2, repoIdentifier, version })
        .lean()
        .exec();
      expect(stale2Doc).toBeNull();

      // Filesystem assertions
      let staleUnderBaseExists = true;
      try {
        await stat(staleUnderBase);
      } catch {
        staleUnderBaseExists = false;
      }
      expect(staleUnderBaseExists).toBe(false);

      let freshUnderBaseExists = true;
      try {
        await stat(freshUnderBase);
      } catch {
        freshUnderBaseExists = false;
      }
      expect(freshUnderBaseExists).toBe(true);

      let outsideDirExists = true;
      try {
        await stat(outsideDir);
      } catch {
        outsideDirExists = false;
      }
      expect(outsideDirExists).toBe(true);
  });
});

