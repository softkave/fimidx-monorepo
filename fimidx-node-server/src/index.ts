import {getCoreConfig} from 'fimidx-core/common/getCoreConfig';
import {loadCallbacks} from './helpers/cb/loadCallbacks.js';
import {setupCleanupObjsCallback} from './helpers/obj/setupCleanupObjsCallback.js';
import {setupIndexObjsCallback} from './helpers/obj/setupIndexObjsCallback.js';
import {startHttpServer} from './httpServer.js';
import {fimidxNodeWinstonLogger} from './utils/fimidxNodeloggers.js';

async function main() {
  const {
    nodeServerHttp: {port: httpPort},
    fimidxInternal: {internalAccessKey},
  } = getCoreConfig();

  fimidxNodeWinstonLogger.info('Starting Fimidx Node Server');

  await setupIndexObjsCallback();
  await setupCleanupObjsCallback();
  await loadCallbacks();

  startHttpServer({
    port: httpPort,
    internalAccessKey,
  });
}

main();
