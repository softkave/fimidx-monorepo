import {getCoreConfig} from 'fimidx-core/common/getCoreConfig';
import {kId0} from 'fimidx-core/definitions/system';
import {getCallbacks} from 'fimidx-core/serverHelpers/index';
import {first} from 'lodash-es';
import {addCallbackEndpointImpl} from '../../httpEndpoints/cbs/addCallbackEndpoint.js';
import {kInternalAccessKeyHeader} from '../../httpServer.js';
import {fimidxNodeWinstonLogger} from '../../utils/fimidxNodeloggers.js';

export async function setupSymbolicationCallback() {
  const config = getCoreConfig().symbolication;
  if (!config) {
    fimidxNodeWinstonLogger.info(
      'Symbolication callback not configured (SYMBOLICATION_URL / SYMBOLICATION_INTERVAL_MS not set)',
    );
    return;
  }

  const name = '__fimidx_symbolication_callback';
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
    fimidxNodeWinstonLogger.info('Symbolication callback already setup', {
      callbackId: callback.id,
      callbackName: callback.name,
    });
    return;
  }

  fimidxNodeWinstonLogger.info('Setting up symbolication callback');
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
