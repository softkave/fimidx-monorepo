import type { ILogFileConsumption } from "../../db/fimidx.mongo.js";
import { getLogFileConsumptionModel } from "../../db/fimidx.mongo.js";

export async function getLogFileConsumption(params: {
  appId: string;
  filePath: string;
}): Promise<ILogFileConsumption | null> {
  const { appId, filePath } = params;
  const model = getLogFileConsumptionModel();

  const doc = await model.findOne({
    appId,
    filePath,
  });

  return doc ? doc.toObject() : null;
}
