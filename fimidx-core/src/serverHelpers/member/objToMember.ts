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
    updatedAt: obj.updatedAt,
    email: obj.objRecord.email ?? null,
    memberId: obj.objRecord.memberId,
    groupId: obj.groupId,
    permissions: permissions,
    status: obj.objRecord.status,
    statusUpdatedAt:
      obj.objRecord.statusUpdatedAt instanceof Date
        ? obj.objRecord.statusUpdatedAt
        : new Date(obj.objRecord.statusUpdatedAt),
    sentEmailCount: obj.objRecord.sentEmailCount,
    emailLastSentAt:
      obj.objRecord.emailLastSentAt instanceof Date
        ? obj.objRecord.emailLastSentAt
        : obj.objRecord.emailLastSentAt
        ? new Date(obj.objRecord.emailLastSentAt)
        : null,
    emailLastSentStatus: obj.objRecord.emailLastSentStatus,
    createdBy: obj.createdBy,
    updatedBy: obj.updatedBy,
    projectId: obj.projectId,
    createdByType: obj.createdByType,
    updatedByType: obj.updatedByType,
    description: obj.objRecord.description ?? null,
    name: obj.objRecord.name,
    meta: obj.objRecord.meta,
  };
}
