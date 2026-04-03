import { getSymbolicationConfigModel } from "../../db/sourceMap.mongo.js";
import type { ISymbolicationConfig } from "../../definitions/sourceMap.js";

export async function getSymbolicationConfig(
  projectId: string
): Promise<ISymbolicationConfig | null> {
  const model = getSymbolicationConfigModel();
  const doc = await model.findOne({ projectId }).lean().exec();
  return doc ? (doc as ISymbolicationConfig) : null;
}

export async function getSymbolicationConfigsForProjects(
  projectIds: string[]
): Promise<Map<string, ISymbolicationConfig>> {
  if (projectIds.length === 0) return new Map();
  const model = getSymbolicationConfigModel();
  const docs = await model.find({ projectId: { $in: projectIds } }).lean().exec();
  const map = new Map<string, ISymbolicationConfig>();
  for (const d of docs as ISymbolicationConfig[]) {
    map.set(d.projectId, d);
  }
  return map;
}

export async function getAllSymbolicationConfigs(): Promise<
  ISymbolicationConfig[]
> {
  const model = getSymbolicationConfigModel();
  const docs = await model.find({}).lean().exec();
  return docs as ISymbolicationConfig[];
}
