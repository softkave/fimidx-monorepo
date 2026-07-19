import { getObjModel } from "fimidx-core/db/fimidx.mongo";
import {
  getSourceMapMetadataModel,
  getSourceMapUploadModel,
  getSymbolicationStateModel,
} from "fimidx-core/db/sourceMap.mongo";
import { kObjTags } from "fimidx-core/definitions/obj";
import {
  getSourceMapUpload,
  getSourceMapUploadsPendingUnzipPage,
  upsertSymbolicationConfig,
} from "fimidx-core/serverHelpers/index";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  getEnvOrThrow,
  pExecFile,
  poll,
  postInternalCallback,
} from "./testHelpers.js";

describe("symbolication (e2e)", () => {
  const fixtureDir = path.resolve(
    import.meta.dirname,
    "../../symbolication-sample-app"
  );

  it("uploads source maps, ingests logs, and symbolicates stacks (folder best-match)", async () => {
    const serverUrl = getEnvOrThrow("FIMIDX_SERVER_URL");
    const projectId = getEnvOrThrow("FIMIDX_PROJECT_ID");
    getEnvOrThrow("FIMIDX_AUTH_TOKEN");
    const repoIdentifier = getEnvOrThrow("SYM_REPO");
    const version = getEnvOrThrow("SYM_VERSION");

    const nodeServerUrl = getEnvOrThrow("FIMIDX_INTERNAL_NODE_SERVER_URL");
    const internalKey = getEnvOrThrow("FIMIDX_INTERNAL_INTERNAL_ACCESS_KEY");
    const unzipUrl = getEnvOrThrow("UNZIP_SOURCE_MAPS_URL");
    const symbolicationUrl = getEnvOrThrow("SYMBOLICATION_URL");

    // Fresh logs will not be processed unless maxAgeMs is 0 (see runSymbolication).
    if (process.env.SYMBOLICATION_MAX_AGE_MS !== "0") {
      throw new Error(
        [
          "This e2e test requires SYMBOLICATION_MAX_AGE_MS=0 in the node-server environment.",
          `Got SYMBOLICATION_MAX_AGE_MS=${JSON.stringify(
            process.env.SYMBOLICATION_MAX_AGE_MS
          )}`,
          `Node server base: ${nodeServerUrl}`,
        ].join("\n")
      );
    }

    console.log("Symbolication e2e env", {
      projectId,
      repoIdentifier,
      version,
      serverUrl,
      nodeServerUrl,
      unzipUrl,
      symbolicationUrl,
      SYMBOLICATION_MAX_AGE_MS: process.env.SYMBOLICATION_MAX_AGE_MS,
    });

    console.log("Upserting symbolication config");

    await upsertSymbolicationConfig({
      projectId,
      fieldsToSymbolicate: ["stack"],
      repoIdFields: ["repo"],
      versionFields: ["version"],
    });

    console.log("Upserted symbolication config");

    // Upload source maps using fimidx-js CLI through the fixture package script.
    await pExecFile("pnpm", ["upload-source-maps"], {
      cwd: fixtureDir,
      env: process.env,
    });

    console.log("Uploaded source maps");

    const upload = await getSourceMapUpload(projectId, repoIdentifier, version);
    if (!upload) {
      throw new Error(
        [
          "Upload finished but no source_map_uploads row was found.",
          "Check that the sample-app upload CLI uses the same projectId/repo/version",
          "and Mongo URI as this e2e / node-server.",
          `Looked up projectId=${projectId} repoIdentifier=${repoIdentifier} version=${version}`,
        ].join("\n")
      );
    }
    if (!upload.isZip) {
      throw new Error(
        `Expected zip upload for ${projectId}/${repoIdentifier}/${version}, got isZip=${upload.isZip}`
      );
    }

    const metadataModel = getSourceMapMetadataModel();
    const existingMetadataCount = await metadataModel
      .countDocuments({ projectId, repoIdentifier, version })
      .exec();

    // Prior runs may leave localZipIngested=true with no metadata (or stale).
    // Reset so unzip will process this upload again.
    if (upload.localZipIngested === true && existingMetadataCount === 0) {
      console.log(
        "Resetting stale localZipIngested=true (no metadata present yet)"
      );
      await getSourceMapUploadModel().updateOne(
        { projectId, repoIdentifier, version },
        { $set: { localZipIngested: false } }
      );
    }

    const pending = await getSourceMapUploadsPendingUnzipPage({
      page: 1,
      pageSize: 100,
    });
    const pendingForTarget = pending.items.filter(
      (u) =>
        u.projectId === projectId &&
        u.repoIdentifier === repoIdentifier &&
        u.version === version
    );
    console.log("Pending unzip uploads", {
      totalPending: pending.items.length,
      pendingForTarget: pendingForTarget.length,
      localZipIngested: upload.localZipIngested,
      existingMetadataCount,
    });
    if (pendingForTarget.length === 0 && existingMetadataCount === 0) {
      throw new Error(
        [
          "No pending zip upload for this project/repo/version, and no metadata yet.",
          "Unzip would no-op and the metadata poll would time out.",
          `projectId=${projectId} repoIdentifier=${repoIdentifier} version=${version}`,
          `upload.localZipIngested=${String(upload.localZipIngested)}`,
          `pendingTotal=${pending.items.length}`,
        ].join("\n")
      );
    }

    // Unzip + ingest locally (node-server endpoint awaits work).
    await postInternalCallback(unzipUrl, internalKey);

    console.log("Unzipped source maps");

    const uploadAfterUnzip = await getSourceMapUpload(
      projectId,
      repoIdentifier,
      version
    );
    const metadataAfterUnzip = await metadataModel
      .countDocuments({ projectId, repoIdentifier, version })
      .exec();
    if (metadataAfterUnzip === 0) {
      throw new Error(
        [
          "Unzip callback returned OK but source_map_metadata is still empty.",
          "Check node-server logs for 'Unzipped source map upload locally' vs silent empty pending,",
          "fimidara download errors, or SOURCE_MAPS_LOCAL_DIR / Mongo URI mismatch.",
          `projectId=${projectId} repoIdentifier=${repoIdentifier} version=${version}`,
          `upload.localZipIngested=${String(uploadAfterUnzip?.localZipIngested)}`,
          `upload.isZip=${String(uploadAfterUnzip?.isZip)}`,
        ].join("\n")
      );
    }

    // Poll until metadata is ingested (already non-zero; keep for eventual consistency).
    await poll({
      name: "source_map_metadata ingestion",
      timeoutMs: 60_000,
      intervalMs: 2_500,
      fn: async () => {
        const count = await metadataModel
          .countDocuments({
            projectId,
            repoIdentifier,
            version,
          })
          .exec();
        return count > 0 ? count : null;
      },
    });

    console.log("Ingested source maps metadata");

    const startedAt = new Date();

    // Emit a few logs, then exit.
    await pExecFile("pnpm", ["start"], {
      cwd: fixtureDir,
      env: process.env,
    });

    console.log("Started fixture");

    const objModel = getObjModel();
    const logs = await poll({
      name: "fixture logs ingested",
      timeoutMs: 30_000,
      intervalMs: 1_000,
      fn: async () => {
        const found = await objModel
          .find({
            tag: kObjTags.log,
            projectId,
            deletedAt: null,
            createdAt: { $gte: startedAt },
            "objRecord.repo": repoIdentifier,
            "objRecord.version": version,
            "objRecord.stack": { $type: "string" },
          })
          .lean()
          .exec();
        return found.length >= 6 ? (found as any[]) : null;
      },
    });

    console.log("Ingested fixture logs");

    // Ensure we emitted all stack URL styles before symbolication.
    const rawStacks = logs
      .map((l: any) => l?.objRecord?.stack)
      .filter((s: any) => typeof s === "string") as string[];
    expect(rawStacks.some((s) => s.includes("webpack:///"))).toBe(true);
    expect(rawStacks.some((s) => s.includes("file:///"))).toBe(true);
    expect(
      rawStacks.some((s) => s.includes("http://") || s.includes("https://"))
    ).toBe(true);

    console.log("Ensured we emitted all stack URL styles before symbolication");

    const stateModel = getSymbolicationStateModel();
    const baselineState = await stateModel.findOne({ projectId }).lean().exec();
    const baselineCycleCount = baselineState?.cycleCount ?? 0;
    const baselineLastCycleAtMs = baselineState?.lastCycleAt
      ? new Date(baselineState.lastCycleAt).getTime()
      : 0;

    // Trigger symbolication; node-server runs it asynchronously after 200.
    await postInternalCallback(symbolicationUrl, internalKey);

    console.log("Triggered symbolication");

    await poll({
      name: "symbolication_state tick (runSymbolication finished)",
      timeoutMs: 30_000,
      intervalMs: 2_000,
      fn: async () => {
        const doc = await stateModel.findOne({ projectId }).lean().exec();
        if (!doc) return null;
        const cycle = doc.cycleCount ?? 0;
        const lastAt = doc.lastCycleAt
          ? new Date(doc.lastCycleAt).getTime()
          : 0;
        const ticked =
          cycle > baselineCycleCount || lastAt > baselineLastCycleAtMs;
        return ticked ? true : null;
      },
    });

    console.log("Symbolication state ticked");

    const foundAfter = await objModel
      .find({ id: { $in: logs.map((l) => l.id) } })
      .lean()
      .exec();
    console.log("Found after symbolication");
    const symbolicated = foundAfter
      .map((l: any) => l?.objRecord?.stack)
      .filter((s: any) => typeof s === "string") as string[];

    console.log("Symbolicated stacks");

    // Sanity: stacks should no longer reference the dist .js files for those frames.
    expect(symbolicated.join("\n")).not.toContain(
      "webpack:///./pkgA/shared/errorSite.js"
    );
    expect(symbolicated.join("\n")).not.toContain(
      "webpack:///./pkgB/shared/errorSite.js"
    );
    expect(symbolicated.join("\n")).not.toContain(
      "file:///pkgA/shared/errorSite.js"
    );
    expect(symbolicated.join("\n")).not.toContain(
      "file:///pkgB/shared/errorSite.js"
    );

    // And should be symbolicated to original sources.
    // Preserve original URL scheme/host for those frames.
    expect(symbolicated.join("\n")).toContain(
      "http://localhost:9999/src/pkgA/shared/errorSite.ts"
    );
    expect(symbolicated.join("\n")).toContain(
      "file:///src/pkgB/shared/errorSite.ts"
    );
    expect(symbolicated.join("\n")).toContain("webpack:///src/rootError.ts");
    expect(symbolicated.join("\n")).toContain("webpack:///src/extraError.ts");

    // Extra: ensure we aren't accidentally pointing at the API server URL by mistake.
    expect(serverUrl).toMatch(/^https?:\/\//);
  }, 120_000);
});
