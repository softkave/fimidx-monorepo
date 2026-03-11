import type { IObj } from "fimidx-core/definitions/obj";
import type { IPermissionAtom } from "../../definitions/index.js";
import type { IMember } from "../../definitions/member.js";

export function objToMember(
  obj: IObj,
  permissions: IPermissionAtom[] | null
): IMember {
  return {
    id: obj.id,
    createdAt: obj.createdAt,
    createdBy: obj.createdBy,
    createdByType: obj.createdByType,
    updatedAt: obj.updatedAt,
    updatedBy: obj.updatedBy,
    updatedByType: obj.updatedByType,
    projectId: obj.projectId,
    groupId: obj.groupId,
    permissions,
    meta: obj.objRecord?.meta,
  };
}
