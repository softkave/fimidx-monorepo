import { getSymbolicationConfigModel } from "../../db/sourceMap.mongo.js";
import type { ISymbolicationConfig } from "../../definitions/sourceMap.js";

export async function upsertSymbolicationConfig(
  params: ISymbolicationConfig
): Promise<ISymbolicationConfig> {
  const model = getSymbolicationConfigModel();
  const doc = await model
    .findOneAndUpdate(
      { projectId: params.projectId },
      {
        $set: {
          fieldsToSymbolicate: params.fieldsToSymbolicate,
          repoIdFields: params.repoIdFields,
          versionFields: params.versionFields,
        },
      },
      { upsert: true, new: true, runValidators: true }
    )
    .lean()
    .exec();
  return doc as ISymbolicationConfig;
}
