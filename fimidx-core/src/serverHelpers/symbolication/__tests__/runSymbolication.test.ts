import { v7 as uuidv7 } from "uuid";
import { beforeAll, describe, expect, it } from "vitest";
import { getMongoConnection, getObjModel } from "../../../db/fimidx.mongo.js";
import {
  getSourceMapMetadataModel,
  getSourceMapSegmentsModel,
  getSymbolicatedLogTrackingModel,
  getSymbolicationStateModel,
} from "../../../db/sourceMap.mongo.js";
import { kObjTags } from "../../../definitions/obj.js";
import type { ISourceMapSegmentDoc } from "../../../definitions/sourceMap.js";
import { normalizePathSegment } from "../../../definitions/sourceMap.js";
import {
  upsertLocalSourceMapCacheEntry,
  upsertSourceMapUpload,
  upsertSymbolicationConfig,
} from "../../sourceMap/index.js";
import { runSymbolication } from "../runSymbolication.js";

describe("runSymbolication", () => {
  beforeAll(async () => {
    const { promise } = getMongoConnection();
    await promise;
  });

  it("updates matching logs, inserts tracking, and is idempotent", async () => {
    const projectId = `proj_sym_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    const repoIdentifier = `repo_sym_${Math.random().toString(36).slice(2, 7)}`;
    const version = `ver_sym_${Math.random().toString(36).slice(2, 7)}`;

    // Seed symbolication config
    await upsertSymbolicationConfig({
      projectId,
      fieldsToSymbolicate: ["stack"],
      repoIdFields: ["repo"],
      versionFields: ["version"],
    });

    // Seed source map upload presence so getHasSourceMapSet is non-empty.
    await upsertSourceMapUpload({
      projectId,
      repoIdentifier,
      version,
      fimidaraPath: "fimidara://dummy/source-maps.zip",
      isZip: true,
      uploadedAt: new Date(),
      createdBy: "test",
    });

    // Satisfy ensureLocalSourceMap via local cache (avoids any fimidara calls).
    await upsertLocalSourceMapCacheEntry({
      projectId,
      repoIdentifier,
      version,
      localPath: "/tmp/fimidx-symbolication-test-map",
      lastUsedCycleCount: 0,
    });

    // Seed source map metadata + segments so Mongo lookup can symbolicate.
    const metadataModel = getSourceMapMetadataModel();
    const segmentsModel = getSourceMapSegmentsModel();

    await metadataModel.insertMany([
      {
        projectId,
        repoIdentifier,
        version,
        generatedFile: "dist/bundle.js",
        generatedFileBasename: "bundle.js",
        generatedFileFolders: ["dist"],
        sources: ["src/original.ts"],
        sourcesNormalized: ["src/original.ts"],
        names: ["origFn"],
        ingestedAt: new Date(),
      },
    ]);

    const segDoc: ISourceMapSegmentDoc = {
      projectId,
      repoIdentifier,
      version,
      generatedFile: "dist/bundle.js",
      generatedLine: 1,
      segments: [
        {
          generatedColumn: 0,
          sourceIndex: 0,
          originalLine: 42,
          originalColumn: 7,
          nameIndex: 0,
        },
      ],
    };
    await segmentsModel.insertMany([segDoc]);

    // Seed a log that should be symbolicated.
    const createdAt = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7); // 7 days ago
    const logId = uuidv7();
    const stack = [
      "Error: boom",
      "    at foo (https://cdn.example.com/dist/bundle.js:1:7)",
    ].join("\n");

    const objModel = getObjModel();
    await objModel.create({
      id: logId,
      tag: kObjTags.log,
      projectId,
      groupId: "g1",
      createdAt,
      updatedAt: createdAt,
      createdBy: "tester",
      createdByType: "user",
      updatedBy: "tester",
      updatedByType: "user",
      deletedAt: null,
      deletedBy: null,
      deletedByType: null,
      shouldIndex: true,
      fieldsToIndex: null,
      objRecord: {
        repo: repoIdentifier,
        version,
        stack,
      },
    });

    // Also seed a log that should *not* be symbolicated (wrong repo).
    const log2Id = uuidv7();
    const stack2 = stack;
    await objModel.create({
      id: log2Id,
      tag: kObjTags.log,
      projectId,
      groupId: "g1",
      createdAt,
      updatedAt: createdAt,
      createdBy: "tester",
      createdByType: "user",
      updatedBy: "tester",
      updatedByType: "user",
      deletedAt: null,
      deletedBy: null,
      deletedByType: null,
      shouldIndex: true,
      fieldsToIndex: null,
      objRecord: {
        repo: `${repoIdentifier}_wrong`,
        version,
        stack: stack2,
      },
    });

    // Run symbolication
    process.env.SYMBOLICATION_MAX_AGE_MS = "86400000"; // 1 day
    await runSymbolication({ storageType: "mongo" });

    const updated1 = await objModel.findOne({ id: logId }).lean().exec();
    const updatedStack1 = (updated1 as any)?.objRecord?.stack;
    expect(updatedStack1).toContain(
      "https://cdn.example.com/src/original.ts:42:7"
    );

    const updated2 = await objModel.findOne({ id: log2Id }).lean().exec();
    const updatedStack2 = (updated2 as any)?.objRecord?.stack;
    expect(updatedStack2).toContain(
      "https://cdn.example.com/dist/bundle.js:1:7"
    );

    const trackingModel = getSymbolicatedLogTrackingModel();
    const tracking1 = await trackingModel
      .findOne({ logId, fieldPath: "stack" })
      .lean()
      .exec();
    expect(tracking1).toBeTruthy();

    const tracking2 = await trackingModel
      .findOne({ logId: log2Id, fieldPath: "stack" })
      .lean()
      .exec();
    expect(tracking2).toBeNull();

    const stateModel = getSymbolicationStateModel();
    const stateAfter1 = await stateModel.findOne({ projectId }).lean().exec();
    expect(stateAfter1?.cycleCount).toBeGreaterThanOrEqual(1);
    const cycleCount1 = stateAfter1?.cycleCount ?? 0;

    // Run again to test idempotency (no new tracking rows, cycleCount increments).
    await runSymbolication({ storageType: "mongo" });

    const updatedAgain1 = await objModel.findOne({ id: logId }).lean().exec();
    const updatedAgainStack1 = (updatedAgain1 as any)?.objRecord?.stack;
    expect(updatedAgainStack1).toBe(updatedStack1);

    const tracking1Again = await trackingModel
      .findOne({ logId, fieldPath: "stack" })
      .lean()
      .exec();
    expect(tracking1Again).toBeTruthy();

    const stateAfter2 = await stateModel.findOne({ projectId }).lean().exec();
    expect(stateAfter2?.cycleCount).toBeGreaterThan(cycleCount1);
  });

  it("matches logs that use original repo/version against normalized upload keys", async () => {
    const projectId = `proj_sym_norm_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    const rawRepo = `fimidx-monorepo/fimidx-node-server_${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    const rawVersion = `v1.0.0/${Math.random().toString(36).slice(2, 5)}`;
    const repoIdentifier = normalizePathSegment(rawRepo);
    const version = normalizePathSegment(rawVersion);

    await upsertSymbolicationConfig({
      projectId,
      fieldsToSymbolicate: ["stack"],
      repoIdFields: ["repo"],
      versionFields: ["version"],
    });

    await upsertSourceMapUpload({
      projectId,
      repoIdentifier,
      version,
      fimidaraPath: "fimidara://dummy/source-maps.zip",
      isZip: true,
      uploadedAt: new Date(),
      createdBy: "test",
      repoIdentifierDisplay: rawRepo,
      versionDisplay: rawVersion,
    });

    await upsertLocalSourceMapCacheEntry({
      projectId,
      repoIdentifier,
      version,
      localPath: "/tmp/fimidx-symbolication-test-map-norm",
      lastUsedCycleCount: 0,
    });

    const metadataModel = getSourceMapMetadataModel();
    const segmentsModel = getSourceMapSegmentsModel();

    await metadataModel.insertMany([
      {
        projectId,
        repoIdentifier,
        version,
        generatedFile: "dist/bundle.js",
        generatedFileBasename: "bundle.js",
        generatedFileFolders: ["dist"],
        sources: ["src/original.ts"],
        sourcesNormalized: ["src/original.ts"],
        names: ["origFn"],
        ingestedAt: new Date(),
      },
    ]);

    await segmentsModel.insertMany([
      {
        projectId,
        repoIdentifier,
        version,
        generatedFile: "dist/bundle.js",
        generatedLine: 1,
        segments: [
          {
            generatedColumn: 0,
            sourceIndex: 0,
            originalLine: 10,
            originalColumn: 3,
            nameIndex: 0,
          },
        ],
      } satisfies ISourceMapSegmentDoc,
    ]);

    const createdAt = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
    const logId = uuidv7();
    const stack = [
      "Error: boom",
      "    at foo (https://cdn.example.com/dist/bundle.js:1:7)",
    ].join("\n");

    const objModel = getObjModel();
    await objModel.create({
      id: logId,
      tag: kObjTags.log,
      projectId,
      groupId: "g1",
      createdAt,
      updatedAt: createdAt,
      createdBy: "tester",
      createdByType: "user",
      updatedBy: "tester",
      updatedByType: "user",
      deletedAt: null,
      deletedBy: null,
      deletedByType: null,
      shouldIndex: true,
      fieldsToIndex: null,
      objRecord: {
        repo: rawRepo,
        version: rawVersion,
        stack,
      },
    });

    process.env.SYMBOLICATION_MAX_AGE_MS = "86400000";
    await runSymbolication({ storageType: "mongo" });

    const updated = await objModel.findOne({ id: logId }).lean().exec();
    expect((updated as any)?.objRecord?.stack).toContain(
      "https://cdn.example.com/src/original.ts:10:3"
    );
  });
});
