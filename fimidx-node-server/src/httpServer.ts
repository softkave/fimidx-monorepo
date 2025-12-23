import express from 'express';
import {addCallbackEndpoint} from './httpEndpoints/cbs/addCallbackEndpoint.js';
import {deleteCallbacksEndpoint} from './httpEndpoints/cbs/deleteCallbacksEndpoint.js';
import {consumeLogsEndpoint} from './httpEndpoints/logs/consumeLogsEndpoint.js';
import {cleanupDeletedObjsEndpoint} from './httpEndpoints/objs/cleanupDeletedObjsEndpoint.js';
import {indexObjsEndpoint} from './httpEndpoints/objs/indexObjsEndpoint.js';
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

  app.post('/logs/consumeLogs', (req, res) => {
    consumeLogsEndpoint(req, res);
  });

  app.listen(port, () => {
    fimidxNodeWinstonLogger.info('HTTP server is running', {port});
  });
}
