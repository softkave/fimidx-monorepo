import type { UpdateClientTokensEndpointArgs } from "../../definitions/clientToken.js";
import { kObjTags } from "../../definitions/obj.js";
import type { IObjStorage } from "../../storage/types.js";
import { updateManyObjs } from "../obj/updateObjs.js";
import { deletePermissions } from "../permission/deletePermissions.js";
import { addClientTokenPermissions } from "./addClientTokenPermissions.js";
import { getClientTokens, getClientTokensObjQuery } from "./getClientTokens.js";

export async function updateClientTokens(params: {
  args: UpdateClientTokensEndpointArgs;
  by: string;
  byType: string;
  storage?: IObjStorage;
}) {
  const { args, by, byType, storage } = params;
  const { update, updateMany } = args;

  // Extract permissions from update to handle separately
  const { permissions, ...otherUpdates } = update;

  // Get the tokens to update BEFORE updating the object (so we have the right IDs)
  let tokensToUpdate: any[] = [];
  if (permissions !== undefined) {
    const result = await getClientTokens({
      args: {
        query: args.query,
        includePermissions: true,
      },
      storage,
    });
    tokensToUpdate = result.clientTokens;
  }

  const objQuery = getClientTokensObjQuery({ args });

  // Use merge strategy for partial updates, but handle meta field specially
  // The meta field will be completely replaced when present in the update
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

  // Handle permissions separately if provided
  if (permissions !== undefined) {
    for (const clientToken of tokensToUpdate) {
      if (permissions.length === 0) {
        // Clear all existing permissions for this client token
        await deletePermissions({
          query: {
            projectId: clientToken.projectId,
            meta: [
              {
                op: "eq",
                field: "__fimidx_managed_clientTokenId",
                value: clientToken.id,
              },
            ],
          },
          deleteMany: true,
          by,
          byType,
          storage,
        });
      } else {
        // Clear existing permissions first, then add new ones
        await deletePermissions({
          query: {
            projectId: clientToken.projectId,
            meta: [
              {
                op: "eq",
                field: "__fimidx_managed_clientTokenId",
                value: clientToken.id,
              },
            ],
          },
          deleteMany: true,
          by,
          byType,
          storage,
        });

        // Add new permissions (entity is set by addClientTokenPermissions)
        await addClientTokenPermissions({
          by,
          byType,
          groupId: clientToken.groupId,
          projectId: clientToken.projectId,
          permissions,
          clientTokenId: clientToken.id,
          storage,
        });
      }
    }
  }
}
