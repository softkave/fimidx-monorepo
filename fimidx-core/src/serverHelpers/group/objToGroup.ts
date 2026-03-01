import type { IObj } from "fimidx-core/definitions/obj";
import type { IGroup } from "../../definitions/group.js";

export function objToGroup(obj: IObj): IGroup {
  return {
    id: obj.id,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
    projectId: obj.projectId,
    groupId: obj.groupId,
    name: obj.objRecord.name,
    description:
      obj.objRecord.description == null ? undefined : obj.objRecord.description,
    meta: obj.objRecord.meta == null ? undefined : obj.objRecord.meta,
    createdBy: obj.createdBy,
    createdByType: obj.createdByType,
    updatedBy: obj.updatedBy,
    updatedByType: obj.updatedByType,
  };
}
