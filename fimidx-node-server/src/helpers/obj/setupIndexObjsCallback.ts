import {getCoreConfig} from 'fimidx-core/common/getCoreConfig';
import {kId0} from 'fimidx-core/definitions/system';
import {getCallbacks} from 'fimidx-core/serverHelpers/index';
import {first} from 'lodash-es';
import {addCallbackEndpointImpl} from '../../httpEndpoints/cbs/addCallbackEndpoint.js';
import {kInternalAccessKeyHeader} from '../../httpServer.js';
import {fimidxNodeWinstonLogger} from '../../utils/fimidxNodeloggers.js';

export async function setupIndexObjsCallback() {
  const name = '__fimidx_indexObjs_callback';
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
    fimidxNodeWinstonLogger.info('Index objs callback already setup', {
      id: callback.id,
    });
    return;
  }

  fimidxNodeWinstonLogger.info('Setting up index objs callback');
  const {
    fimidxInternal: {internalAccessKey},
    indexObjs: {url: indexObjsUrl, intervalMs: indexObjsIntervalMs},
  } = getCoreConfig();

  await addCallbackEndpointImpl({
    clientTokenId: kId0,
    groupId: kId0,
    item: {
      appId: kId0,
      url: indexObjsUrl,
      method: 'POST',
      requestHeaders: {
        [kInternalAccessKeyHeader]: internalAccessKey,
      },
      intervalFrom: new Date().toISOString(),
      intervalMs: indexObjsIntervalMs,
      idempotencyKey: name,
      name,
    },
  });
}
