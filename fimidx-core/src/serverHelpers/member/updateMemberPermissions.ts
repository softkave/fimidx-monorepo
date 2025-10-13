import assert from "assert";
import { first } from "lodash-es";
import { kOwnServerErrorCodes, OwnServerError } from "../../common/error.js";
import type { UpdateMemberPermissionsEndpointArgs } from "../../definitions/member.js";
import type { IObjStorage } from "../../storage/types.js";
import {
  addMemberPermissions,
  getOriginalMemberPermission,
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
        appId: query.appId,
        groupId: query.groupId,
        memberId: {
          eq: query.memberId,
        },
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

  const { permissions: managedPermissions } = await addMemberPermissions({
    by,
    byType,
    groupId: member.groupId,
    appId: member.appId,
    permissions: update.permissions,
    memberId: member.memberId,
    storage,
  });

  // Transform managed permissions back to original format
  const originalPermissions = managedPermissions.map((permission) =>
    getOriginalMemberPermission({
      permission,
      memberId: member.memberId,
    })
  );

  member.permissions = originalPermissions;

  return {
    member,
  };
}
