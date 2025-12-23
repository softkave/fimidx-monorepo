import type { ILogFileConsumption } from "../../db/fimidx.mongo.js";
import { getLogFileConsumptionModel } from "../../db/fimidx.mongo.js";

export async function updateLogFileConsumption(params: {
  appId: string;
  filePath: string;
  lastDay: string;
  fileIndex: number;
  lastPosition: number;
  lastModified: number;
}): Promise<ILogFileConsumption> {
  const { appId, filePath, lastDay, fileIndex, lastPosition, lastModified } =
    params;
  const model = getLogFileConsumptionModel();

  const doc = await model.findOneAndUpdate(
    {
      appId,
      filePath,
    },
    {
      $set: {
        lastDay,
        fileIndex,
        lastPosition,
        lastModified,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    {
      upsert: true,
      new: true,
    }
  );

  return doc.toObject();
}
