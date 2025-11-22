import {getCoreConfig} from 'fimidx-core/common/getCoreConfig';
import {kId0} from 'fimidx-core/definitions/system';
import {getCallbacks} from 'fimidx-core/serverHelpers/index';
import {first} from 'lodash-es';
import {addCallbackEndpointImpl} from '../../httpEndpoints/cbs/addCallbackEndpoint.js';
import {kInternalAccessKeyHeader} from '../../httpServer.js';
import {fimidxNodeWinstonLogger} from '../../utils/fimidxNodeloggers.js';

export async function setupCleanupObjsCallback() {
  const name = '__fimidx_cleanupObjs_callback';
  const {callbacks} = await getCallbacks({
    args: {
      query: {
        appId: kId0,
        name: {
          eq: name,
        },
      },
      limit: 1,
    },
  });

  const callback = first(callbacks);

  if (callback) {
    fimidxNodeWinstonLogger.info('Cleanup objs callback already setup', {
      id: callback.id,
    });
    return;
  }

  fimidxNodeWinstonLogger.info('Setting up cleanup objs callback');
  const {
    fimidxInternal: {internalAccessKey},
    cleanupObjs: {url: cleanupObjsUrl, intervalMs: cleanupObjsIntervalMs},
  } = getCoreConfig();

  await addCallbackEndpointImpl({
    clientTokenId: kId0,
    groupId: kId0,
    item: {
      appId: kId0,
      url: cleanupObjsUrl,
      method: 'POST',
      requestHeaders: {
        [kInternalAccessKeyHeader]: internalAccessKey,
      },
      intervalFrom: new Date().toISOString(),
      intervalMs: cleanupObjsIntervalMs,
      idempotencyKey: name,
      name,
    },
  });
}
