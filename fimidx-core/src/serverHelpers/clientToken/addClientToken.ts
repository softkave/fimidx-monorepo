import assert from "assert";
import { kOwnServerErrorCodes, OwnServerError } from "../../common/error.js";
import type {
  AddClientTokenEndpointArgs,
  IClientTokenObjRecord,
} from "../../definitions/clientToken.js";
import { kObjTags } from "../../definitions/obj.js";
import type { IPermissionAtom } from "../../definitions/permission.js";
import type { IObjStorage } from "../../storage/types.js";
import { setManyObjs } from "../obj/setObjs.js";
import {
  addClientTokenPermissions,
  getOriginalClientTokenPermission,
} from "./addClientTokenPermissions.js";
import { objToClientToken } from "./objToClientToken.js";

export async function addClientToken(params: {
  args: AddClientTokenEndpointArgs;
  by: string;
  byType: string;
  storage?: IObjStorage;
}) {
  const { args, by, byType, storage } = params;
  const {
    name: inputName,
    description,
    appId,
    meta,
    permissions,
    groupId,
  } = args;
  const date = new Date();
  const name =
    inputName ??
    `token-${date.getTime()}-${date.getDate()}-${date.getMonth()}-${date.getFullYear()}`;
  const objRecord: IClientTokenObjRecord = {
    name,
    description,
    meta,
    permissions: null, // Permissions are now managed separately
  };

  const { failedItems, newObjs } = await setManyObjs({
    by,
    byType,
    groupId,
    tag: kObjTags.clientToken,
    input: {
      appId,
      items: [objRecord],
      conflictOnKeys: ["name", "appId"],
      onConflict: "fail",
    },
    storage,
  });

  assert.ok(
    failedItems.length === 0,
    new OwnServerError(
      "Failed to add client token",
      kOwnServerErrorCodes.InternalServerError
    )
  );
  assert.ok(
    newObjs.length === 1,
    new OwnServerError(
      "Failed to add client token",
      kOwnServerErrorCodes.InternalServerError
    )
  );

  const clientToken = objToClientToken(newObjs[0], null);

  // Add permissions if provided
  if (permissions && permissions.length > 0) {
    const { permissions: managedPermissions } = await addClientTokenPermissions(
      {
        by,
        byType,
        groupId,
        appId,
        permissions,
        clientTokenId: clientToken.id,
        storage,
      }
    );

    // Transform managed permissions back to original format
    const newPermissions: IPermissionAtom[] = managedPermissions.map(
      (permission) =>
        getOriginalClientTokenPermission({
          permission,
          clientTokenId: clientToken.id,
        })
    );
    clientToken.permissions = newPermissions;
  }

  return { clientToken };
}
