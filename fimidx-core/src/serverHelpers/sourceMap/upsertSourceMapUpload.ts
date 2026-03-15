import { getSourceMapUploadModel } from "../../db/sourceMap.mongo.js";
import type { ISourceMapUpload } from "../../definitions/sourceMap.js";

export async function upsertSourceMapUpload(
  params: ISourceMapUpload
): Promise<ISourceMapUpload> {
  const model = getSourceMapUploadModel();
  const doc = await model
    .findOneAndUpdate(
      {
        projectId: params.projectId,
        repoIdentifier: params.repoIdentifier,
        version: params.version,
      },
      {
        $set: {
          fimidaraPath: params.fimidaraPath,
          isZip: params.isZip,
          uploadedAt: params.uploadedAt,
          createdBy: params.createdBy,
          ...(params.unzippedFimidaraPath != null && {
            unzippedFimidaraPath: params.unzippedFimidaraPath,
          }),
          ...(params.repoIdentifierDisplay != null && {
            repoIdentifierDisplay: params.repoIdentifierDisplay,
          }),
          ...(params.versionDisplay != null && {
            versionDisplay: params.versionDisplay,
          }),
        },
      },
      { upsert: true, new: true, runValidators: true }
    )
    .lean()
    .exec();
  return doc as ISourceMapUpload;
}
