import { readdir, readFile } from "fs/promises";
import { last } from "lodash-es";
import path from "path";
import type { RawSourceMap } from "source-map";
import { SourceMapConsumer } from "source-map";
import { withMongoRetry } from "../../common/withMongoRetry.js";
import {
  getSourceMapMetadataModel,
  getSourceMapSegmentsModel,
} from "../../db/sourceMap.mongo.js";
import type {
  ISourceMapSegmentDoc,
  ISourceMapSegmentItem,
} from "../../definitions/sourceMap.js";
import { normalizeSourcePath } from "./normalizeSourcePath.js";

/**
 * Recursively collect all .map file paths under dir, with paths relative to
 * dir. Uses forward slashes for consistency.
 */
async function listMapFilesRelative(
  dir: string,
  relativePrefix = ""
): Promise<string[]> {
  const entries = await readdir(path.join(dir, relativePrefix), {
    withFileTypes: true,
  });
  const out: string[] = [];
  for (const e of entries) {
    const rel = relativePrefix ? `${relativePrefix}/${e.name}` : e.name;
    if (e.isDirectory()) {
      const nested = await listMapFilesRelative(dir, rel);
      out.push(...nested);
    } else if (e.isFile() && e.name.endsWith(".map")) {
      out.push(rel.replace(/\\/g, "/"));
    }
  }
  return out;
}

/**
 * Ingest all .map files under localDir into MongoDB: decode mappings via
 * SourceMapConsumer.eachMapping, store metadata (sources/names) and segments
 * per generated line. Uses relative path (from localDir) as generatedFile key.
 */
export async function ingestSourceMapsToMongo(
  projectId: string,
  repoIdentifier: string,
  version: string,
  localDir: string
): Promise<void> {
  const mapRelativePaths = await listMapFilesRelative(localDir);
  const metadataModel = getSourceMapMetadataModel();
  const segmentsModel = getSourceMapSegmentsModel();

  for (const mapRelativePath of mapRelativePaths) {
    const generatedFile = mapRelativePath.replace(/\.map$/i, "");
    const generatedFileParts = generatedFile.split("/").filter(Boolean);
    const generatedFileBasename = last(generatedFileParts) ?? "";
    const generatedFileFolders =
      generatedFileParts.length > 1 ? generatedFileParts.slice(0, -1) : [];
    const absolutePath = path.join(localDir, mapRelativePath);
    const mapJson = await readFile(absolutePath, "utf-8");
    const rawMap = JSON.parse(mapJson) as RawSourceMap;

    const sources = rawMap.sources ?? [];
    const sourcesNormalized = sources.map(normalizeSourcePath);
    const names = rawMap.names ?? [];
    const sourceToIndex = new Map<string, number>();
    const nameToIndex = new Map<string, number>();
    sources.forEach((s, i) => sourceToIndex.set(s, i));
    names.forEach((n, i) => nameToIndex.set(n, i));

    const consumer = await new SourceMapConsumer(rawMap);
    try {
      const byLine = new Map<number, ISourceMapSegmentItem[]>();

      consumer.eachMapping(
        (m) => {
          // VLQ segments with only a generated column are unmapped: source /
          // originalLine / originalColumn are null. Skip them — they cannot be
          // stored (schema requires numbers) and are useless for symbolication.
          if (
            m.source == null ||
            m.originalLine == null ||
            m.originalColumn == null
          ) {
            return;
          }
          const sourceIndex = sourceToIndex.get(m.source) ?? 0;
          const nameIndex = m.name != null ? nameToIndex.get(m.name) ?? -1 : -1;
          const item: ISourceMapSegmentItem = {
            generatedColumn: m.generatedColumn,
            sourceIndex,
            originalLine: m.originalLine,
            originalColumn: m.originalColumn,
            nameIndex,
          };
          const line = m.generatedLine;
          let arr = byLine.get(line);
          if (!arr) {
            arr = [];
            byLine.set(line, arr);
          }
          arr.push(item);
        },
        null,
        1 /* SourceMapConsumer.GENERATED_ORDER */
      );

      await segmentsModel.deleteMany({
        projectId,
        repoIdentifier,
        version,
        generatedFile,
      });

      const segmentDocs: ISourceMapSegmentDoc[] = [];
      for (const [generatedLine, segments] of byLine) {
        if (segments.length === 0) continue;
        segmentDocs.push({
          projectId,
          repoIdentifier,
          version,
          generatedFile,
          generatedLine,
          segments,
        });
      }
      if (segmentDocs.length > 0) {
        // Use the native driver so large segment arrays are not wrapped as
        // mongoose Subdocuments (validation failure + $getAllSubdocs can
        // RangeError: Maximum call stack size exceeded).
        await withMongoRetry(() =>
          segmentsModel.collection.insertMany(segmentDocs, {
            ordered: true,
          })
        );
      }

      await metadataModel.findOneAndUpdate(
        {
          projectId,
          repoIdentifier,
          version,
          generatedFile,
        },
        {
          $set: {
            sources,
            sourcesNormalized,
            names,
            generatedFileBasename,
            generatedFileFolders,
            ingestedAt: new Date(),
          },
        },
        { upsert: true, runValidators: true }
      );
    } finally {
      consumer.destroy();
    }
  }
}
