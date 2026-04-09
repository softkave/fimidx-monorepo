import {getCoreConfig} from 'fimidx-core/common/getCoreConfig';
import {kId0} from 'fimidx-core/definitions/system';
import {getCallbacks} from 'fimidx-core/serverHelpers/index';
import {first} from 'lodash-es';
import {addCallbackEndpointImpl} from '../../httpEndpoints/cbs/addCallbackEndpoint.js';
import {kInternalAccessKeyHeader} from '../../httpServer.js';
import {fimidxNodeWinstonLogger} from '../../utils/fimidxNodeloggers.js';
import {kInternalCallbackNames} from './constants.js';

export async function setupUnzipSourceMapsCallback() {
  const config = getCoreConfig().unzipSourceMaps;
  if (!config) {
    fimidxNodeWinstonLogger.info(
      'Unzip source maps callback not configured (set UNZIP_SOURCE_MAPS_URL and UNZIP_SOURCE_MAPS_INTERVAL_MS to enable)',
    );
    return;
  }

  const name = kInternalCallbackNames.unzipSourceMaps;
  const {callbacks} = await getCallbacks({
    args: {
      query: {
        projectId: kId0,
        name: {eq: name},
      },
      limit: 1,
    },
  });

  const callback = first(callbacks);
  if (callback) {
    fimidxNodeWinstonLogger.info('Unzip source maps callback already setup', {
      callbackId: callback.id,
      callbackName: callback.name,
    });
    return;
  }

  fimidxNodeWinstonLogger.info('Setting up unzip source maps callback');
  const {
    fimidxInternal: {internalAccessKey},
  } = getCoreConfig();
  await addCallbackEndpointImpl({
    clientTokenId: kId0,
    groupId: kId0,
    item: {
      projectId: kId0,
      url: config.url,
      method: 'POST',
      requestHeaders: {
        [kInternalAccessKeyHeader]: internalAccessKey,
      },
      intervalFrom: new Date().toISOString(),
      intervalMs: config.intervalMs,
      idempotencyKey: name,
      name,
    },
  });
}
