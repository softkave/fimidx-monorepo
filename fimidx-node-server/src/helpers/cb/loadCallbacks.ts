import {getObjModel} from 'fimidx-core/db/fimidx.mongo';
import {ICallback} from 'fimidx-core/definitions/callback';
import {kObjTags} from 'fimidx-core/definitions/obj';
import {objToCallback} from 'fimidx-core/serverHelpers/index';
import {addCallbackToStore} from './addCallbackToStore.js';
import {fimidxNodeWinstonLogger} from '../../utils/fimidxNodeloggers.js';

export async function loadCallbacks() {
  fimidxNodeWinstonLogger.info('Loading callbacks');
  let batch: ICallback[] = [];
  let page = 0;
  const batchSize = 100;

  do {
    const objs = await getObjModel()
      .find({
        tag: kObjTags.callback,
        deletedAt: {
          $eq: null,
        },
      })
      .skip(page * batchSize)
      .limit(batchSize)
      .lean();

    batch = objs.map(objToCallback);
    batch.forEach(callback => {
      const timeoutDate = callback.timeout
        ? new Date(callback.timeout)
        : undefined;
      const intervalFrom = callback.intervalFrom
        ? new Date(callback.intervalFrom)
        : undefined;
      let isValid = false;

      if (timeoutDate && timeoutDate < new Date()) {
        isValid = true;
      } else if (intervalFrom && intervalFrom < new Date()) {
        isValid = true;
      }

      if (isValid) {
        addCallbackToStore({
          id: callback.id,
          timeoutDate,
          intervalFrom,
          intervalMs: callback.intervalMs,
        });
      }
    });

    page++;
  } while (batch.length > 0);
}
