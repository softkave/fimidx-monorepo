import { beforeAll, describe, expect, it } from "vitest";
import { getMongoConnection } from "../../../db/fimidx.mongo.js";
import {
  getSourceMapMetadataModel,
  getSourceMapSegmentsModel,
} from "../../../db/sourceMap.mongo.js";
import type { ISourceMapSegmentDoc } from "../../../definitions/sourceMap.js";
import {
  generatedFileFromUrl,
  originalPositionFromMongo,
} from "../symbolicateFromMongo.js";

describe("symbolicateFromMongo", () => {
  beforeAll(async () => {
    // Ensure mongo connection exists for integration tests.
    const { promise } = getMongoConnection();
    await promise;
  });

  describe("generatedFileFromUrl", () => {
    it("handles webpack URLs and normalizes slashes", () => {
      expect(generatedFileFromUrl("webpack:///./src/index.js")).toBe(
        "src/index.js"
      );
      expect(generatedFileFromUrl("webpack:///./src\\index.js?x=1")).toBe(
        "src/index.js"
      );
    });

    it("handles file:// URLs", () => {
      expect(generatedFileFromUrl("file:///Users/me/app/dist/main.js")).toBe(
        "Users/me/app/dist/main.js"
      );
      expect(generatedFileFromUrl("file://C:\\app\\dist\\main.js")).toBe(
        "C:/app/dist/main.js"
      );
    });

    it("handles http(s) URLs and strips query + leading slash", () => {
      expect(
        generatedFileFromUrl("https://cdn.example.com/dist/main.js?hash=123")
      ).toBe("dist/main.js");
      expect(generatedFileFromUrl("/dist/main.js?hash=123")).toBe(
        "dist/main.js"
      );
    });

    it("falls back to basename for unparsable inputs", () => {
      expect(generatedFileFromUrl("not a url")).toBe("not a url");
      expect(generatedFileFromUrl("C:\\x\\y\\z.js")).toBe("/x/y/z.js");
    });
  });

  describe("originalPositionFromMongo", () => {
    it("resolves generatedFile by full path then basename, and binary searches segments", async () => {
      const projectId = `test_project_${Date.now()}`;
      const repoIdentifier = "repo";
      const version = "v1";

      const metadataModel = getSourceMapMetadataModel();
      const segmentsModel = getSourceMapSegmentsModel();

      // Two candidates share the same basename.
      await metadataModel.insertMany([
        {
          projectId,
          repoIdentifier,
          version,
          generatedFile: "dist/app.js",
          generatedFileBasename: "app.js",
          generatedFileFolders: ["dist"],
          sources: ["src/original.ts"],
          names: ["fn"],
          ingestedAt: new Date(),
        },
        {
          projectId,
          repoIdentifier,
          version,
          generatedFile: "assets/app.js",
          generatedFileBasename: "app.js",
          generatedFileFolders: ["assets"],
          sources: ["src/other.ts"],
          names: ["otherFn"],
          ingestedAt: new Date(),
        },
      ]);

      const segDoc: ISourceMapSegmentDoc = {
        projectId,
        repoIdentifier,
        version,
        generatedFile: "dist/app.js",
        generatedLine: 10,
        segments: [
          // sorted by generatedColumn
          {
            generatedColumn: 0,
            sourceIndex: 0,
            originalLine: 1,
            originalColumn: 0,
            nameIndex: 0,
          },
          {
            generatedColumn: 5,
            sourceIndex: 0,
            originalLine: 2,
            originalColumn: 3,
            nameIndex: 0,
          },
        ],
      };
      await segmentsModel.insertMany([segDoc]);

      // Full path match: should resolve to dist/app.js and pick segment col<=6
      // => generatedColumn 5.
      const pos1 = await originalPositionFromMongo({
        projectId,
        repoIdentifier,
        version,
        url: "https://cdn.example.com/dist/app.js",
        line: 10,
        column: 6,
      });
      expect(pos1).toEqual({
        source: "src/original.ts",
        line: 2,
        column: 3,
        name: "fn",
      });
    });

    it("resolves generatedFile using folder-suffix scoring (basename-only URL)", async () => {
      const projectId = `test_project_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 7)}`;
      const repoIdentifier = "repo_scoring";
      const version = "v_scoring";

      const metadataModel = getSourceMapMetadataModel();
      const segmentsModel = getSourceMapSegmentsModel();

      // Candidates share basename, but folders differ.
      await metadataModel.insertMany([
        {
          projectId,
          repoIdentifier,
          version,
          generatedFile: "bar/a/bundle.js",
          generatedFileBasename: "bundle.js",
          generatedFileFolders: ["bar", "a"],
          sources: ["src/barA.ts"],
          names: ["barFn"],
          ingestedAt: new Date(),
        },
        {
          projectId,
          repoIdentifier,
          version,
          generatedFile: "foo/dist/a/bundle.js",
          generatedFileBasename: "bundle.js",
          generatedFileFolders: ["foo", "dist", "a"],
          sources: ["src/fooDistA.ts"],
          names: ["fooFn"],
          ingestedAt: new Date(),
        },
        {
          projectId,
          repoIdentifier,
          version,
          generatedFile: "dist/a/bundle.js",
          generatedFileBasename: "bundle.js",
          generatedFileFolders: ["dist", "a"],
          sources: ["src/distA.ts"],
          names: ["distFn"],
          ingestedAt: new Date(),
        },
      ]);

      const mkSeg = (generatedFile: string, originalLine: number) => ({
        projectId,
        repoIdentifier,
        version,
        generatedFile,
        generatedLine: 1,
        segments: [
          {
            generatedColumn: 0,
            sourceIndex: 0,
            originalLine,
            originalColumn: 7,
            nameIndex: 0,
          },
        ],
      });

      await segmentsModel.insertMany([
        mkSeg("bar/a/bundle.js", 101),
        mkSeg("foo/dist/a/bundle.js", 202),
        mkSeg("dist/a/bundle.js", 303),
      ]);

      // URL path ends with "dist/a" but isn't exactly any generatedFile above.
      // Expected best match: "dist/a/bundle.js" due to highest suffix score,
      // then fewer remainingCandidateSegments.
      const pos = await originalPositionFromMongo({
        projectId,
        repoIdentifier,
        version,
        url: "https://cdn.example.com/x/dist/a/bundle.js",
        line: 1,
        column: 7,
      });

      expect(pos).toEqual({
        source: "src/distA.ts",
        line: 303,
        column: 7,
        name: "distFn",
      });
    });

    it("resolves generatedFile using folder-suffix scoring for webpack URLs", async () => {
      const projectId = `test_project_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 7)}`;
      const repoIdentifier = "repo_scoring_webpack";
      const version = "v_scoring_webpack";

      const metadataModel = getSourceMapMetadataModel();
      const segmentsModel = getSourceMapSegmentsModel();

      await metadataModel.insertMany([
        {
          projectId,
          repoIdentifier,
          version,
          generatedFile: "foo/dist/a/bundle.js",
          generatedFileBasename: "bundle.js",
          generatedFileFolders: ["foo", "dist", "a"],
          sources: ["src/fooDistA.ts"],
          names: ["fooFn"],
          ingestedAt: new Date(),
        },
        {
          projectId,
          repoIdentifier,
          version,
          generatedFile: "dist/a/bundle.js",
          generatedFileBasename: "bundle.js",
          generatedFileFolders: ["dist", "a"],
          sources: ["src/distA.ts"],
          names: ["distFn"],
          ingestedAt: new Date(),
        },
      ]);

      const mkSeg = (generatedFile: string, originalLine: number) => ({
        projectId,
        repoIdentifier,
        version,
        generatedFile,
        generatedLine: 1,
        segments: [
          {
            generatedColumn: 0,
            sourceIndex: 0,
            originalLine,
            originalColumn: 7,
            nameIndex: 0,
          },
        ],
      });

      await segmentsModel.insertMany([
        mkSeg("foo/dist/a/bundle.js", 202),
        mkSeg("dist/a/bundle.js", 303),
      ]);

      const pos = await originalPositionFromMongo({
        projectId,
        repoIdentifier,
        version,
        url: "webpack:///./x/dist/a/bundle.js",
        line: 1,
        column: 7,
      });

      expect(pos).toEqual({
        source: "src/distA.ts",
        line: 303,
        column: 7,
        name: "distFn",
      });
    });

    it("resolves generatedFile using folder-suffix scoring for file URLs", async () => {
      const projectId = `test_project_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 7)}`;
      const repoIdentifier = "repo_scoring_file";
      const version = "v_scoring_file";

      const metadataModel = getSourceMapMetadataModel();
      const segmentsModel = getSourceMapSegmentsModel();

      await metadataModel.insertMany([
        {
          projectId,
          repoIdentifier,
          version,
          generatedFile: "foo/dist/a/bundle.js",
          generatedFileBasename: "bundle.js",
          generatedFileFolders: ["foo", "dist", "a"],
          sources: ["src/fooDistA.ts"],
          names: ["fooFn"],
          ingestedAt: new Date(),
        },
        {
          projectId,
          repoIdentifier,
          version,
          generatedFile: "dist/a/bundle.js",
          generatedFileBasename: "bundle.js",
          generatedFileFolders: ["dist", "a"],
          sources: ["src/distA.ts"],
          names: ["distFn"],
          ingestedAt: new Date(),
        },
      ]);

      const mkSeg = (generatedFile: string, originalLine: number) => ({
        projectId,
        repoIdentifier,
        version,
        generatedFile,
        generatedLine: 1,
        segments: [
          {
            generatedColumn: 0,
            sourceIndex: 0,
            originalLine,
            originalColumn: 7,
            nameIndex: 0,
          },
        ],
      });

      await segmentsModel.insertMany([
        mkSeg("foo/dist/a/bundle.js", 202),
        mkSeg("dist/a/bundle.js", 303),
      ]);

      const pos = await originalPositionFromMongo({
        projectId,
        repoIdentifier,
        version,
        url: "file:///x/dist/a/bundle.js",
        line: 1,
        column: 7,
      });

      expect(pos).toEqual({
        source: "src/distA.ts",
        line: 303,
        column: 7,
        name: "distFn",
      });
    });

    it("breaks ties using lexicographic generatedFile (same suffix score)", async () => {
      const projectId = `test_project_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 7)}`;
      const repoIdentifier = "repo_tiebreak";
      const version = "v_tiebreak";

      const metadataModel = getSourceMapMetadataModel();
      const segmentsModel = getSourceMapSegmentsModel();

      await metadataModel.insertMany([
        {
          projectId,
          repoIdentifier,
          version,
          generatedFile: "bbb/dist/a/bundle.js",
          generatedFileBasename: "bundle.js",
          generatedFileFolders: ["bbb", "dist", "a"],
          sources: ["src/bbb.ts"],
          names: ["bbbFn"],
          ingestedAt: new Date(),
        },
        {
          projectId,
          repoIdentifier,
          version,
          generatedFile: "aaa/dist/a/bundle.js",
          generatedFileBasename: "bundle.js",
          generatedFileFolders: ["aaa", "dist", "a"],
          sources: ["src/aaa.ts"],
          names: ["aaaFn"],
          ingestedAt: new Date(),
        },
      ]);

      await segmentsModel.insertMany([
        {
          projectId,
          repoIdentifier,
          version,
          generatedFile: "bbb/dist/a/bundle.js",
          generatedLine: 1,
          segments: [
            {
              generatedColumn: 0,
              sourceIndex: 0,
              originalLine: 11,
              originalColumn: 0,
              nameIndex: 0,
            },
          ],
        },
        {
          projectId,
          repoIdentifier,
          version,
          generatedFile: "aaa/dist/a/bundle.js",
          generatedLine: 1,
          segments: [
            {
              generatedColumn: 0,
              sourceIndex: 0,
              originalLine: 22,
              originalColumn: 0,
              nameIndex: 0,
            },
          ],
        },
      ]);

      const pos = await originalPositionFromMongo({
        projectId,
        repoIdentifier,
        version,
        url: "https://cdn.example.com/x/dist/a/bundle.js",
        line: 1,
        column: 0,
      });

      // Lexicographically, "aaa/..." < "bbb/..." so it should win.
      expect(pos).toEqual({
        source: "src/aaa.ts",
        line: 22,
        column: 0,
        name: "aaaFn",
      });
    });
  });
});
