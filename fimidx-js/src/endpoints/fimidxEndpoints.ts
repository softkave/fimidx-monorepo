// This file is auto-generated, do not modify directly.
// Reach out to a code owner to suggest changes.

import {
  type MfdocEndpointOpts,
} from 'mfdoc-js-sdk-base';
import {AbstractSdkEndpoints} from './AbstractSdkEndpoints.js';
import {
  type IngestLogsArgs,
  type GetSourceMapUploadTokenArgs,
  type GetSourceMapUploadTokenResult,
  type NotifySourceMapUploadCompleteArgs,
} from './fimidxTypes.js';

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

export class SourceMapsEndpoints extends AbstractSdkEndpoints {
  /**
   * Get a Fimidara token and folder path for uploading source maps.
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

  /**
   * Notify that a source map upload is complete (call after uploading to Fimidara).
   */
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

export class FimidxEndpoints extends AbstractSdkEndpoints {
  logs = new LogsEndpoints(this.config, this);
  sourceMaps = new SourceMapsEndpoints(this.config, this);
}
