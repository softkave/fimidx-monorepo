import type { IMonitor } from "../../definitions/monitor.js";
import type { IObj } from "../../definitions/obj.js";

export function objToMonitor(obj: IObj): IMonitor {
  return {
    id: obj.id,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
    projectId: obj.projectId,
    name: obj.objRecord.name,
    description: obj.objRecord.description,
    status: obj.objRecord.status,
    interval: obj.objRecord.interval,
    reportsTo: obj.objRecord.reportsTo,
    createdBy: obj.createdBy,
    createdByType: obj.createdByType,
    updatedBy: obj.updatedBy,
    updatedByType: obj.updatedByType,
    groupId: obj.groupId,
    query: obj.objRecord.query,
  };
}
