import assert from "assert";
import { first } from "lodash-es";
import { kOwnServerErrorCodes, OwnServerError } from "../../common/error.js";
import type { AddMemberEndpointArgs } from "../../definitions/member.js";
import { kObjTags } from "../../definitions/obj.js";
import type { IPermissionAtom } from "../../definitions/permission.js";
import type { IObjStorage } from "../../storage/types.js";
import { getManyObjs } from "../obj/getObjs.js";
import { setManyObjs } from "../obj/setObjs.js";
import {
  addMemberPermissions,
  getOriginalMemberPermission,
} from "./addMemberPermissions.js";
import { objToMember } from "./objToMember.js";

/** Reserved key in meta: conflict detection for internal members (e.g. same
 * user in org). */
const kMetaUserId = "userId";

export async function addMember(params: {
  args: AddMemberEndpointArgs;
  by: string;
  byType: string;
  storage?: IObjStorage;
}) {
  const { args, by, byType, storage } = params;
  const { projectId, meta, permissions, groupId } = args;

  const objRecord = meta ?? {};

  // Conflict detection for internal members: same userId in same group
  const userId = objRecord[kMetaUserId];
  if (userId && groupId) {
    const existing = await getManyObjs({
      objQuery: {
        metaQuery: {
          projectId: { eq: projectId },
          groupId: { eq: groupId },
        },
        recordQuery: {
          and: [{ op: "eq", field: kMetaUserId, value: userId }],
        },
      },
      tag: kObjTags.member,
      limit: 1,
      storage,
    });
    if (existing.objs.length > 0) {
      throw new OwnServerError(
        `Member with userId '${userId}' already exists in this group`,
        kOwnServerErrorCodes.InvalidRequest
      );
    }
  }

  const { failedItems, newObjs } = await setManyObjs({
    by,
    byType,
    groupId,
    tag: kObjTags.member,
    input: {
      projectId,
      items: [objRecord],
      conflictOnKeys: [],
      onConflict: "fail",
    },
    storage,
  });

  assert.ok(
    failedItems.length === 0,
    new OwnServerError(
      "Failed to add member",
      kOwnServerErrorCodes.InternalServerError
    )
  );

  const obj = first(newObjs);
  assert.ok(
    obj,
    new OwnServerError(
      "Failed to add member",
      kOwnServerErrorCodes.InternalServerError
    )
  );

  const memberId = obj.id;

  let newPermissions: IPermissionAtom[] | null = null;
  if (permissions && permissions.length > 0) {
    const { permissions: managedPermissions } = await addMemberPermissions({
      by,
      byType,
      groupId,
      projectId,
      permissions,
      memberId,
      storage,
    });
    newPermissions = managedPermissions.map((p) =>
      getOriginalMemberPermission({ permission: p, memberId })
    );
  }

  const member = objToMember(obj, newPermissions);
  return { member };
}
