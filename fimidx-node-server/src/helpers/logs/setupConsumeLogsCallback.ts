import {getCoreConfig} from 'fimidx-core/common/getCoreConfig';
import {kId0} from 'fimidx-core/definitions/system';
import {getCallbacks} from 'fimidx-core/serverHelpers/index';
import {first} from 'lodash-es';
import {addCallbackEndpointImpl} from '../../httpEndpoints/cbs/addCallbackEndpoint.js';
import {kInternalAccessKeyHeader} from '../../httpServer.js';
import {fimidxNodeWinstonLogger} from '../../utils/fimidxNodeloggers.js';

export async function setupConsumeLogsCallback() {
  const name = '__fimidx_consumeLogs_callback';
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
    fimidxNodeWinstonLogger.info('Consume logs callback already setup', {
      id: callback.id,
    });
    return;
  }

  fimidxNodeWinstonLogger.info('Setting up consume logs callback');
  const {
    fimidxInternal: {internalAccessKey},
    consumeLogs: {url: consumeLogsUrl, intervalMs: consumeLogsIntervalMs},
  } = getCoreConfig();

  await addCallbackEndpointImpl({
    clientTokenId: kId0,
    groupId: kId0,
    item: {
      appId: kId0,
      url: consumeLogsUrl,
      method: 'POST',
      requestHeaders: {
        [kInternalAccessKeyHeader]: internalAccessKey,
      },
      intervalFrom: new Date().toISOString(),
      intervalMs: consumeLogsIntervalMs,
      idempotencyKey: name,
      name,
    },
  });
}
