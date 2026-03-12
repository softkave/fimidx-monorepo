import type { IObj } from "fimidx-core/definitions/obj";
import type { IProject } from "../../definitions/project.js";

export function objToProject(obj: IObj): IProject {
  return {
    id: obj.id,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
    createdBy: obj.createdBy,
    updatedBy: obj.updatedBy,
    orgId: obj.groupId,
    name: obj.objRecord.name,
    description:
      obj.objRecord.description === null
        ? undefined
        : obj.objRecord.description,
    createdByType: obj.createdByType,
    updatedByType: obj.updatedByType,
    objFieldsToIndex: obj.objRecord.objFieldsToIndex,
  };
}
