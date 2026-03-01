import {randomUUID} from 'crypto';
import {Request, Response} from 'express';
import {kOwnServerErrorCodes, OwnServerError} from 'fimidx-core/common/error';
import {
  AddCallbackEndpointArgs,
  addCallbackSchema,
  ICallback,
} from 'fimidx-core/definitions/callback';
import {kByTypes} from 'fimidx-core/definitions/other';
import {addCallback} from 'fimidx-core/serverHelpers/index';
import {getDeferredPromise} from 'softkave-js-utils';
import {z} from 'zod';
import {kAddCallbackQueue} from '../../ctx/callback.js';
import {kPromiseStore} from '../../ctx/promiseStore.js';
import {addCallbackToStore} from '../../helpers/cb/addCallbackToStore.js';
import {IHttpOutgoingErrorResponse} from '../../types/http.js';
import {IAddCallbackHttpOutgoingSuccessResponse} from './types.js';

let isProcessing = false;

async function processNextCallbacksBatch() {
  // do not add any async code -- from here. this is to ensure the flow between
  // acquiring and locking is synchronous, so multiple calls to
  // processNextCallbacksBatch do not acquire and lock at the same time.
  if (isProcessing) {
    return;
  }

  isProcessing = true;
  // -- to here

  const batch = kAddCallbackQueue.splice(0, 100);

  if (batch.length === 0) {
    isProcessing = false;
    return;
  }

  const uniqueMap = new Map(
    batch.map(item => [item.item.idempotencyKey, item]),
  );
  const newUniqueBatch = Array.from(uniqueMap.values());
  const addCallbacksResults = await Promise.all(
    newUniqueBatch.map(async item => {
      try {
        const callback = await addCallback({
          args: item.item,
          groupId: item.groupId,
          projectId: item.item.projectId,
          by: item.clientTokenId,
          byType: kByTypes.clientToken,
        });

        return {
          idempotencyKey: item.item.idempotencyKey,
          success: true,
          callback,
        };
      } catch (error) {
        return {
          idempotencyKey: item.item.idempotencyKey,
          success: false,
          error,
        };
      }
    }),
  );

  const addCallbacksResultsMap = new Map(
    addCallbacksResults.map(item => [item.idempotencyKey, item]),
  );

  batch.forEach(item => {
    const idempotencyKey =
      item.item.idempotencyKey ?? item.fimidxIdempotencyKey;
    const result = addCallbacksResultsMap.get(idempotencyKey);
    const callback = result?.success ? result.callback : null;

    if (callback) {
      item.resolve(callback);
    } else {
      const error =
        result?.error ??
        new OwnServerError(
          'Error adding callback',
          kOwnServerErrorCodes.InternalServerError,
        );
      item.reject(error);
    }
  });

  isProcessing = false;
  kPromiseStore.callAndForget(processNextCallbacksBatch);
}

export async function addCallbackEndpointImpl(params: {
  item: AddCallbackEndpointArgs;
  groupId: string;
  clientTokenId: string;
}) {
  const promise = getDeferredPromise<ICallback>();
  kAddCallbackQueue.push({
    groupId: params.groupId,
    clientTokenId: params.clientTokenId,
    item: params.item,
    resolve: promise.resolve,
    reject: promise.reject,
    fimidxIdempotencyKey:
      params.item.idempotencyKey ||
      `__fimidx_generated_${randomUUID()}_${Date.now()}`,
  });

  kPromiseStore.callAndForget(processNextCallbacksBatch);
  const callback = await promise.promise;
  addCallbackToStore({
    id: callback.id,
    timeoutDate: callback.timeout ? new Date(callback.timeout) : undefined,
    intervalFrom: callback.intervalFrom
      ? new Date(callback.intervalFrom)
      : undefined,
    intervalMs: callback.intervalMs,
  });

  return callback;
}

const inputSchema = z.object({
  item: addCallbackSchema,
  groupId: z.string(),
  clientTokenId: z.string(),
});

export async function addCallbackEndpoint(req: Request, res: Response) {
  const params = inputSchema.parse(req.body);

  try {
    const callback = await addCallbackEndpointImpl(params);
    const response: IAddCallbackHttpOutgoingSuccessResponse = {
      type: 'success',
      callback,
    };

    res.status(200).send(response);
  } catch (error: unknown) {
    const code = OwnServerError.isOwnServerError(error)
      ? error.statusCode
      : kOwnServerErrorCodes.InternalServerError;
    const response: IHttpOutgoingErrorResponse = {
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
    res.status(code).send(response);
  }
}
