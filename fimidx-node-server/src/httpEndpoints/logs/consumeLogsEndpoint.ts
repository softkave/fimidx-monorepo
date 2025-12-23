import {Request, Response} from 'express';
import {getCoreConfig} from 'fimidx-core/common/getCoreConfig';
import {getRedlock} from 'fimidx-core/common/redlock';
import {consumeLogs} from 'fimidx-core/serverHelpers/index';
import {kPromiseStore} from '../../ctx/promiseStore.js';
import {kInternalAccessKeyHeader} from '../../httpServer.js';

export async function consumeLogsEndpoint(req: Request, res: Response) {
  const {
    fimidxInternal: {internalAccessKey},
    consumeLogs: consumeLogsConfig,
  } = getCoreConfig();
  const apiKey = req.headers[kInternalAccessKeyHeader];

  if (apiKey !== internalAccessKey) {
    res.status(401).send('Unauthorized');
    return;
  }

  // Get lock
  const lock = getRedlock(
    'consumeLogs',
    consumeLogsConfig?.intervalMs ?? 30000,
  );

  // Try to acquire lock
  const handle = await lock.acquire();
  if (!handle) {
    // Lock couldn't be acquired, skip this run
    res.status(200).send({skipped: true});
    return;
  }

  kPromiseStore.callAndForget(async () => {
    try {
      await consumeLogs();
    } catch (error) {
      console.error('Error in consumeLogs:', error);
    } finally {
      await lock.release(handle);
    }
  });

  res.status(200).send({});
}
