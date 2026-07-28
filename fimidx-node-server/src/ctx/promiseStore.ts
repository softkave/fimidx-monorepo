import {PromiseStore} from 'softkave-js-utils';
import {fimidxNodeWinstonLogger} from '../utils/fimidxNodeloggers.js';

/** Routes background promise failures to winston instead of bare console. */
export const kPromiseStore = new PromiseStore({
  log: (...args: unknown[]) => {
    fimidxNodeWinstonLogger.info('Background promise', {args});
  },
  error: (...args: unknown[]) => {
    fimidxNodeWinstonLogger.error('Background promise failed', {
      error: args[0],
    });
  },
});
