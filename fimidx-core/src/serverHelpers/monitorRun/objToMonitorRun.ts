import type {
  IMonitorRun,
  IMonitorRunObjRecord,
} from "../../definitions/monitorRun.js";
import type { IObj } from "../../definitions/obj.js";

function toDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  return value instanceof Date ? value : new Date(value);
}

export function objToMonitorRun(obj: IObj): IMonitorRun {
  const record = obj.objRecord as IMonitorRunObjRecord;
  return {
    id: obj.id,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
    createdBy: obj.createdBy,
    createdByType: obj.createdByType,
    updatedBy: obj.updatedBy,
    updatedByType: obj.updatedByType,
    projectId: obj.projectId,
    groupId: obj.groupId,
    monitorId: record.monitorId,
    startedAt: toDate(record.startedAt)!,
    finishedAt: toDate(record.finishedAt)!,
    durationMs: record.durationMs,
    windowStart: toDate(record.windowStart)!,
    windowEnd: toDate(record.windowEnd)!,
    timeField: record.timeField,
    matchCount: record.matchCount,
    alertCreated: record.alertCreated,
    alertId: record.alertId ?? null,
    suppressedReason: record.suppressedReason ?? null,
    error: record.error ?? null,
  };
}
