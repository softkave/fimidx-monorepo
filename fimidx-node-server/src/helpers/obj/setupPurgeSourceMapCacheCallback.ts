import {getCoreConfig} from 'fimidx-core/common/getCoreConfig';
import {kId0} from 'fimidx-core/definitions/system';
import {getCallbacks} from 'fimidx-core/serverHelpers/index';
import {first} from 'lodash-es';
import {addCallbackEndpointImpl} from '../../httpEndpoints/cbs/addCallbackEndpoint.js';
import {kInternalAccessKeyHeader} from '../../httpServer.js';
import {fimidxNodeWinstonLogger} from '../../utils/fimidxNodeloggers.js';

export async function setupPurgeSourceMapCacheCallback() {
  const config = getCoreConfig().purgeSourceMapCache;
  if (!config) {
    fimidxNodeWinstonLogger.info(
      'Purge source map cache callback not configured (PURGE_SOURCE_MAP_CACHE_URL / PURGE_SOURCE_MAP_CACHE_INTERVAL_MS not set)',
    );
    return;
  }

  const name = '__fimidx_purgeSourceMapCache_callback';
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
    fimidxNodeWinstonLogger.info(
      'Purge source map cache callback already setup',
      {id: callback.id},
    );
    return;
  }

  fimidxNodeWinstonLogger.info('Setting up purge source map cache callback');
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
