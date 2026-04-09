import {Request, Response} from 'express';
import {
  getSourceMapUploadsPendingUnzipPage,
  unzipSourceMapUpload,
} from 'fimidx-core/serverHelpers/index';
import {AnyFn} from 'softkave-js-utils';
import {internalCallbackGuard} from '../../helpers/cb/internalCallbackGuard.js';
import {kInternalCallbackNames} from '../../helpers/setupCbs/constants.js';
import {fimidxNodeWinstonLogger} from '../../utils/fimidxNodeloggers.js';

/** Max pending rows loaded per DB round-trip; not exposed on the HTTP API. */
const kUnzipSourceMapsBatchSize = 50;
const kMaxIterations = 1000; // prevent infinite loop

export const unzipSourceMapsEndpoint: AnyFn<
  [req: Request, res: Response],
  Promise<void>
> = internalCallbackGuard(kInternalCallbackNames.unzipSourceMaps, async () => {
  for (let i = 0; i < kMaxIterations; i++) {
    const {items: pending, hasMore} = await getSourceMapUploadsPendingUnzipPage(
      {
        page: 1,
        pageSize: kUnzipSourceMapsBatchSize,
      },
    );

    for (const upload of pending) {
      try {
        await unzipSourceMapUpload(upload);
        fimidxNodeWinstonLogger.info('Unzipped source map upload locally', {
          projectId: upload.projectId,
          repoIdentifier: upload.repoIdentifier,
          version: upload.version,
        });
      } catch (err) {
        fimidxNodeWinstonLogger.error('Failed to unzip source map upload', {
          projectId: upload.projectId,
          repoIdentifier: upload.repoIdentifier,
          version: upload.version,
          error: err,
        });
      }
    }

    if (!hasMore || pending.length === 0) {
      break;
    }
  }
});
