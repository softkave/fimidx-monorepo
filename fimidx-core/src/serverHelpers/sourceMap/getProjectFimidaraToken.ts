import { getProjectFimidaraTokenModel } from "../../db/sourceMap.mongo.js";
import type { IProjectFimidaraToken } from "../../definitions/sourceMap.js";

export async function getProjectFimidaraToken(
  projectId: string
): Promise<IProjectFimidaraToken | null> {
  const model = getProjectFimidaraTokenModel();
  const doc = await model.findOne({ projectId }).lean().exec();
  return doc ? (doc as IProjectFimidaraToken) : null;
}
