import type { IAlert, IAlertObjRecord } from "../../definitions/alert.js";
import type { IObj } from "../../definitions/obj.js";

function toDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  return value instanceof Date ? value : new Date(value);
}

/** Accepts full or projected lean objs; missing fields may be undefined/defaulted. */
export function objToAlert<T extends Partial<IAlert> = IAlert>(
  obj: Partial<IObj>
): T {
  const record = (obj.objRecord ?? {}) as Partial<IAlertObjRecord>;
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
    monitorName: record.monitorName,
    monitorDescription: record.monitorDescription ?? null,
    resourceType: record.resourceType,
    timeField: record.timeField,
    query: record.query ?? {},
    windowStart: toDate(record.windowStart),
    windowEnd: toDate(record.windowEnd),
    matchCount: record.matchCount,
    alertIfCountGreaterThan: record.alertIfCountGreaterThan ?? null,
    notifiedUserIds: record.notifiedUserIds ?? [],
    acknowledgedAt: toDate(record.acknowledgedAt),
    acknowledgedBy: record.acknowledgedBy ?? null,
  } as T;
}
