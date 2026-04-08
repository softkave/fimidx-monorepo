import { getObjModel } from "fimidx-core/db/fimidx.mongo";
import {
  getSourceMapMetadataModel,
  getSymbolicationStateModel,
} from "fimidx-core/db/sourceMap.mongo";
import { kObjTags } from "fimidx-core/definitions/obj";
import { upsertSymbolicationConfig } from "fimidx-core/serverHelpers/index";
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

    await upsertSymbolicationConfig({
      projectId,
      fieldsToSymbolicate: ["stack"],
      repoIdFields: ["repo"],
      versionFields: ["version"],
    });

    // Upload source maps using fimidx-js CLI through the fixture package script.
    await pExecFile("pnpm", ["upload-source-maps"], {
      cwd: fixtureDir,
      env: process.env,
    });

    // Unzip + ingest locally (node-server endpoint awaits work).
    await postInternalCallback(unzipUrl, internalKey);

    // Poll until metadata is ingested.
    const metadataModel = getSourceMapMetadataModel();
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

    const startedAt = new Date();

    // Emit a few logs, then exit.
    await pExecFile("pnpm", ["start"], {
      cwd: fixtureDir,
      env: process.env,
    });

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

    // Ensure we emitted all stack URL styles before symbolication.
    const rawStacks = logs
      .map((l: any) => l?.objRecord?.stack)
      .filter((s: any) => typeof s === "string") as string[];
    expect(rawStacks.some((s) => s.includes("webpack:///"))).toBe(true);
    expect(rawStacks.some((s) => s.includes("file:///"))).toBe(true);
    expect(
      rawStacks.some((s) => s.includes("http://") || s.includes("https://"))
    ).toBe(true);

    const stateModel = getSymbolicationStateModel();
    const baselineState = await stateModel.findOne({ projectId }).lean().exec();
    const baselineCycleCount = baselineState?.cycleCount ?? 0;
    const baselineLastCycleAtMs = baselineState?.lastCycleAt
      ? new Date(baselineState.lastCycleAt).getTime()
      : 0;

    // Trigger symbolication; node-server runs it asynchronously after 200.
    await postInternalCallback(symbolicationUrl, internalKey);

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

    const foundAfter = await objModel
      .find({ id: { $in: logs.map((l) => l.id) } })
      .lean()
      .exec();
    const symbolicated = foundAfter
      .map((l: any) => l?.objRecord?.stack)
      .filter((s: any) => typeof s === "string") as string[];

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
