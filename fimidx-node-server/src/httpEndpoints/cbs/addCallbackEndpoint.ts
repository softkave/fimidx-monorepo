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
import {
  IAddCallbackHttpOutgoingSuccessResponse,
  IAddCallbacksHttpOutgoingSuccessResponse,
} from './types.js';

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
          success: true as const,
          callback,
        };
      } catch (error) {
        return {
          idempotencyKey: item.item.idempotencyKey,
          success: false as const,
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
        result && !result.success
          ? result.error
          : new OwnServerError(
              'Error adding callback',
              kOwnServerErrorCodes.InternalServerError,
            );
      item.reject(error);
    }
  });

  isProcessing = false;
  kPromiseStore.callAndForget(processNextCallbacksBatch);
}

function enqueueAddCallback(params: {
  item: AddCallbackEndpointArgs;
  groupId: string;
  clientTokenId: string;
}) {
  const promise = getDeferredPromise<ICallback>();
  const fimidxIdempotencyKey =
    params.item.idempotencyKey ||
    `__fimidx_generated_${randomUUID()}_${Date.now()}`;
  const item: AddCallbackEndpointArgs = {
    ...params.item,
    idempotencyKey: fimidxIdempotencyKey,
  };

  kAddCallbackQueue.push({
    groupId: params.groupId,
    clientTokenId: params.clientTokenId,
    item,
    resolve: promise.resolve,
    reject: promise.reject,
    fimidxIdempotencyKey,
  });

  kPromiseStore.callAndForget(processNextCallbacksBatch);

  return {
    fimidxIdempotencyKey,
    promise: promise.promise.then(callback => {
      addCallbackToStore({
        id: callback.id,
        timeoutDate: callback.timeout ? new Date(callback.timeout) : undefined,
        intervalFrom: callback.intervalFrom
          ? new Date(callback.intervalFrom)
          : undefined,
        intervalMs: callback.intervalMs,
      });
      return callback;
    }),
  };
}

export async function addCallbackEndpointImpl(params: {
  item: AddCallbackEndpointArgs;
  groupId: string;
  clientTokenId: string;
}) {
  const {promise} = enqueueAddCallback(params);
  return promise;
}

export async function addCallbacksEndpointImpl(params: {
  items: AddCallbackEndpointArgs[];
  groupId: string;
  clientTokenId: string;
}): Promise<
  Array<{
    idempotencyKey: string;
    success: boolean;
    callback?: ICallback;
    error?: string;
  }>
> {
  const enqueued = params.items.map(item =>
    enqueueAddCallback({
      item,
      groupId: params.groupId,
      clientTokenId: params.clientTokenId,
    }),
  );

  return Promise.all(
    enqueued.map(async ({fimidxIdempotencyKey, promise}) => {
      try {
        const callback = await promise;
        return {
          idempotencyKey: fimidxIdempotencyKey,
          success: true as const,
          callback,
        };
      } catch (error: unknown) {
        return {
          idempotencyKey: fimidxIdempotencyKey,
          success: false as const,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),
  );
}

const singleInputSchema = z.object({
  item: addCallbackSchema,
  groupId: z.string(),
  clientTokenId: z.string(),
});

const batchInputSchema = z.object({
  items: z.array(addCallbackSchema).min(1).max(100),
  groupId: z.string(),
  clientTokenId: z.string(),
});

const inputSchema = z.union([singleInputSchema, batchInputSchema]);

export async function addCallbackEndpoint(req: Request, res: Response) {
  const params = inputSchema.parse(req.body);

  if ('items' in params) {
    const results = await addCallbacksEndpointImpl(params);
    const response: IAddCallbacksHttpOutgoingSuccessResponse = {
      type: 'success',
      results,
    };
    res.status(200).send(response);
    return;
  }

  const callback = await addCallbackEndpointImpl(params);
  const response: IAddCallbackHttpOutgoingSuccessResponse = {
    type: 'success',
    callback,
  };
  res.status(200).send(response);
}
