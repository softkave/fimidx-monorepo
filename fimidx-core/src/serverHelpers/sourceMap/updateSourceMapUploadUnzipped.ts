import { getSourceMapUploadModel } from "../../db/sourceMap.mongo.js";

export async function updateSourceMapUploadUnzipped(
  projectId: string,
  repoIdentifier: string,
  version: string,
  unzippedFimidaraPath: string
): Promise<void> {
  const model = getSourceMapUploadModel();
  await model
    .updateOne(
      { projectId, repoIdentifier, version },
      { $set: { unzippedFimidaraPath } }
    )
    .exec();
}
