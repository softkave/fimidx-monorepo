import axios, {AxiosError} from 'axios';
import {getObjModel} from 'fimidx-core/db/fimidx.mongo';
import {
  callbackMethodSchema,
  kCallbackFimidxHeaders,
} from 'fimidx-core/definitions/index';
import {kObjTags} from 'fimidx-core/definitions/obj';
import {
  addCallbackExecution,
  objToCallback,
} from 'fimidx-core/serverHelpers/index';
import {kPromiseStore} from '../../ctx/promiseStore.js';
import {fimidxNodeWinstonLogger} from '../../utils/fimidxNodeloggers.js';
import {removeCallbackFromStore} from './removeCallbackFromStore.js';

export async function executeCallback(params: {callbackId: string}) {
  const {callbackId} = params;
  const obj = await getObjModel()
    .findOne({
      id: callbackId,
      tag: kObjTags.callback,
      deletedAt: null,
    })
    .lean();

  if (!obj) {
    removeCallbackFromStore(callbackId);
    return;
  }

  const callback = objToCallback(obj);
  fimidxNodeWinstonLogger.info('Executing callback', {
    callbackId: callback.id,
  });

  try {
    const response = await axios({
      method: callback.method,
      url: callback.url,
      data:
        callback.method === callbackMethodSchema.Values.GET
          ? undefined
          : callback.requestBody,
      headers: {
        ...(callback.requestHeaders ?? {}),
        [kCallbackFimidxHeaders.callbackId]: callback.id,
        [kCallbackFimidxHeaders.lastExecutedAt]: callback.lastExecutedAt
          ? new Date(callback.lastExecutedAt).toISOString()
          : undefined,
        [kCallbackFimidxHeaders.lastSuccessAt]: callback.lastSuccessAt
          ? new Date(callback.lastSuccessAt).toISOString()
          : undefined,
        [kCallbackFimidxHeaders.lastErrorAt]: callback.lastErrorAt
          ? new Date(callback.lastErrorAt).toISOString()
          : undefined,
      },
    });

    // separate execution to ensure the only error thrown is the one from axios
    kPromiseStore.callAndForget(async () => {
      await addCallbackExecution({
        projectId: callback.projectId,
        groupId: callback.groupId,
        callbackId,
        error: null,
        responseHeaders: Object.fromEntries(
          Object.entries(response.headers).map(([key, value]) => [
            key,
            value as string,
          ]),
        ),
        responseBody: response.data,
        responseStatusCode: response.status,
        executedAt: new Date(),
        clientTokenId: callback.createdBy,
      });
    });
  } catch (error) {
    kPromiseStore.callAndForget(async () => {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        await addCallbackExecution({
          projectId: callback.projectId,
          groupId: callback.groupId,
          callbackId,
          error: axiosError.message,
          responseHeaders: Object.fromEntries(
            Object.entries(axiosError.response.headers).map(([key, value]) => [
              key,
              value as string,
            ]),
          ),
          responseBody: axiosError.response.data
            ? String(axiosError.response.data)
            : null,
          executedAt: new Date(),
          clientTokenId: callback.createdBy,
          responseStatusCode: axiosError.response.status,
        });
      } else {
        await addCallbackExecution({
          projectId: callback.projectId,
          groupId: callback.groupId,
          callbackId,
          error: error instanceof Error ? error.message : String(error),
          responseHeaders: null,
          responseBody: null,
          responseStatusCode: null,
          executedAt: new Date(),
          clientTokenId: callback.createdBy,
        });
      }
    });
  }
}
