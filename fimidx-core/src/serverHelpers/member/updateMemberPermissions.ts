import assert from "assert";
import { isString } from "lodash-es";
import { first } from "lodash-es";
import { kOwnServerErrorCodes, OwnServerError } from "../../common/error.js";
import { jsRecordToObjPartQueryList } from "../../common/obj.js";
import type { UpdateMemberPermissionsEndpointArgs } from "../../definitions/member.js";
import type { GetPermissionsEndpointArgs } from "../../definitions/permission.js";
import type { IObjStorage } from "../../storage/types.js";
import { deletePermissions } from "../permission/deletePermissions.js";
import {
  addMemberPermissions,
  getFimidxManagedMemberPermission,
} from "./addMemberPermissions.js";
import { getMembers } from "./getMembers.js";

export async function updateMemberPermissions(params: {
  args: UpdateMemberPermissionsEndpointArgs;
  by: string;
  byType: string;
  storage?: IObjStorage;
}) {
  const { args, by, byType, storage } = params;
  const { query, update } = args;

  const { members } = await getMembers({
    args: {
      query: {
        projectId: query.projectId,
        groupId: query.groupId,
        id: { eq: query.id },
      },
      includePermissions: true,
    },
    storage,
  });

  const member = first(members);
  assert.ok(
    member,
    new OwnServerError(
      "Member not found",
      kOwnServerErrorCodes.InternalServerError
    )
  );

  const memberId = member.id;

  if (update.removeAllPermissions) {
    await deletePermissions({
      query: {
        projectId: member.projectId,
        entity: { eq: memberId },
      },
      deleteMany: true,
      by,
      byType,
      storage,
    });
  }

  if (update.removePermissions?.length) {
    const queries: GetPermissionsEndpointArgs["query"][] =
      update.removePermissions.map((item) => {
        const managed = getFimidxManagedMemberPermission({
          permission: {
            entity: memberId,
            action: item.action,
            target: item.target,
          },
          memberId,
          groupId: member.groupId,
        });
        return {
          projectId: member.projectId,
          entity: isString(managed.entity)
            ? { eq: managed.entity }
            : jsRecordToObjPartQueryList(
                managed.entity as Record<string, string>
              ),
          action: isString(managed.action)
            ? { eq: managed.action }
            : jsRecordToObjPartQueryList(
                managed.action as Record<string, string>
              ),
          target: isString(managed.target)
            ? { eq: managed.target }
            : jsRecordToObjPartQueryList(
                managed.target as Record<string, string>
              ),
        };
      });
    await deletePermissions({
      queries,
      deleteMany: true,
      by,
      byType,
      storage,
    });
  }

  if (update.addPermissions?.length) {
    await addMemberPermissions({
      by,
      byType,
      groupId: member.groupId,
      projectId: member.projectId,
      permissions: update.addPermissions,
      memberId,
      storage,
    });
  }
}
