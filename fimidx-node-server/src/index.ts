import {getCoreConfig} from 'fimidx-core/common/getCoreConfig';
import {loadCallbacks} from './helpers/cb/loadCallbacks.js';
import {setupCleanupObjsCallback} from './helpers/setupCb/setupCleanupObjsCallback.js';
import {setupIndexObjsCallback} from './helpers/setupCb/setupIndexObjsCallback.js';
import {setupPurgeSourceMapCacheCallback} from './helpers/setupCb/setupPurgeSourceMapCacheCallback.js';
import {setupSymbolicationCallback} from './helpers/setupCb/setupSymbolicationCallback.js';
import {setupUnzipSourceMapsCallback} from './helpers/setupCb/setupUnzipSourceMapsCallback.js';
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
  await setupUnzipSourceMapsCallback();
  await setupSymbolicationCallback();
  await setupPurgeSourceMapCacheCallback();
  await loadCallbacks();

  startHttpServer({
    port: httpPort,
    internalAccessKey,
  });
}

main();
