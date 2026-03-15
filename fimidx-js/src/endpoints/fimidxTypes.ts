// This file is auto-generated, do not modify directly.
// Reach out to a code owner to suggest changes.

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

export type GetSourceMapUploadTokenArgs = {
  projectId: string;
  repoIdentifier: string;
  version: string;
};

export type GetSourceMapUploadTokenResult = {
  token: string;
  filePath: string;
};

export type NotifySourceMapUploadCompleteArgs = {
  projectId: string;
  repoIdentifier: string;
  version: string;
  isZip: boolean;
};
