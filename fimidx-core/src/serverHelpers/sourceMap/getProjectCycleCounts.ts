import { getSymbolicationStateModel } from "../../db/sourceMap.mongo.js";

export async function getProjectCycleCounts(): Promise<Map<string, number>> {
  const model = getSymbolicationStateModel();
  const docs = await model.find({}).lean().exec();
  const map = new Map<string, number>();
  for (const d of docs as { projectId: string; cycleCount: number }[]) {
    map.set(d.projectId, d.cycleCount);
  }
  return map;
}
