import { z } from "zod";

/** Zod schema for get source map upload token request body. */
export const getSourceMapUploadTokenArgsSchema = z.object({
  projectId: z.string().min(1),
  repoIdentifier: z.string().min(1),
  version: z.string().min(1),
});

/** Zod schema for notify source map upload complete request body. */
export const notifySourceMapUploadCompleteArgsSchema = z.object({
  projectId: z.string().min(1),
  repoIdentifier: z.string().min(1),
  version: z.string().min(1),
  isZip: z.boolean(),
});

export type GetSourceMapUploadTokenArgs = z.infer<
  typeof getSourceMapUploadTokenArgsSchema
>;
export type NotifySourceMapUploadCompleteArgs = z.infer<
  typeof notifySourceMapUploadCompleteArgsSchema
>;
export type GetSourceMapUploadTokenResult = {
  token: string;
  filePath: string;
};

/**
 * Path-safe normalization for repo identifier and version used in fimidara
 * paths. Replaces non-URI-safe characters with hyphen; no '..' or control
 * chars.
 */
export function normalizePathSegment(value: string): string {
  if (!value || typeof value !== "string") return "";
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "-")
      .replace(/\.\./g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "unknown"
  );
}

export interface IProjectFimidaraToken {
  projectId: string;
  fimidaraTokenId: string;
  encodedToken: string;
  folderBasePath: string;
  updatedAt: Date;
}

export interface ISourceMapUpload {
  projectId: string;
  /** Normalized path-safe key used for matching + storage paths. */
  repoIdentifier: string;
  /** Normalized path-safe key used for matching + storage paths. */
  version: string;
  fimidaraPath: string;
  isZip: boolean;
  /** After local unzip + Mongo ingestion (background job or on-demand ensure). */
  localZipIngested?: boolean;
  unzippedFimidaraPath?: string | null;
  uploadedAt: Date;
  createdBy: string;
  /** Original user-provided values for display; matching still uses normalized. */
  repoIdentifierDisplay?: string | null;
  versionDisplay?: string | null;
}

export interface ISymbolicationConfig {
  projectId: string;
  fieldsToSymbolicate: string[];
  repoIdFields: string[];
  versionFields: string[];
}

export interface ISymbolicationState {
  projectId: string;
  lastProcessedTimestampMs: number;
  lastCycleAt: Date;
  cycleCount: number;
}

export interface ISymbolicatedLogTracking {
  logId: string;
  fieldPath: string;
  fieldValue: string; // value before symbolication
  symbolicatedAt: Date;
}

export interface ILocalSourceMapCacheEntry {
  projectId: string;
  repoIdentifier: string;
  version: string;
  localPath: string;
  lastUsedCycleCount: number;
}

/** One segment in a source map line: generated column → original position +
 * indices. */
export interface ISourceMapSegmentItem {
  generatedColumn: number;
  sourceIndex: number;
  originalLine: number;
  originalColumn: number;
  nameIndex: number;
}

/** Metadata for one ingested source map (sources/names arrays for resolving
 * indices). */
export interface ISourceMapMetadata {
  projectId: string;
  repoIdentifier: string;
  version: string;
  /** Relative path of generated file from map root, without .map (e.g.
   * common/logger/date.js). */
  generatedFile: string;
  /** Basename of generatedFile including extension (e.g. date.js). */
  generatedFileBasename: string;
  /** Folder segments leading to basename (e.g. ["common","logger"] for
   * common/logger/date.js). */
  generatedFileFolders: string[];
  /** Raw `sources` as provided by the ingested sourcemap. */
  sources: string[];
  /** Normalized sources for stable, root-anchored display/lookup. */
  sourcesNormalized: string[];
  names: string[];
  ingestedAt: Date;
}

/** Segments for one generated line in a source map (sorted by generatedColumn
 * ascending). */
export interface ISourceMapSegmentDoc {
  projectId: string;
  repoIdentifier: string;
  version: string;
  generatedFile: string;
  generatedLine: number;
  segments: ISourceMapSegmentItem[];
}
