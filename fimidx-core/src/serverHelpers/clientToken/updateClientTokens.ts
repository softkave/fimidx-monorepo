import { chunk } from "lodash-es";
import type { UpdateClientTokensEndpointArgs } from "../../definitions/clientToken.js";
import type { GetPermissionsEndpointArgs } from "../../definitions/permission.js";
import { kObjTags } from "../../definitions/obj.js";
import type { IObjStorage } from "../../storage/types.js";
import { updateManyObjs } from "../obj/updateObjs.js";
import {
  addClientTokenPermissions,
  getFimidxManagedClientTokenPermission,
} from "./addClientTokenPermissions.js";
import { getClientTokens, getClientTokensObjQuery } from "./getClientTokens.js";
import { deletePermissions } from "../permission/deletePermissions.js";

const CHUNK_SIZE = 50;

export async function updateClientTokens(params: {
  args: UpdateClientTokensEndpointArgs;
  by: string;
  byType: string;
  storage?: IObjStorage;
}) {
  const { args, by, byType, storage } = params;
  const { update, updateMany } = args;

  const hasPermissionUpdates =
    update.removeAllPermissions ||
    (update.removePermissions?.length ?? 0) > 0 ||
    (update.addPermissions?.length ?? 0) > 0;

  let tokensToUpdate: Awaited<
    ReturnType<typeof getClientTokens>
  >["clientTokens"] = [];
  if (hasPermissionUpdates) {
    const result = await getClientTokens({
      args: {
        query: args.query,
        includePermissions: true,
      },
      storage,
    });
    tokensToUpdate = result.clientTokens;
  }

  const {
    addPermissions: addPerms,
    removePermissions: removePerms,
    removeAllPermissions: removeAllPerms,
    ...otherUpdates
  } = update;

  const objQuery = getClientTokensObjQuery({ args });

  await updateManyObjs({
    objQuery,
    tag: kObjTags.clientToken,
    by,
    byType,
    update: otherUpdates,
    count: updateMany ? undefined : 1,
    updateWay: "merge",
    storage,
  });

  if (hasPermissionUpdates) {
    const deleteQueries: GetPermissionsEndpointArgs["query"][] = [];
    for (const clientToken of tokensToUpdate) {
      const clientTokenId = clientToken.id;

      if (removeAllPerms) {
        deleteQueries.push({
          projectId: clientToken.projectId,
          entity: { eq: clientTokenId },
        });
      } else if (removePerms?.length) {
        for (const item of removePerms) {
          const managed = getFimidxManagedClientTokenPermission({
            permission: {
              entity: clientTokenId,
              action: item.action,
              target: item.target,
            },
            clientTokenId,
            groupId: clientToken.groupId,
          });
          deleteQueries.push({
            projectId: clientToken.projectId,
            entity: { eq: managed.entity as string },
            action: { eq: managed.action as string },
            target: { eq: managed.target as string },
          });
        }
      }
    }

    if (deleteQueries.length > 0) {
      await deletePermissions({
        queries: deleteQueries,
        deleteMany: true,
        by,
        byType,
        storage,
      });
    }

    if (addPerms?.length) {
      const chunks = chunk(tokensToUpdate, CHUNK_SIZE);
      await Promise.all(
        chunks.map((tokenChunk) =>
          Promise.all(
            tokenChunk.map((clientToken) =>
              addClientTokenPermissions({
                by,
                byType,
                groupId: clientToken.groupId,
                projectId: clientToken.projectId,
                permissions: addPerms,
                clientTokenId: clientToken.id,
                storage,
              })
            )
          )
        )
      );
    }
  }
}
