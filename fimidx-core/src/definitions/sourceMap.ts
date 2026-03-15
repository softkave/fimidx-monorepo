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
 * Path-safe normalization for repo identifier and version used in Fimidara
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
  repoIdentifier: string; // normalized
  version: string; // normalized
  fimidaraPath: string;
  isZip: boolean;
  unzippedFimidaraPath?: string | null;
  uploadedAt: Date;
  createdBy: string;
  /** Optional: original user-provided values for display */
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
