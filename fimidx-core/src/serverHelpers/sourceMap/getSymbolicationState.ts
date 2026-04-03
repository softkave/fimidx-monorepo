import { getSymbolicationStateModel } from "../../db/sourceMap.mongo.js";
import type { ISymbolicationState } from "../../definitions/sourceMap.js";

export async function getSymbolicationState(
  projectId: string
): Promise<ISymbolicationState | null> {
  const model = getSymbolicationStateModel();
  const doc = await model.findOne({ projectId }).lean().exec();
  return doc ? (doc as ISymbolicationState) : null;
}
