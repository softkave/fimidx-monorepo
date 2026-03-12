import assert from "assert";
import { first } from "lodash-es";
import { kOwnServerErrorCodes, OwnServerError } from "../../common/error.js";
import type { AddMemberEndpointArgs } from "../../definitions/member.js";
import { kObjTags } from "../../definitions/obj.js";
import type { IPermissionAtom } from "../../definitions/permission.js";
import type { IObjStorage } from "../../storage/types.js";
import { setManyObjs } from "../obj/setObjs.js";
import {
  addMemberPermissions,
  getOriginalMemberPermission,
} from "./addMemberPermissions.js";
import { objToMember } from "./objToMember.js";

export async function addMember(params: {
  args: AddMemberEndpointArgs;
  by: string;
  byType: string;
  storage?: IObjStorage;
}) {
  const { args, by, byType, storage } = params;
  const { projectId, meta, permissions, groupId } = args;

  const { failedItems, newObjs } = await setManyObjs({
    by,
    byType,
    groupId,
    tag: kObjTags.member,
    input: {
      projectId,
      items: [{ meta }],
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
