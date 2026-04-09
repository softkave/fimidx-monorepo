import { Schema } from "mongoose";
import type {
  ILocalSourceMapCacheEntry,
  IProjectFimidaraToken,
  ISourceMapMetadata,
  ISourceMapSegmentDoc,
  ISourceMapUpload,
  ISymbolicatedLogTracking,
  ISymbolicationConfig,
  ISymbolicationState,
} from "../definitions/sourceMap.js";
import { getMongoConnection } from "./fimidx.mongo.js";

const projectFimidaraTokenSchema = new Schema<IProjectFimidaraToken>(
  {
    projectId: { type: String, required: true, unique: true, index: true },
    fimidaraTokenId: { type: String, required: true },
    encodedToken: { type: String, required: true },
    folderBasePath: { type: String, required: true },
    updatedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: true, collection: "project_fimidara_tokens" }
);

const sourceMapUploadSchema = new Schema<ISourceMapUpload>(
  {
    projectId: { type: String, required: true, index: true },
    repoIdentifier: { type: String, required: true, index: true },
    version: { type: String, required: true, index: true },
    fimidaraPath: { type: String, required: true },
    isZip: { type: Boolean, required: true },
    localZipIngested: { type: Boolean, required: false },
    unzippedFimidaraPath: { type: String, required: false },
    uploadedAt: { type: Date, required: true, default: Date.now },
    createdBy: { type: String, required: true, index: true },
    repoIdentifierDisplay: { type: String, required: false },
    versionDisplay: { type: String, required: false },
  },
  { _id: true, collection: "source_map_uploads" }
);

sourceMapUploadSchema.index(
  { projectId: 1, repoIdentifier: 1, version: 1 },
  { unique: true }
);

sourceMapUploadSchema.index(
  { uploadedAt: 1 },
  {
    name: "source_map_uploads_pending_local_zip",
    partialFilterExpression: {
      isZip: true,
      localZipIngested: { $ne: true },
    },
  }
);

const symbolicationConfigSchema = new Schema<ISymbolicationConfig>(
  {
    projectId: { type: String, required: true, unique: true, index: true },
    fieldsToSymbolicate: { type: [String], required: true, default: [] },
    repoIdFields: { type: [String], required: true, default: [] },
    versionFields: { type: [String], required: true, default: [] },
  },
  { _id: true, collection: "symbolication_config" }
);

const symbolicationStateSchema = new Schema<ISymbolicationState>(
  {
    projectId: { type: String, required: true, unique: true, index: true },
    lastProcessedTimestampMs: { type: Number, required: true, default: 0 },
    lastCycleAt: { type: Date, required: true, default: Date.now },
    cycleCount: { type: Number, required: true, default: 0 },
  },
  { _id: true, collection: "symbolication_state" }
);

const symbolicatedLogTrackingSchema = new Schema<ISymbolicatedLogTracking>(
  {
    logId: { type: String, required: true, index: true },
    fieldPath: { type: String, required: true, index: true },
    fieldValue: { type: String, required: true },
    symbolicatedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: true, collection: "symbolicated_log_tracking" }
);

symbolicatedLogTrackingSchema.index(
  { logId: 1, fieldPath: 1 },
  { unique: true }
);

const localSourceMapCacheSchema = new Schema<ILocalSourceMapCacheEntry>(
  {
    projectId: { type: String, required: true, index: true },
    repoIdentifier: { type: String, required: true, index: true },
    version: { type: String, required: true, index: true },
    localPath: { type: String, required: true },
    lastUsedCycleCount: { type: Number, required: true },
  },
  { _id: true, collection: "local_source_map_cache" }
);

localSourceMapCacheSchema.index(
  { projectId: 1, repoIdentifier: 1, version: 1 },
  { unique: true }
);

const sourceMapMetadataSchema = new Schema<ISourceMapMetadata>(
  {
    projectId: { type: String, required: true, index: true },
    repoIdentifier: { type: String, required: true, index: true },
    version: { type: String, required: true, index: true },
    generatedFile: { type: String, required: true, index: true },
    generatedFileBasename: { type: String, required: true, index: true },
    generatedFileFolders: { type: [String], required: true, default: [] },
    sources: { type: [String], required: true, default: [] },
    sourcesNormalized: { type: [String], required: true, default: [] },
    names: { type: [String], required: true, default: [] },
    ingestedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: true, collection: "source_map_metadata" }
);

sourceMapMetadataSchema.index(
  { projectId: 1, repoIdentifier: 1, version: 1, generatedFile: 1 },
  { unique: true }
);

sourceMapMetadataSchema.index(
  { projectId: 1, repoIdentifier: 1, version: 1, generatedFileBasename: 1 },
  { unique: false }
);

const sourceMapSegmentItemSchema = new Schema(
  {
    generatedColumn: { type: Number, required: true },
    sourceIndex: { type: Number, required: true },
    originalLine: { type: Number, required: true },
    originalColumn: { type: Number, required: true },
    nameIndex: { type: Number, required: true },
  },
  { _id: false }
);

const sourceMapSegmentsSchema = new Schema<ISourceMapSegmentDoc>(
  {
    projectId: { type: String, required: true, index: true },
    repoIdentifier: { type: String, required: true, index: true },
    version: { type: String, required: true, index: true },
    generatedFile: { type: String, required: true, index: true },
    generatedLine: { type: Number, required: true, index: true },
    segments: {
      type: [sourceMapSegmentItemSchema],
      required: true,
      default: [],
    },
  },
  { _id: true, collection: "source_map_segments" }
);

sourceMapSegmentsSchema.index(
  {
    projectId: 1,
    repoIdentifier: 1,
    version: 1,
    generatedFile: 1,
    generatedLine: 1,
  },
  { unique: true }
);

export function getProjectFimidaraTokenModel() {
  const { connection } = getMongoConnection();
  return connection.model<IProjectFimidaraToken>(
    "ProjectFimidaraToken",
    projectFimidaraTokenSchema
  );
}

export function getSourceMapUploadModel() {
  const { connection } = getMongoConnection();
  return connection.model<ISourceMapUpload>(
    "SourceMapUpload",
    sourceMapUploadSchema
  );
}

export function getSymbolicationConfigModel() {
  const { connection } = getMongoConnection();
  return connection.model<ISymbolicationConfig>(
    "SymbolicationConfig",
    symbolicationConfigSchema
  );
}

export function getSymbolicationStateModel() {
  const { connection } = getMongoConnection();
  return connection.model<ISymbolicationState>(
    "SymbolicationState",
    symbolicationStateSchema
  );
}

export function getSymbolicatedLogTrackingModel() {
  const { connection } = getMongoConnection();
  return connection.model<ISymbolicatedLogTracking>(
    "SymbolicatedLogTracking",
    symbolicatedLogTrackingSchema
  );
}

export function getLocalSourceMapCacheModel() {
  const { connection } = getMongoConnection();
  return connection.model<ILocalSourceMapCacheEntry>(
    "LocalSourceMapCache",
    localSourceMapCacheSchema
  );
}

export function getSourceMapMetadataModel() {
  const { connection } = getMongoConnection();
  return connection.model<ISourceMapMetadata>(
    "SourceMapMetadata",
    sourceMapMetadataSchema
  );
}

export function getSourceMapSegmentsModel() {
  const { connection } = getMongoConnection();
  return connection.model<ISourceMapSegmentDoc>(
    "SourceMapSegments",
    sourceMapSegmentsSchema
  );
}
