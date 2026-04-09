import {Request, Response} from 'express';
import {kOwnServerErrorCodes, OwnServerError} from 'fimidx-core/common/error';
import {getCoreConfig} from 'fimidx-core/common/getCoreConfig';
import {AnyFn} from 'softkave-js-utils';
import {kPromiseStore} from '../../ctx/promiseStore.js';
import {kInternalAccessKeyHeader} from '../../httpServer.js';
import {fimidxNodeWinstonLogger} from '../../utils/fimidxNodeloggers.js';

const callbacksInProgress = new Set<string>();

export function internalCallbackGuard(
  callbackId: string,
  cb: AnyFn<[req: Request, res: Response], Promise<void>>,
): AnyFn<[req: Request, res: Response], Promise<void>> {
  return async (req: Request, res: Response) => {
    try {
      const {
        fimidxInternal: {internalAccessKey},
      } = getCoreConfig();
      const apiKey = req.headers[kInternalAccessKeyHeader];

      if (apiKey !== internalAccessKey) {
        throw new OwnServerError(
          'Unauthorized',
          kOwnServerErrorCodes.Unauthorized,
          {callbackId},
        );
      }

      if (callbacksInProgress.has(callbackId)) {
        throw new OwnServerError(
          'Callback is already in progress',
          kOwnServerErrorCodes.Conflict,
          {callbackId},
        );
      }

      fimidxNodeWinstonLogger.info('Callback started', {callbackId});
      callbacksInProgress.add(callbackId);
      kPromiseStore.callAndForget(async () => {
        try {
          await cb(req, res);
          fimidxNodeWinstonLogger.info('Callback completed successfully', {
            callbackId,
          });
        } catch (error) {
          fimidxNodeWinstonLogger.error('Callback completed with error', {
            callbackId,
            error,
          });
          throw error;
        } finally {
          callbacksInProgress.delete(callbackId);
        }
      });

      res.status(200).send({});
    } catch (error) {
      fimidxNodeWinstonLogger.error('Callback error', {callbackId, error});
      if (OwnServerError.isOwnServerError(error)) {
        res.status(error.statusCode).send({
          message: error.message,
          name: 'OwnServerError',
        });
      } else {
        res.status(500).send({
          message: 'Internal server error',
          name: 'UnknownError',
        });
      }
    }
  };
}
