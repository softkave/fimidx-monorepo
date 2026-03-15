import { Request, Response } from "express";
import {
  getSourceMapUploadsPendingUnzip,
  unzipSourceMapUpload,
} from "fimidx-core/serverHelpers/index";
import { fimidxNodeWinstonLogger } from "../../utils/fimidxNodeloggers.js";

export async function unzipSourceMapsEndpoint(req: Request, res: Response) {
  try {
    const pending = await getSourceMapUploadsPendingUnzip();
    for (const upload of pending) {
      try {
        await unzipSourceMapUpload(upload);
        fimidxNodeWinstonLogger.info("Unzipped source map upload", {
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
  } catch (err) {
    fimidxNodeWinstonLogger.error("Unzip source maps callback error", {
      error: err,
    });
  }
  res.status(200).send({});
}
