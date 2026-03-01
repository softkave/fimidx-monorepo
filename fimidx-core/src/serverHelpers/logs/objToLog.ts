import type { ILog } from "../../definitions/log.js";
import type { IObj } from "../../definitions/obj.js";

export function objToLog(obj: IObj): ILog {
  return {
    id: obj.id,
    createdAt: obj.createdAt,
    createdBy: obj.createdBy,
    createdByType: obj.createdByType,
    projectId: obj.projectId,
    groupId: obj.groupId,
    data: obj.objRecord,
  };
}
