import {kCallbackStore} from '../../ctx/callback.js';
import {kPromiseStore} from '../../ctx/promiseStore.js';
import {fimidxNodeWinstonLogger} from '../../utils/fimidxNodeloggers.js';
import {executeCallback} from './executeCallback.js';
import {removeCallbackFromStore} from './removeCallbackFromStore.js';

export function addCallbackToStore(params: {
  id: string;
  timeoutDate?: Date | null;
  intervalFrom?: Date | null;
  intervalMs?: number | null;
}) {
  // TODO: implement timeout packing

  // Replace any existing timer for this id (e.g. after interval/status updates).
  if (kCallbackStore[params.id]) {
    removeCallbackFromStore(params.id);
  }

  if (params.timeoutDate) {
    kCallbackStore[params.id] = {
      id: params.id,
      timeoutHandle: setTimeout(() => {
        delete kCallbackStore[params.id];
        kPromiseStore.callAndForget(() =>
          executeCallback({callbackId: params.id}),
        );
      }, params.timeoutDate.getTime() - Date.now()),
    };
  } else if (params.intervalMs && params.intervalFrom) {
    const now = new Date();
    const adder = () => {
      const existing = kCallbackStore[params.id];
      if (existing?.deferredStartHandle) {
        clearTimeout(existing.deferredStartHandle);
      }
      if (existing?.intervalHandle) {
        clearInterval(existing.intervalHandle);
      }
      kCallbackStore[params.id] = {
        id: params.id,
        intervalHandle: setInterval(() => {
          kPromiseStore.callAndForget(() =>
            executeCallback({callbackId: params.id}),
          );
        }, params.intervalMs!),
      };
    };

    fimidxNodeWinstonLogger.info('Adding callback to store', {
      callbackId: params.id,
    });

    if (params.intervalFrom > now) {
      const deferredStartHandle = setTimeout(
        adder,
        params.intervalFrom.getTime() - now.getTime(),
      );
      kCallbackStore[params.id] = {
        id: params.id,
        deferredStartHandle,
      };
    } else {
      adder();
    }
  }
}
