import express from 'express';
import {addCallbackEndpoint} from './httpEndpoints/cbs/addCallbackEndpoint.js';
import {deleteCallbacksEndpoint} from './httpEndpoints/cbs/deleteCallbacksEndpoint.js';
import {cleanupDeletedObjsEndpoint} from './httpEndpoints/internalCbs/cleanupDeletedObjsEndpoint.js';
import {indexObjsEndpoint} from './httpEndpoints/internalCbs/indexObjsEndpoint.js';
import {purgeSourceMapCacheEndpoint} from './httpEndpoints/internalCbs/purgeSourceMapCacheEndpoint.js';
import {symbolicateLogsEndpoint} from './httpEndpoints/internalCbs/symbolicateLogsEndpoint.js';
import {unzipSourceMapsEndpoint} from './httpEndpoints/internalCbs/unzipSourceMapsEndpoint.js';
import {errorMiddleware} from './http/errorMiddleware.js';
import {wrapAsync} from './http/wrapAsync.js';
import {fimidxNodeWinstonLogger} from './utils/fimidxNodeloggers.js';

export const kInternalAccessKeyHeader = 'x-internal-access-key';

export function startHttpServer(params: {
  port: number;
  internalAccessKey: string;
}) {
  const {port, internalAccessKey} = params;
  const app = express();

  fimidxNodeWinstonLogger.info('Starting HTTP server');

  app.use(express.json());
  app.use((req, res, next) => {
    if (req.headers[kInternalAccessKeyHeader] === internalAccessKey) {
      next();
    } else {
      res.status(401).send('Unauthorized');
    }
  });

  app.post('/cb/addCallback', wrapAsync(addCallbackEndpoint));
  app.post('/cb/deleteCallbacks', wrapAsync(deleteCallbacksEndpoint));

  app.post('/objs/indexObjs', wrapAsync(indexObjsEndpoint));
  app.post('/objs/cleanupDeletedObjs', wrapAsync(cleanupDeletedObjsEndpoint));
  app.post('/objs/unzipSourceMaps', wrapAsync(unzipSourceMapsEndpoint));
  app.post('/objs/symbolicateLogs', wrapAsync(symbolicateLogsEndpoint));
  app.post('/objs/purgeSourceMapCache', wrapAsync(purgeSourceMapCacheEndpoint));

  app.use(errorMiddleware);

  app.listen(port, () => {
    fimidxNodeWinstonLogger.info('HTTP server is running', {port});
  });
}
