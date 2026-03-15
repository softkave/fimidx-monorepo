import {Request, Response} from 'express';
import {getCoreConfig} from 'fimidx-core/common/getCoreConfig';
import {
  deleteLocalSourceMapCacheEntriesOlderThanCycle,
  getProjectCycleCounts,
} from 'fimidx-core/serverHelpers/index';
import {fimidxNodeWinstonLogger} from '../../utils/fimidxNodeloggers.js';

const defaultMaxUnusedCycles = 5;

export async function purgeSourceMapCacheEndpoint(req: Request, res: Response) {
  try {
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
  } catch (err) {
    fimidxNodeWinstonLogger.error('Purge source map cache error', {
      error: err,
    });
  }
  res.status(200).send({});
}
