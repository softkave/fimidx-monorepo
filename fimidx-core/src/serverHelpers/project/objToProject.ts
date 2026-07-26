import type { IObj } from "../../definitions/obj.js";
import type { IProject } from "../../definitions/project.js";

/** Accepts full or projected lean objs; missing fields may be undefined. */
export function objToProject<T extends Partial<IProject> = IProject>(
  obj: Partial<IObj>
): T {
  const record = obj.objRecord ?? {};
  return {
    id: obj.id,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
    createdBy: obj.createdBy,
    updatedBy: obj.updatedBy,
    orgId: obj.groupId,
    name: record.name,
    description: record.description === null ? undefined : record.description,
    createdByType: obj.createdByType,
    updatedByType: obj.updatedByType,
    objFieldsToIndex: record.objFieldsToIndex,
  } as T;
}
