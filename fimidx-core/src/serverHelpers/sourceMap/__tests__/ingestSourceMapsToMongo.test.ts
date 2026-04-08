import { mkdtemp, rm, writeFile, mkdir } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { beforeAll, describe, expect, it } from "vitest";
import { SourceMapGenerator } from "source-map";
import { getMongoConnection } from "../../../db/fimidx.mongo.js";
import {
  getSourceMapMetadataModel,
  getSourceMapSegmentsModel,
} from "../../../db/sourceMap.mongo.js";
import { ingestSourceMapsToMongo } from "../ingestSourceMapsToMongo.js";

describe("ingestSourceMapsToMongo (integration)", () => {
  beforeAll(async () => {
    const { promise } = getMongoConnection();
    await promise;
  });

  it("ingests metadata + per-line segments and is idempotent", async () => {
    const projectId = `proj_${Date.now()}`;
    const repoIdentifier = "repo_ingest";
    const version = "v_ingest";

    const baseDir = await mkdtemp(path.join(tmpdir(), "fimidx-ingest-"));
    try {
      // nested path ensures generatedFileFolders are populated
      await mkdir(path.join(baseDir, "dist"), { recursive: true });
      const mapPath = path.join(baseDir, "dist", "bundle.js.map");

      const gen = new SourceMapGenerator({ file: "bundle.js" });
      gen.addMapping({
        generated: { line: 1, column: 0 },
        original: { line: 10, column: 2 },
        source: "../../../src/original.ts",
        name: "myFn",
      });
      gen.setSourceContent(
        "../../../src/original.ts",
        "export function myFn() {}"
      );

      await writeFile(mapPath, gen.toString(), "utf-8");

      await ingestSourceMapsToMongo(projectId, repoIdentifier, version, baseDir);

      const metadataModel = getSourceMapMetadataModel();
      const meta = await metadataModel
        .findOne({
          projectId,
          repoIdentifier,
          version,
          generatedFile: "dist/bundle.js",
        })
        .lean()
        .exec();
      expect(meta).toBeTruthy();
      expect(meta?.generatedFileBasename).toBe("bundle.js");
      expect(meta?.generatedFileFolders).toEqual(["dist"]);
      expect(Array.isArray(meta?.sources)).toBe(true);
      // Raw sourcemap sources are preserved.
      expect(meta?.sources).toContain("../../../src/original.ts");
      expect(Array.isArray((meta as any)?.sourcesNormalized)).toBe(true);
      // Normalized sources are root-anchored and strip parent traversal.
      expect((meta as any)?.sourcesNormalized).toContain("src/original.ts");

      const segmentsModel = getSourceMapSegmentsModel();
      const seg = await segmentsModel
        .findOne({
          projectId,
          repoIdentifier,
          version,
          generatedFile: "dist/bundle.js",
          generatedLine: 1,
        })
        .lean()
        .exec();
      expect(seg?.segments?.length ?? 0).toBeGreaterThan(0);

      // Re-ingest should delete prior segments for that generatedFile/version and insert again.
      await ingestSourceMapsToMongo(projectId, repoIdentifier, version, baseDir);
      const segCount = await segmentsModel.countDocuments({
        projectId,
        repoIdentifier,
        version,
        generatedFile: "dist/bundle.js",
        generatedLine: 1,
      });
      expect(segCount).toBe(1);
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });
});

