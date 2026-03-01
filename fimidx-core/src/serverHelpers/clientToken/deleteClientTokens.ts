import { type DeleteClientTokensEndpointArgs } from "../../definitions/index.js";
import { kObjTags } from "../../definitions/obj.js";
import type { IObjStorage } from "../../storage/types.js";
import { deleteManyObjs } from "../obj/deleteObjs.js";
import {
  getClientTokensObjQuery,
  getClientTokensWithPermissionFilter,
} from "./getClientTokens.js";

export async function deleteClientTokens(
  params: DeleteClientTokensEndpointArgs & {
    by: string;
    byType: string;
    storage?: IObjStorage;
  }
) {
  const { deleteMany, by, byType, storage, ...args } = params;

  // Check if we have permission filters
  const { query } = args;
  const { permissionEntity, permissionAction, permissionTarget } = query;

  if (permissionEntity || permissionAction || permissionTarget) {
    // Handle permission-based deletion
    const filteredClientTokenIds = await getClientTokensWithPermissionFilter({
      args,
      storage,
    });

    if (filteredClientTokenIds && filteredClientTokenIds.length > 0) {
      // Delete specific tokens by their IDs
      await deleteManyObjs({
        objQuery: {
          projectId: query.projectId,
          metaQuery: {
            id: { in: filteredClientTokenIds },
          },
        },
        tag: kObjTags.clientToken,
        deletedBy: by,
        deletedByType: byType,
        deleteMany: true, // Always true when filtering by permissions
        storage,
      });
    }
  } else {
    // Use normal object query for non-permission filters
    const objQuery = getClientTokensObjQuery({ args });
    await deleteManyObjs({
      objQuery,
      tag: kObjTags.clientToken,
      deletedBy: by,
      deletedByType: byType,
      deleteMany,
      storage,
    });
  }
}
