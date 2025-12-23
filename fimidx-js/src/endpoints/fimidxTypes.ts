// This file is auto-generated, do not modify directly.
// Reach out to a code owner to suggest changes.

export type InputLogRecord = {};
/**
 * The schema for ingesting logs
 */
export type IngestLogsArgs = {
  /**
   * The app ID
   */
  appId: string;
  logs: Array<InputLogRecord>;
};
/**
 * The schema for initializing SDK (empty body)
 */
export type InitSdkArgs = {};
/**
 * Response from init SDK endpoint
 */
export type InitSdkResponse = {
  fimidaraToken: string;
  folderPath: string;
  filePrefix: string;
};
