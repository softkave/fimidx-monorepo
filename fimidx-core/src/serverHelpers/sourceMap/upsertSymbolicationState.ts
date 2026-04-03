import { getSymbolicationStateModel } from "../../db/sourceMap.mongo.js";
import type { ISymbolicationState } from "../../definitions/sourceMap.js";

export async function upsertSymbolicationState(
  params: Partial<ISymbolicationState> & { projectId: string }
): Promise<ISymbolicationState> {
  const model = getSymbolicationStateModel();
  const { projectId, ...update } = params;
  const set: Record<string, unknown> = {};
  if (update.lastProcessedTimestampMs !== undefined)
    set.lastProcessedTimestampMs = update.lastProcessedTimestampMs;
  if (update.lastCycleAt !== undefined) set.lastCycleAt = update.lastCycleAt;
  if (update.cycleCount !== undefined) set.cycleCount = update.cycleCount;
  const doc = await model
    .findOneAndUpdate(
      { projectId },
      { $set: set },
      { upsert: true, new: true, runValidators: true }
    )
    .lean()
    .exec();
  return doc as ISymbolicationState;
}
