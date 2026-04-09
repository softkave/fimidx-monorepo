import {Request, Response} from 'express';
import {getCoreConfig} from 'fimidx-core/common/getCoreConfig';
import {
  deleteLocalSourceMapCacheEntriesOlderThanCycle,
  getProjectCycleCounts,
} from 'fimidx-core/serverHelpers/index';
import {AnyFn} from 'softkave-js-utils';
import {internalCallbackGuard} from '../../helpers/cb/internalCallbackGuard.js';
import {kInternalCallbackNames} from '../../helpers/setupCb/constants.js';
import {fimidxNodeWinstonLogger} from '../../utils/fimidxNodeloggers.js';

const defaultMaxUnusedCycles = 5;

export const purgeSourceMapCacheEndpoint: AnyFn<
  [req: Request, res: Response],
  Promise<void>
> = internalCallbackGuard(
  kInternalCallbackNames.purgeSourceMapCache,
  async () => {
    const maxUnusedCycles =
      getCoreConfig().purgeSourceMapCache?.maxUnusedCycles ??
      defaultMaxUnusedCycles;

    const projectCycleCounts = await getProjectCycleCounts();
    const deleted = await deleteLocalSourceMapCacheEntriesOlderThanCycle(
      maxUnusedCycles,
      projectCycleCounts,
    );
    fimidxNodeWinstonLogger.info('Purged source map cache entries', {
      deleted,
    });
  },
);
