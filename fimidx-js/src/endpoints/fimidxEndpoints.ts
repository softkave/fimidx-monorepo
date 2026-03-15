// This file is auto-generated, do not modify directly.
// Reach out to a code owner to suggest changes.

import {
  type MfdocEndpointResultWithBinaryResponse,
  type MfdocEndpointOpts,
  type MfdocEndpointDownloadBinaryOpts,
  type MfdocEndpointUploadBinaryOpts,
} from 'mfdoc-js-sdk-base';
import {AbstractSdkEndpoints} from './AbstractSdkEndpoints.js';
import {
  type GetSourceMapUploadTokenArgs,
  type GetSourceMapUploadTokenResult,
  type NotifySourceMapUploadCompleteArgs,
  type IngestLogsArgs,
} from './fimidxTypes.js';

export class SourceMapsEndpoints extends AbstractSdkEndpoints {
  /**
   * Get a Fimidara token and file path for uploading source maps (upload to filePath).
   */
  getUploadToken = async (
    props: GetSourceMapUploadTokenArgs,
    opts?: MfdocEndpointOpts,
  ): Promise<GetSourceMapUploadTokenResult> => {
    return this.executeJson(
      {
        data: props,
        path: '/source-maps/upload-token',
        method: 'POST',
      },
      opts,
    );
  };
  notifyUploadComplete = async (
    props: NotifySourceMapUploadCompleteArgs,
    opts?: MfdocEndpointOpts,
  ): Promise<void> => {
    return this.executeJson(
      {
        data: props,
        path: '/source-maps/upload-complete',
        method: 'POST',
      },
      opts,
    );
  };
}
export class LogsEndpoints extends AbstractSdkEndpoints {
  /**
   * Ingest logs
   */
  ingestLogs = async (
    props: IngestLogsArgs,
    opts?: MfdocEndpointOpts,
  ): Promise<void> => {
    return this.executeJson(
      {
        data: props,
        path: '/logs',
        method: 'POST',
      },
      opts,
    );
  };
}
export class FimidxEndpoints extends AbstractSdkEndpoints {
  sourceMaps = new SourceMapsEndpoints(this.config, this);
  logs = new LogsEndpoints(this.config, this);
}
