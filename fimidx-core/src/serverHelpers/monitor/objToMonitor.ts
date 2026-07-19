import type { IMonitor, IMonitorObjRecord } from "../../definitions/monitor.js";
import {
  kMonitorReportToTypes,
  kMonitorResourceTypes,
  kMonitorTimeFields,
  normalizeMonitorReportsTo,
} from "../../definitions/monitor.js";
import type { IObj } from "../../definitions/obj.js";

function toDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  return value instanceof Date ? value : new Date(value);
}

export function objToMonitor(obj: IObj): IMonitor {
  const record = obj.objRecord as IMonitorObjRecord;
  const rawReportsTo = record.reportsTo ?? [];
  // Support legacy { userId } without type and string userIds
  const reportsTo = normalizeMonitorReportsTo(
    rawReportsTo.map((r: any) => {
      if (typeof r === "string") return r;
      if (r?.type) return r;
      if (r?.userId) {
        return { type: kMonitorReportToTypes.user, userId: r.userId };
      }
      return r;
    })
  );

  return {
    id: obj.id,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
    projectId: obj.projectId,
    name: record.name,
    description: record.description,
    status: record.status,
    interval: record.interval,
    reportsTo,
    createdBy: obj.createdBy,
    createdByType: obj.createdByType,
    updatedBy: obj.updatedBy,
    updatedByType: obj.updatedByType,
    groupId: obj.groupId,
    query: record.query,
    resourceType: record.resourceType ?? kMonitorResourceTypes.logs,
    timeField: record.timeField ?? kMonitorTimeFields.createdAt,
    alertIfCountGreaterThan: record.alertIfCountGreaterThan ?? null,
    cooldown: record.cooldown ?? record.interval,
    muted: record.muted ?? false,
    snoozedUntil: toDate(record.snoozedUntil),
    lastRunAt: toDate(record.lastRunAt),
    lastAlertedAt: toDate(record.lastAlertedAt),
    runningAt: toDate(record.runningAt),
  };
}
