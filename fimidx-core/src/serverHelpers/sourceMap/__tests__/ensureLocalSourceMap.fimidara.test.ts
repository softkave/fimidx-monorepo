import AdmZip from "adm-zip";
import { mkdir, mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { SourceMapGenerator } from "source-map";
import { v7 as uuidv7 } from "uuid";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { getMongoConnection, getObjModel } from "../../../db/fimidx.mongo.js";
import {
  getLocalSourceMapCacheModel,
  getSourceMapMetadataModel,
  getSourceMapUploadModel,
  getSymbolicatedLogTrackingModel,
  getSymbolicationStateModel,
} from "../../../db/sourceMap.mongo.js";
import type { IObj } from "../../../definitions/obj.js";
import { kObjTags } from "../../../definitions/obj.js";
import { ensureProjectFimidaraToken } from "../../fimidara/ensureProjectFimidaraToken.js";
import { buildSourceMapZipFilePath } from "../../fimidara/fimidaraClient.js";
import { uploadLocalFileToFimidara } from "../../fimidara/uploadLocalFileToFimidara.js";
import { runSymbolication } from "../../symbolication/runSymbolication.js";
import { ensureLocalSourceMap } from "../ensureLocalSourceMap.js";
import { upsertSourceMapUpload } from "../upsertSourceMapUpload.js";
import { upsertSymbolicationConfig } from "../upsertSymbolicationConfig.js";

describe("ensureLocalSourceMap + runSymbolication (real fimidara, integration)", () => {
  let prevLocalDir: string | undefined;
  let localDir: string | null = null;
  let mapRoot: string | null = null;
  let zipTmpDir: string | null = null;

  afterEach(async () => {
    // Cleanup even if assertions fail.
    if (localDir) await rm(localDir, { recursive: true, force: true });
    if (mapRoot) await rm(mapRoot, { recursive: true, force: true });
    if (zipTmpDir) await rm(zipTmpDir, { recursive: true, force: true });

    localDir = null;
    mapRoot = null;
    zipTmpDir = null;

    // Restore env var for isolation across tests.
    if (prevLocalDir !== undefined) {
      process.env.FIMIDX_SOURCE_MAPS_LOCAL_DIR = prevLocalDir;
    } else {
      delete process.env.FIMIDX_SOURCE_MAPS_LOCAL_DIR;
    }
  });

  beforeAll(async () => {
    const { promise } = getMongoConnection();
    await promise;
    prevLocalDir = process.env.FIMIDX_SOURCE_MAPS_LOCAL_DIR;
  });

  it("downloads zip from fimidara, ingests, then runSymbolication updates logs + tracking + state", async () => {
    const projectId = `proj_fimidara_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const repoIdentifier = `repo_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const version = `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Use a temp local source maps dir for this test run.
    localDir = await mkdtemp(path.join(tmpdir(), "fimidx-local-maps-"));
    process.env.FIMIDX_SOURCE_MAPS_LOCAL_DIR = localDir;

    // Make a tiny source map file and zip it.
    mapRoot = await mkdtemp(path.join(tmpdir(), "fimidx-map-src-"));
    const distDir = path.join(mapRoot, "dist");
    await mkdir(distDir, { recursive: true });
    const mapFile = path.join(distDir, "bundle.js.map");

    const gen = new SourceMapGenerator({ file: "bundle.js" });
    gen.addMapping({
      generated: { line: 1, column: 0 },
      original: { line: 42, column: 7 },
      source: "src/original.ts",
      name: "origFn",
    });
    gen.setSourceContent("src/original.ts", "export function origFn() {}");
    await writeFile(mapFile, gen.toString(), "utf-8");

    zipTmpDir = await mkdtemp(path.join(tmpdir(), "fimidx-zip-"));
    const zipPath = path.join(zipTmpDir, "source-maps.zip");
    const zip = new AdmZip();
    zip.addLocalFolder(mapRoot);
    zip.writeZip(zipPath);

    // Create/encode a project agent token and upload the zip to the expected
    // file path.
    const { encodedToken } = await ensureProjectFimidaraToken(projectId);
    const fimidaraPath = buildSourceMapZipFilePath(
      projectId,
      repoIdentifier,
      version
    );
    await uploadLocalFileToFimidara(zipPath, fimidaraPath, encodedToken);

    // Record that the upload exists for this project/repo/version (Mongo is real).
    await upsertSourceMapUpload({
      projectId,
      repoIdentifier,
      version,
      fimidaraPath,
      isZip: true,
      uploadedAt: new Date(),
      createdBy: "test",
    });

    // Ensure local cache + ingestion occurs via real fimidara download.
    const localPath = await ensureLocalSourceMap(
      projectId,
      repoIdentifier,
      version,
      1
    );
    expect(localPath).toBeTruthy();

    const cacheModel = getLocalSourceMapCacheModel();
    const cacheDoc = await cacheModel
      .findOne({ projectId, repoIdentifier, version })
      .lean()
      .exec();
    expect(cacheDoc?.localPath).toBe(localPath);

    const metaModel = getSourceMapMetadataModel();
    const meta = await metaModel
      .findOne({
        projectId,
        repoIdentifier,
        version,
        generatedFile: "dist/bundle.js",
      })
      .lean()
      .exec();
    expect(meta).toBeTruthy();

    // Configure symbolication for this project.
    await upsertSymbolicationConfig({
      projectId,
      fieldsToSymbolicate: ["stack"],
      repoIdFields: ["repo"],
      versionFields: ["version"],
    });

    // Seed a log object that should be symbolicated.
    const objModel = getObjModel();
    const createdAt = new Date();
    const logId = uuidv7();
    const stack = [
      "Error: boom",
      "    at foo (https://cdn.example.com/dist/bundle.js:1:0)",
    ].join("\n");
    const logObj: IObj = {
      id: logId,
      tag: kObjTags.log,
      projectId,
      groupId: "g",
      createdAt,
      updatedAt: createdAt,
      createdBy: "t",
      createdByType: "test",
      updatedBy: "t",
      updatedByType: "test",
      deletedAt: null,
      deletedBy: null,
      deletedByType: null,
      shouldIndex: true,
      fieldsToIndex: null,
      objRecord: {
        repo: repoIdentifier,
        version,
        stack,
      } as any,
    };
    await objModel.create(logObj);

    // Force symbolication to include "now" by setting maxAge=0.
    process.env.SYMBOLICATION_MAX_AGE_MS = "0";

    await runSymbolication({ storageType: "mongo" });

    const updated = await objModel.findOne({ id: logId }).lean().exec();
    const updatedStack = (updated as any)?.objRecord?.stack;
    expect(typeof updatedStack).toBe("string");
    expect(updatedStack).toContain("src/original.ts:42:7");

    // Tracking entry created.
    const trackingModel = getSymbolicatedLogTrackingModel();
    const tracking = await trackingModel
      .findOne({ logId, fieldPath: "stack" })
      .lean()
      .exec();
    expect(tracking).toBeTruthy();

    // State advanced.
    const stateModel = getSymbolicationStateModel();
    const state = await stateModel.findOne({ projectId }).lean().exec();
    expect(state?.cycleCount ?? 0).toBeGreaterThanOrEqual(1);
    expect(state?.lastProcessedTimestampMs ?? 0).toBeGreaterThan(0);

    // Upload record exists (sanity).
    const uploadModel = getSourceMapUploadModel();
    const upload = await uploadModel
      .findOne({ projectId, repoIdentifier, version })
      .lean()
      .exec();
    expect(upload?.fimidaraPath).toBe(fimidaraPath);
  }, 60_000);
});
