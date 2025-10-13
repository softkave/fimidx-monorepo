import assert from "assert";
import { first } from "lodash-es";
import { kOwnServerErrorCodes, OwnServerError } from "../../common/error.js";
import type { UpdateClientTokenPermissionsEndpointArgs } from "../../definitions/clientToken.js";
import type { IObjStorage } from "../../storage/types.js";
import {
  addClientTokenPermissions,
  getOriginalClientTokenPermission,
} from "./addClientTokenPermissions.js";
import { getClientTokens } from "./getClientTokens.js";

export async function updateClientTokenPermissions(params: {
  args: UpdateClientTokenPermissionsEndpointArgs;
  by: string;
  byType: string;
  storage?: IObjStorage;
}) {
  const { args, by, byType, storage } = params;
  const { query, update } = args;

  const { clientTokens } = await getClientTokens({
    args: {
      query: {
        appId: query.appId,
        id: {
          eq: query.id,
        },
      },
      includePermissions: true,
    },
    storage,
  });

  const clientToken = first(clientTokens);
  assert.ok(
    clientToken,
    new OwnServerError(
      "Client token not found",
      kOwnServerErrorCodes.InternalServerError
    )
  );

  const { permissions: newPermissions } = await addClientTokenPermissions({
    by,
    byType,
    groupId: clientToken.groupId,
    appId: clientToken.appId,
    permissions: update.permissions,
    clientTokenId: clientToken.id,
    storage,
  });

  // Transform managed permissions back to original format
  const originalPermissions = newPermissions.map((permission) =>
    getOriginalClientTokenPermission({
      permission,
      clientTokenId: clientToken.id,
    })
  );

  clientToken.permissions = originalPermissions;

  return {
    clientToken,
  };
}
