import assert from "assert";
import { kOwnServerErrorCodes, OwnServerError } from "../../common/error.js";
import { kObjTags } from "../../definitions/obj.js";
import type {
  AddPermissionsEndpointArgs,
  IPermissionObjRecord,
} from "../../definitions/permission.js";
import type { IObjStorage } from "../../storage/types.js";
import { setManyObjs } from "../obj/setObjs.js";
import { objToPermission } from "./objToPermission.js";

export async function addPermissions(params: {
  args: AddPermissionsEndpointArgs;
  groupId: string;
  by: string;
  byType: string;
  storage?: IObjStorage;
}) {
  const { args, groupId, by, byType, storage } = params;
  const { appId, permissions } = args;

  const objRecords = permissions.map((permission): IPermissionObjRecord => {
    return {
      action: permission.action,
      target: permission.target,
      entity: permission.entity,
      description: permission.description,
      meta: permission.meta,
    };
  });

  const { failedItems, newObjs } = await setManyObjs({
    by,
    byType,
    groupId,
    tag: kObjTags.permission,
    input: {
      appId,
      items: objRecords,
    },
    storage,
  });

  assert.ok(
    failedItems.length === 0,
    new OwnServerError(
      "Failed to add permissions",
      kOwnServerErrorCodes.InternalServerError
    )
  );

  return {
    permissions: newObjs.map((obj) => objToPermission(obj)),
  };
}
