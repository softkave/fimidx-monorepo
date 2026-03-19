import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { getMongoConnection } from "../../../db/fimidx.mongo.js";
import {
  getLocalSourceMapCacheModel,
  getSourceMapMetadataModel,
} from "../../../db/sourceMap.mongo.js";
import { upsertLocalSourceMapCacheEntry } from "../localSourceMapCache.js";
import { ensureLocalSourceMap } from "../ensureLocalSourceMap.js";

describe("ensureLocalSourceMap (integration - no fimidara)", () => {
  let localPath: string | null = null;

  beforeAll(async () => {
    const { promise } = getMongoConnection();
    await promise;
  });

  afterEach(async () => {
    if (localPath) {
      await rm(localPath, { recursive: true, force: true });
      localPath = null;
    }
  });

  it("cache-hit returns cached localPath and updates lastUsedCycleCount (no ingestion)", async () => {
    const projectId = `proj_ensure_cache_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    const repoIdentifier = "repo_ensure_cache";
    const version = "v_ensure_cache";

    localPath = await mkdtemp(path.join(tmpdir(), "fimidx-ens-local-"));
      await upsertLocalSourceMapCacheEntry({
        projectId,
        repoIdentifier,
        version,
        localPath,
        lastUsedCycleCount: 0,
      });

      const returned = await ensureLocalSourceMap(projectId, repoIdentifier, version, 3);
      expect(returned).toBe(localPath);

      const cacheModel = getLocalSourceMapCacheModel();
      const cacheDoc = await cacheModel
        .findOne({ projectId, repoIdentifier, version })
        .lean()
        .exec();
      expect(cacheDoc?.localPath).toBe(localPath);
      expect(cacheDoc?.lastUsedCycleCount).toBe(3);

      // Cache-hit path should not ingest any source maps.
      const metadataModel = getSourceMapMetadataModel();
      const metadataCount = await metadataModel.countDocuments({
        projectId,
        repoIdentifier,
        version,
      });
      expect(metadataCount).toBe(0);
  });

  it("returns null when neither cache nor upload exists (no fimidara)", async () => {
    const projectId = `proj_ensure_no_upload_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    const repoIdentifier = "repo_ensure_no_upload";
    const version = "v_ensure_no_upload";

    const localPathOrNull = await ensureLocalSourceMap(
      projectId,
      repoIdentifier,
      version,
      1
    );
    expect(localPathOrNull).toBeNull();

    const cacheModel = getLocalSourceMapCacheModel();
    const cacheCount = await cacheModel.countDocuments({
      projectId,
      repoIdentifier,
      version,
    });
    expect(cacheCount).toBe(0);
  });
});

