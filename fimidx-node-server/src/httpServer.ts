import express from 'express';
import {addCallbackEndpoint} from './httpEndpoints/cbs/addCallbackEndpoint.js';
import {deleteCallbacksEndpoint} from './httpEndpoints/cbs/deleteCallbacksEndpoint.js';
import {cleanupDeletedObjsEndpoint} from './httpEndpoints/internalCbs/cleanupDeletedObjsEndpoint.js';
import {indexObjsEndpoint} from './httpEndpoints/internalCbs/indexObjsEndpoint.js';
import {purgeSourceMapCacheEndpoint} from './httpEndpoints/internalCbs/purgeSourceMapCacheEndpoint.js';
import {symbolicateLogsEndpoint} from './httpEndpoints/internalCbs/symbolicateLogsEndpoint.js';
import {unzipSourceMapsEndpoint} from './httpEndpoints/internalCbs/unzipSourceMapsEndpoint.js';
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

  app.post('/cb/addCallback', (req, res) => {
    addCallbackEndpoint(req, res);
  });
  app.post('/cb/deleteCallbacks', (req, res) => {
    deleteCallbacksEndpoint(req, res);
  });

  app.post('/objs/indexObjs', (req, res) => {
    indexObjsEndpoint(req, res);
  });
  app.post('/objs/cleanupDeletedObjs', (req, res) => {
    cleanupDeletedObjsEndpoint(req, res);
  });
  app.post('/objs/unzipSourceMaps', (req, res) => {
    unzipSourceMapsEndpoint(req, res);
  });
  app.post('/objs/symbolicateLogs', (req, res) => {
    symbolicateLogsEndpoint(req, res);
  });
  app.post('/objs/purgeSourceMapCache', (req, res) => {
    purgeSourceMapCacheEndpoint(req, res);
  });

  app.listen(port, () => {
    fimidxNodeWinstonLogger.info('HTTP server is running', {port});
  });
}
