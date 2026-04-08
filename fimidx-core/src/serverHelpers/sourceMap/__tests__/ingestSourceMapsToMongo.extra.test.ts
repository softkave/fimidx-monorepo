import { mkdtemp, rm, writeFile, mkdir } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { SourceMapGenerator } from "source-map";
import { getMongoConnection } from "../../../db/fimidx.mongo.js";
import {
  getSourceMapMetadataModel,
  getSourceMapSegmentsModel,
} from "../../../db/sourceMap.mongo.js";
import { ingestSourceMapsToMongo } from "../ingestSourceMapsToMongo.js";

describe("ingestSourceMapsToMongo (integration - extra cases)", () => {
  let baseDir: string | null = null;

  afterEach(async () => {
    if (baseDir) {
      await rm(baseDir, { recursive: true, force: true });
      baseDir = null;
    }
  });

  beforeAll(async () => {
    const { promise } = getMongoConnection();
    await promise;
  });

  it("stores nested generatedFileFolders and sets nameIndex=-1 when no names", async () => {
    const projectId = `proj_ingest_extra_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    const repoIdentifier = "repo_ingest_extra_names";
    const version = "v_ingest_extra_names";

    baseDir = await mkdtemp(path.join(tmpdir(), "fimidx-ingest-extra-"));
      const distSubDir = path.join(baseDir, "dist", "sub");
      await mkdir(distSubDir, { recursive: true });
      const mapPath = path.join(distSubDir, "bundle.js.map");

      const gen = new SourceMapGenerator({ file: "bundle.js" });
      // Intentionally omit `name` in addMapping so SourceMapGenerator does not
      // populate names; ingest should store nameIndex = -1.
      gen.addMapping({
        generated: { line: 1, column: 0 },
        original: { line: 10, column: 2 },
        source: "../src/original.ts",
      });
      gen.addMapping({
        generated: { line: 2, column: 0 },
        original: { line: 20, column: 3 },
        source: "./src\\original.ts",
      });
      gen.setSourceContent("../src/original.ts", "export {}");

      await writeFile(mapPath, gen.toString(), "utf-8");

      await ingestSourceMapsToMongo(
        projectId,
        repoIdentifier,
        version,
        baseDir
      );

      const generatedFile = "dist/sub/bundle.js";
      const metadataModel = getSourceMapMetadataModel();
      const meta = await metadataModel
        .findOne({ projectId, repoIdentifier, version, generatedFile })
        .lean()
        .exec();

      expect(meta).toBeTruthy();
      expect(meta?.generatedFileBasename).toBe("bundle.js");
      expect(meta?.generatedFileFolders).toEqual(["dist", "sub"]);
      // Raw sources are preserved exactly as emitted by the sourcemap.
      expect(meta?.sources).toContain("../src/original.ts");
      expect(meta?.sources).toContain("./src\\original.ts");
      // Normalized sources are root-anchored, strip "../" and "./", and use forward slashes.
      expect((meta as any)?.sourcesNormalized).toContain("src/original.ts");
      // Both entries should normalize to the same canonical path.
      expect((meta as any)?.sourcesNormalized.filter((s: string) => s === "src/original.ts").length).toBe(2);

      const segmentsModel = getSourceMapSegmentsModel();
      const seg1 = await segmentsModel
        .findOne({
          projectId,
          repoIdentifier,
          version,
          generatedFile,
          generatedLine: 1,
        })
        .lean()
        .exec();
      expect(seg1?.segments?.length ?? 0).toBe(1);
      expect(seg1?.segments?.[0]?.originalLine).toBe(10);
      expect(seg1?.segments?.[0]?.nameIndex).toBe(-1);

      const seg2 = await segmentsModel
        .findOne({
          projectId,
          repoIdentifier,
          version,
          generatedFile,
          generatedLine: 2,
        })
        .lean()
        .exec();
      expect(seg2?.segments?.length ?? 0).toBe(1);
      expect(seg2?.segments?.[0]?.originalLine).toBe(20);
      expect(seg2?.segments?.[0]?.nameIndex).toBe(-1);

      // Re-ingest should delete previous segments for that generatedFile/version
      // and insert again (idempotency).
      await ingestSourceMapsToMongo(
        projectId,
        repoIdentifier,
        version,
        baseDir
      );
      const seg1Count = await segmentsModel.countDocuments({
        projectId,
        repoIdentifier,
        version,
        generatedFile,
        generatedLine: 1,
      });
      const seg2Count = await segmentsModel.countDocuments({
        projectId,
        repoIdentifier,
        version,
        generatedFile,
        generatedLine: 2,
      });
      expect(seg1Count).toBe(1);
      expect(seg2Count).toBe(1);
  });

  it("ingests multiple .map files under a directory recursively", async () => {
    const projectId = `proj_ingest_extra_multi_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    const repoIdentifier = "repo_ingest_extra_multi";
    const version = "v_ingest_extra_multi";

    baseDir = await mkdtemp(path.join(tmpdir(), "fimidx-ingest-extra-"));
      const map1Dir = path.join(baseDir, "dist", "a");
      const map2Dir = path.join(baseDir, "dist", "b");
      await mkdir(map1Dir, { recursive: true });
      await mkdir(map2Dir, { recursive: true });

      const map1Path = path.join(map1Dir, "bundle1.js.map");
      const map2Path = path.join(map2Dir, "bundle2.js.map");

      const gen1 = new SourceMapGenerator({ file: "bundle1.js" });
      gen1.addMapping({
        generated: { line: 1, column: 0 },
        original: { line: 11, column: 4 },
        source: "src/original1.ts",
      });
      gen1.setSourceContent("src/original1.ts", "export {}");

      const gen2 = new SourceMapGenerator({ file: "bundle2.js" });
      gen2.addMapping({
        generated: { line: 1, column: 0 },
        original: { line: 22, column: 5 },
        source: "src/original2.ts",
      });
      gen2.setSourceContent("src/original2.ts", "export {}");

      await writeFile(map1Path, gen1.toString(), "utf-8");
      await writeFile(map2Path, gen2.toString(), "utf-8");

      await ingestSourceMapsToMongo(
        projectId,
        repoIdentifier,
        version,
        baseDir
      );

      const metadataModel = getSourceMapMetadataModel();
      const meta1 = await metadataModel
        .findOne({
          projectId,
          repoIdentifier,
          version,
          generatedFile: "dist/a/bundle1.js",
        })
        .lean()
        .exec();
      const meta2 = await metadataModel
        .findOne({
          projectId,
          repoIdentifier,
          version,
          generatedFile: "dist/b/bundle2.js",
        })
        .lean()
        .exec();

      expect(meta1?.generatedFileBasename).toBe("bundle1.js");
      expect(meta1?.generatedFileFolders).toEqual(["dist", "a"]);
      expect(meta1?.sources).toContain("src/original1.ts");
      expect((meta1 as any)?.sourcesNormalized).toContain("src/original1.ts");

      expect(meta2?.generatedFileBasename).toBe("bundle2.js");
      expect(meta2?.generatedFileFolders).toEqual(["dist", "b"]);
      expect(meta2?.sources).toContain("src/original2.ts");
      expect((meta2 as any)?.sourcesNormalized).toContain("src/original2.ts");
  });
});

