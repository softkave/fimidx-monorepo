import type { IObj } from "fimidx-core/definitions/obj";
import type { IClientToken } from "../../definitions/clientToken.js";
import type { IPermissionAtom } from "../../definitions/permission.js";

export function objToClientToken(
  obj: IObj,
  permissions: IPermissionAtom[] | null
): IClientToken {
  return {
    id: obj.id,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
    projectId: obj.projectId,
    name: obj.objRecord.name,
    description: obj.objRecord.description,
    meta: obj.objRecord.meta,
    createdBy: obj.createdBy,
    createdByType: obj.createdByType,
    updatedBy: obj.updatedBy,
    updatedByType: obj.updatedByType,
    groupId: obj.groupId,
    permissions: permissions,
  };
}
