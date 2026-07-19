import type { IClientToken } from "../../definitions/clientToken.js";
import type { IObj } from "../../definitions/obj.js";
import type { IPermissionAtom } from "../../definitions/permission.js";

/** Accepts full or projected lean objs; missing fields may be undefined. */
export function objToClientToken<
  T extends Partial<IClientToken> = IClientToken
>(obj: Partial<IObj>, permissions: IPermissionAtom[] | null): T {
  const record = obj.objRecord ?? {};
  return {
    id: obj.id,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
    projectId: obj.projectId,
    name: record.name,
    description: record.description,
    meta: record.meta,
    createdBy: obj.createdBy,
    createdByType: obj.createdByType,
    updatedBy: obj.updatedBy,
    updatedByType: obj.updatedByType,
    groupId: obj.groupId,
    permissions,
  } as T;
}
