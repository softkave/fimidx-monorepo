import assert from "assert";
import { first } from "lodash-es";
import { kOwnServerErrorCodes, OwnServerError } from "../../common/error.js";
import {
  kMemberStatus,
  type AddMemberEndpointArgs,
  type IMemberObjRecord,
} from "../../definitions/member.js";
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

export async function addMember(params: {
  args: AddMemberEndpointArgs;
  by: string;
  byType: string;
  seed?: Partial<IMemberObjRecord>;
  storage?: IObjStorage;
}) {
  const { args, by, byType, seed, storage } = params;
  const {
    name,
    description,
    appId,
    meta,
    permissions,
    groupId,
    email,
    memberId,
  } = args;

  // TODO: Long-term plan is to support complex queries for conflict matching at
  // the storage and other layers. For now, we handle the need in addMember
  // solo, and come back to the heavy lifting later. The current conflictOnKeys
  // in setManyObjs and IObjStorage only supports AND checks on the conflict
  // keys provided. We need OR logic here: conflict if memberId OR email already
  // exists.

  // Manual conflict detection: Check for existing memberId
  if (memberId) {
    const existingMemberId = await getManyObjs({
      objQuery: {
        appId,
        topLevelFields: {
          groupId: groupId ? { eq: groupId } : undefined,
        },
        partQuery: {
          and: [
            {
              op: "eq",
              field: "memberId",
              value: memberId,
            },
          ],
        },
      },
      tag: kObjTags.member,
      limit: 1,
      storage,
    });

    if (existingMemberId.objs.length > 0) {
      throw new OwnServerError(
        `Member with memberId '${memberId}' already exists`,
        kOwnServerErrorCodes.InvalidRequest
      );
    }
  }

  // Manual conflict detection: Check for existing email
  if (email) {
    const existingEmail = await getManyObjs({
      objQuery: {
        appId,
        topLevelFields: {
          groupId: groupId ? { eq: groupId } : undefined,
        },
        partQuery: {
          and: [
            {
              op: "eq",
              field: "email",
              value: email,
            },
          ],
        },
      },
      tag: kObjTags.member,
      limit: 1,
      storage,
    });

    if (existingEmail.objs.length > 0) {
      throw new OwnServerError(
        `Member with email '${email}' already exists`,
        kOwnServerErrorCodes.InvalidRequest
      );
    }
  }

  const objRecord: IMemberObjRecord = {
    name,
    description: description ?? null,
    meta,
    status: seed?.status ?? kMemberStatus.pending,
    statusUpdatedAt: seed?.statusUpdatedAt ?? new Date(),
    sentEmailCount: seed?.sentEmailCount ?? 0,
    emailLastSentAt: seed?.emailLastSentAt ?? null,
    emailLastSentStatus: seed?.emailLastSentStatus ?? null,
    email: email ?? null,
    memberId,
  };

  // Since we've manually checked for conflicts, we can use an empty conflictOnKeys array
  const { failedItems, newObjs } = await setManyObjs({
    by,
    byType,
    groupId,
    tag: kObjTags.member,
    input: {
      appId,
      items: [objRecord],
      conflictOnKeys: [], // No conflicts expected since we checked manually
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

  let newPermissions: IPermissionAtom[] | null = null;
  if (permissions && permissions.length > 0) {
    const { permissions: managedPermissions } = await addMemberPermissions({
      by,
      byType,
      groupId,
      appId,
      permissions,
      memberId,
      storage,
    });

    // Transform managed permissions back to original format
    newPermissions = managedPermissions.map((permission) =>
      getOriginalMemberPermission({
        permission,
        memberId,
      })
    );
  }

  const obj = first(newObjs);
  assert.ok(
    obj,
    new OwnServerError(
      "Failed to add member",
      kOwnServerErrorCodes.InternalServerError
    )
  );

  const member = objToMember(obj, newPermissions);
  return { member };
}
