import type { IObj } from "fimidx-core/definitions/obj";
import type { IPermission } from "../../definitions/permission.js";

export function objToPermission(obj: IObj): IPermission {
  return {
    id: obj.id,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
    groupId: obj.groupId,
    projectId: obj.projectId,
    createdBy: obj.createdBy,
    createdByType: obj.createdByType,
    updatedBy: obj.updatedBy,
    updatedByType: obj.updatedByType,
    action: obj.objRecord.action,
    target: obj.objRecord.target,
    entity: obj.objRecord.entity,
    granted: obj.objRecord.granted !== false,
    description: obj.objRecord.description,
    meta: obj.objRecord.meta,
  };
}
