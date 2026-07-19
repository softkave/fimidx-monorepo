import { chunk } from "lodash-es";
import type {
  IClientTokenPermissionInput,
  UpdateClientTokensEndpointArgs,
} from "../../definitions/clientToken.js";
import type { GetPermissionsEndpointArgs } from "../../definitions/permission.js";
import { kObjTags } from "../../definitions/obj.js";
import type { IObjStorage } from "../../storage/types.js";
import { splitMetaUpdate, updateManyObjs } from "../obj/updateObjs.js";
import {
  addClientTokenPermissions,
  getFimidxManagedClientTokenPermission,
} from "./addClientTokenPermissions.js";
import { getClientTokens, getClientTokensObjQuery } from "./getClientTokens.js";
import { deletePermissions } from "../permission/deletePermissions.js";

const kPermissionPageSize = 100;
const kAddPermsChunkSize = 50;

/** Lean fields needed to apply permission add/remove for a token. */
const kPermissionUpdateProjection = ["id", "projectId", "groupId"] as const;

type ClientTokenPermissionTarget = {
  id: string;
  projectId: string;
  groupId: string;
};

type PermissionUpdateArgs = {
  removeAllPerms?: boolean;
  removePerms?: IClientTokenPermissionInput[];
  addPerms?: IClientTokenPermissionInput[];
};

async function applyPermissionUpdatesForTokens(
  params: {
    tokens: ClientTokenPermissionTarget[];
    by: string;
    byType: string;
    storage?: IObjStorage;
  } & PermissionUpdateArgs
) {
  const {
    tokens,
    removeAllPerms,
    removePerms,
    addPerms,
    by,
    byType,
    storage,
  } = params;

  const deleteQueries: GetPermissionsEndpointArgs["query"][] = [];
  for (const clientToken of tokens) {
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
    const chunks = chunk(tokens, kAddPermsChunkSize);
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

/**
 * Page through matching tokens with a lean projection and apply permission
 * updates per page so we never hold the full match set in memory.
 */
async function applyPermissionUpdatesPaged(
  params: {
    query: UpdateClientTokensEndpointArgs["query"];
    updateMany: boolean;
    by: string;
    byType: string;
    storage?: IObjStorage;
  } & PermissionUpdateArgs
) {
  const {
    query,
    updateMany,
    removeAllPerms,
    removePerms,
    addPerms,
    by,
    byType,
    storage,
  } = params;

  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const result = await getClientTokens({
      args: {
        query,
        page,
        limit: updateMany ? kPermissionPageSize : 1,
      },
      storage,
      projection: kPermissionUpdateProjection,
    });

    const tokens: ClientTokenPermissionTarget[] = [];
    for (const token of result.clientTokens) {
      if (token.projectId == null || token.groupId == null) {
        continue;
      }
      tokens.push({
        id: token.id,
        projectId: token.projectId,
        groupId: token.groupId,
      });
    }

    if (tokens.length > 0) {
      await applyPermissionUpdatesForTokens({
        tokens,
        removeAllPerms,
        removePerms,
        addPerms,
        by,
        byType,
        storage,
      });
    }

    if (!updateMany) {
      break;
    }

    hasMore = result.hasMore;
    page++;
  }
}

export async function updateClientTokens(params: {
  args: UpdateClientTokensEndpointArgs;
  by: string;
  byType: string;
  storage?: IObjStorage;
}) {
  const { args, by, byType, storage } = params;
  const { update, updateMany = false, metaUpdateWay } = args;

  const hasPermissionUpdates =
    update.removeAllPermissions ||
    (update.removePermissions?.length ?? 0) > 0 ||
    (update.addPermissions?.length ?? 0) > 0;

  const {
    addPermissions: addPerms,
    removePermissions: removePerms,
    removeAllPermissions: removeAllPerms,
    ...otherUpdates
  } = update;

  const objQuery = getClientTokensObjQuery({ args });

  // Split meta update for granular handling
  const hasUpdates = Object.keys(otherUpdates).length > 0;
  if (hasUpdates) {
    const updates = splitMetaUpdate(otherUpdates, metaUpdateWay);
    await updateManyObjs({
      objQuery,
      tag: kObjTags.clientToken,
      by,
      byType,
      updates,
      count: updateMany ? undefined : 1,
      updateWay: "shallowMerge",
      storage,
    });
  }

  if (hasPermissionUpdates) {
    await applyPermissionUpdatesPaged({
      query: args.query,
      updateMany,
      removeAllPerms,
      removePerms,
      addPerms,
      by,
      byType,
      storage,
    });
  }
}
