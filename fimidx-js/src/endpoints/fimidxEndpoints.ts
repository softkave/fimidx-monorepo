// This file is auto-generated, do not modify directly.
// Reach out to a code owner to suggest changes.

import {type MfdocEndpointOpts} from 'mfdoc-js-sdk-base';
import {AbstractSdkEndpoints} from './AbstractSdkEndpoints.js';
import {
  type IngestLogsArgs,
  type InitSdkArgs,
  type InitSdkResponse,
} from './fimidxTypes.js';

export class LogsEndpoints extends AbstractSdkEndpoints {
  /**
   * Initialize SDK for file-based logging
   */
  initSdk = async (
    props: InitSdkArgs,
    opts?: MfdocEndpointOpts,
  ): Promise<InitSdkResponse> => {
    return this.executeJson(
      {
        data: props,
        path: '/logs/init',
        method: 'POST',
      },
      opts,
    );
  };
  /**
   * Ingest logs (deprecated - use file-based logging instead)
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
  logs = new LogsEndpoints(this.config, this);
}
