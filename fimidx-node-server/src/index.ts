import {
  isRetryableMongoNetworkError,
} from 'fimidx-core/common/withMongoRetry';
import {getCoreConfig} from 'fimidx-core/common/getCoreConfig';
import {loadCallbacks} from './helpers/cb/loadCallbacks.js';
import {setupCleanupObjsCallback} from './helpers/setupCbs/setupCleanupObjsCallback.js';
import {setupIndexObjsCallback} from './helpers/setupCbs/setupIndexObjsCallback.js';
import {setupPurgeSourceMapCacheCallback} from './helpers/setupCbs/setupPurgeSourceMapCacheCallback.js';
import {setupSymbolicationCallback} from './helpers/setupCbs/setupSymbolicationCallback.js';
import {setupUnzipSourceMapsCallback} from './helpers/setupCbs/setupUnzipSourceMapsCallback.js';
import {startHttpServer} from './httpServer.js';
import {fimidxNodeWinstonLogger} from './utils/fimidxNodeloggers.js';

/**
 * Transient Mongo TLS/pool errors should not take down the process. Log and
 * keep serving; callers with withMongoRetry will usually recover on their own.
 */
function installProcessErrorHandlers() {
  process.on('unhandledRejection', reason => {
    fimidxNodeWinstonLogger.error('unhandledRejection', {error: reason});
    if (!isRetryableMongoNetworkError(reason)) {
      // Non-mongo unexpected rejections: keep process up (HTTP server) but
      // surface loudly. Exiting here would drop in-memory callback timers.
      fimidxNodeWinstonLogger.error(
        'Non-retryable unhandledRejection (process kept alive)',
        {error: reason},
      );
    }
  });

  process.on('uncaughtException', err => {
    fimidxNodeWinstonLogger.error('uncaughtException', {error: err});
    if (isRetryableMongoNetworkError(err)) {
      return;
    }
    // Unknown sync throw — safer to exit so the process supervisor restarts.
    process.exit(1);
  });
}

async function main() {
  installProcessErrorHandlers();

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

main().catch(err => {
  fimidxNodeWinstonLogger.error('Fatal startup error', {error: err});
  process.exit(1);
});
