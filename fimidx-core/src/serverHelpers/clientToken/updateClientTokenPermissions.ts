import assert from "assert";
import { first } from "lodash-es";
import { isString } from "lodash-es";
import { kOwnServerErrorCodes, OwnServerError } from "../../common/error.js";
import { jsRecordToObjRecordQueryList } from "../../common/obj.js";
import type { UpdateClientTokenPermissionsEndpointArgs } from "../../definitions/clientToken.js";
import type { GetPermissionsEndpointArgs } from "../../definitions/permission.js";
import type { IObjStorage } from "../../storage/types.js";
import { deletePermissions } from "../permission/deletePermissions.js";
import {
  addClientTokenPermissions,
  getFimidxManagedClientTokenPermission,
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
        projectId: query.projectId,
        groupId: query.groupId,
        id: { eq: query.id },
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

  const clientTokenId = clientToken.id;

  if (update.removeAllPermissions) {
    await deletePermissions({
      query: {
        projectId: clientToken.projectId,
        entity: { eq: clientTokenId },
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
        const managed = getFimidxManagedClientTokenPermission({
          permission: {
            entity: clientTokenId,
            action: item.action,
            target: item.target,
          },
          clientTokenId,
          groupId: clientToken.groupId,
        });
        return {
          projectId: clientToken.projectId,
          entity: isString(managed.entity)
            ? { eq: managed.entity }
            : jsRecordToObjRecordQueryList(
                managed.entity as Record<string, string>
              ),
          action: isString(managed.action)
            ? { eq: managed.action }
            : jsRecordToObjRecordQueryList(
                managed.action as Record<string, string>
              ),
          target: isString(managed.target)
            ? { eq: managed.target }
            : jsRecordToObjRecordQueryList(
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
    await addClientTokenPermissions({
      by,
      byType,
      groupId: clientToken.groupId,
      projectId: clientToken.projectId,
      permissions: update.addPermissions,
      clientTokenId,
      storage,
    });
  }
}
