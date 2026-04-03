import { getProjectFimidaraTokenModel } from "../../db/sourceMap.mongo.js";
import type { IProjectFimidaraToken } from "../../definitions/sourceMap.js";

export async function upsertProjectFimidaraToken(
  params: Omit<IProjectFimidaraToken, "updatedAt"> & { updatedAt?: Date }
): Promise<IProjectFimidaraToken> {
  const model = getProjectFimidaraTokenModel();
  const now = new Date();
  const doc = await model
    .findOneAndUpdate(
      { projectId: params.projectId },
      {
        $set: {
          fimidaraTokenId: params.fimidaraTokenId,
          encodedToken: params.encodedToken,
          folderBasePath: params.folderBasePath,
          updatedAt: params.updatedAt ?? now,
        },
      },
      { upsert: true, new: true, runValidators: true }
    )
    .lean()
    .exec();
  return doc as IProjectFimidaraToken;
}
