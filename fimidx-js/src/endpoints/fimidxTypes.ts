// This file is auto-generated, do not modify directly.
// Reach out to a code owner to suggest changes.

/**
 * Arguments for getting a source map upload token
 */
export type GetSourceMapUploadTokenArgs = {
  /**
   * The project ID
   */
  projectId: string;
  /**
   * Repo identifier for the source map
   */
  repoIdentifier: string;
  /**
   * Version for the source map
   */
  version: string;
};
/**
 * Token and Fimidara file path for uploading the source map zip
 */
export type GetSourceMapUploadTokenResult = {
  /**
   * Fimidara auth token for upload
   */
  token: string;
  /**
   * Full Fimidara file path to upload the zip to
   */
  filePath: string;
};
export type InputLogRecord = {};
/**
 * The schema for ingesting logs
 */
export type IngestLogsArgs = {
  /**
   * The project ID
   */
  projectId: string;
  logs: Array<InputLogRecord>;
};
/**
 * Arguments for notifying source map upload complete
 */
export type NotifySourceMapUploadCompleteArgs = {
  /**
   * The project ID
   */
  projectId: string;
  /**
   * Repo identifier for the source map
   */
  repoIdentifier: string;
  /**
   * Version for the source map
   */
  version: string;
  /**
   * Whether the uploaded file is a zip
   */
  isZip: boolean;
};
