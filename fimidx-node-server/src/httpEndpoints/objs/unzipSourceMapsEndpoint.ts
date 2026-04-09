import { Request, Response } from "express";
import {
  getSourceMapUploadsPendingUnzipPage,
  unzipSourceMapUpload,
} from "fimidx-core/serverHelpers/index";
import { fimidxNodeWinstonLogger } from "../../utils/fimidxNodeloggers.js";

/** Max pending rows loaded per DB round-trip; not exposed on the HTTP API. */
const kUnzipSourceMapsBatchSize = 50;

export async function unzipSourceMapsEndpoint(req: Request, res: Response) {
  try {
    for (;;) {
      const { items: pending, hasMore } =
        await getSourceMapUploadsPendingUnzipPage({
          page: 1,
          pageSize: kUnzipSourceMapsBatchSize,
        });
      for (const upload of pending) {
        try {
          await unzipSourceMapUpload(upload);
          fimidxNodeWinstonLogger.info("Unzipped source map upload locally", {
            projectId: upload.projectId,
            repoIdentifier: upload.repoIdentifier,
            version: upload.version,
          });
        } catch (err) {
          fimidxNodeWinstonLogger.error("Failed to unzip source map upload", {
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
  } catch (err) {
    fimidxNodeWinstonLogger.error("Unzip source maps callback error", {
      error: err,
    });
  }
  res.status(200).send({});
}
