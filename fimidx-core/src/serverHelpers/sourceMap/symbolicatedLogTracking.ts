import { getSymbolicatedLogTrackingModel } from "../../db/sourceMap.mongo.js";
import type { ISymbolicatedLogTracking } from "../../definitions/sourceMap.js";

export async function createSymbolicatedLogTracking(
  params: ISymbolicatedLogTracking
): Promise<ISymbolicatedLogTracking> {
  const model = getSymbolicatedLogTrackingModel();
  const doc = await model.create(params);
  return doc.toObject() as ISymbolicatedLogTracking;
}

export async function getSymbolicatedLogTrackingByLogId(
  logId: string
): Promise<ISymbolicatedLogTracking[]> {
  const model = getSymbolicatedLogTrackingModel();
  const docs = await model.find({ logId }).lean().exec();
  return docs as ISymbolicatedLogTracking[];
}
