import type {Server} from 'node:http';
import {
  isRetryableMongoNetworkError,
} from 'fimidx-core/common/withMongoRetry';
import {getCoreConfig} from 'fimidx-core/common/getCoreConfig';
import {closeFimidxLogger} from 'fimidx-core/common/logger/fimidx-logger';
import {loadCallbacks} from './helpers/cb/loadCallbacks.js';
import {setupCleanupObjsCallback} from './helpers/setupCbs/setupCleanupObjsCallback.js';
import {setupIndexObjsCallback} from './helpers/setupCbs/setupIndexObjsCallback.js';
import {setupPurgeSourceMapCacheCallback} from './helpers/setupCbs/setupPurgeSourceMapCacheCallback.js';
import {setupSymbolicationCallback} from './helpers/setupCbs/setupSymbolicationCallback.js';
import {setupUnzipSourceMapsCallback} from './helpers/setupCbs/setupUnzipSourceMapsCallback.js';
import {startHttpServer} from './httpServer.js';
import {fimidxNodeWinstonLogger} from './utils/fimidxNodeloggers.js';

let httpServer: Server | undefined;
let isShuttingDown = false;

async function flushLogs(): Promise<void> {
  try {
    await closeFimidxLogger();
  } catch (error) {
    // Last-resort console — winston/fimidx may already be closing.
    console.error('Failed to flush fimidx logs on shutdown', error);
  }
}

async function closeHttpServer(server: Server): Promise<void> {
  await new Promise<void>(resolve => {
    server.close(error => {
      if (error) {
        fimidxNodeWinstonLogger.error('Error closing HTTP server', {error});
      }
      resolve();
    });
    server.closeAllConnections();
  });
}

async function shutdown(signal: string, exitCode = 0): Promise<void> {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  fimidxNodeWinstonLogger.info('Started graceful shutdown', {signal});

  if (httpServer) {
    await closeHttpServer(httpServer);
    httpServer = undefined;
  }

  await flushLogs();
  process.exit(exitCode);
}

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
    void shutdown('uncaughtException', 1);
  });

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
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

  httpServer = startHttpServer({
    port: httpPort,
    internalAccessKey,
  });
}

main().catch(err => {
  fimidxNodeWinstonLogger.error('Fatal startup error', {error: err});
  void flushLogs().finally(() => process.exit(1));
});
