import assert from "assert";
import { first } from "lodash-es";
import type {
  GetClientTokensEndpointArgs,
  IClientToken,
  IClientTokenObjRecordMeta,
} from "../../definitions/clientToken.js";
import {
  kObjTags,
  type IObjPartQueryItem,
  type IObjQuery,
} from "../../definitions/obj.js";
import type { IPermissionAtom } from "../../definitions/permission.js";
import type { IObjStorage } from "../../storage/types.js";
import { kOwnServerErrorCodes, OwnServerError } from "../../common/error.js";
import { getManyObjs } from "../obj/getObjs.js";
import { getPermissions } from "../permission/getPermissions.js";
import { getOriginalClientTokenPermission } from "./addClientTokenPermissions.js";
import { objToClientToken } from "./objToClientToken.js";

export function getClientTokensObjQuery(params: {
  args: GetClientTokensEndpointArgs;
}) {
  const { args } = params;
  const { query } = args;
  const {
    name,
    meta,
    projectId,
    groupId,
    id,
    createdAt,
    updatedAt,
    createdBy,
    updatedBy,
    permissionEntity,
    permissionAction,
    permissionTarget,
  } = query;

  const filterArr: Array<IObjPartQueryItem> = [];

  // Handle name filtering - name is stored in objRecord.name
  if (name) {
    // Convert name query to partQuery for the name field
    Object.entries(name).forEach(([op, value]) => {
      if (value !== undefined) {
        filterArr.push({
          op: op as any,
          field: "name",
          value,
        });
      }
    });
  }

  // Handle meta field filtering
  const metaPartQuery = meta?.map(
    (part) =>
      ({
        op: part.op,
        field: `meta.${part.field}`,
        value: part.value,
      } as IObjPartQueryItem)
  );

  if (metaPartQuery) {
    filterArr.push(...metaPartQuery);
  }

  const objQuery: IObjQuery = {
    projectId,
    partQuery: filterArr.length > 0 ? { and: filterArr } : undefined,
    metaQuery: { id, createdAt, updatedAt, createdBy, updatedBy },
    topLevelFields: { groupId: { eq: groupId } },
  };

  return objQuery;
}

export async function getClientTokensWithPermissionFilter(params: {
  args: GetClientTokensEndpointArgs;
  storage?: IObjStorage;
}) {
  const { args, storage } = params;
  const { query } = args;
  const { permissionEntity, permissionAction, permissionTarget, projectId } =
    query;

  // If no permission filters are specified, return all client tokens
  if (!permissionEntity && !permissionAction && !permissionTarget) {
    return null;
  }

  // First, get all client tokens to get their IDs for permission filtering
  const objQuery = getClientTokensObjQuery({ args });
  const { objs } = await getManyObjs({
    objQuery,
    tag: kObjTags.clientToken,
    limit: 1000,
    page: 0,
    storage,
  });

  const clientTokenIds = objs.map((obj) => obj.id);

  // For each permission filter, we need to check if any of the client tokens have matching permissions
  const matchingClientTokenIds = new Set<string>();

  for (const clientTokenId of clientTokenIds) {
    let matches = true;

    if (permissionEntity) {
      // Extract values from the entity query
      let entityValues: string[] = [];
      if (Array.isArray(permissionEntity)) {
        entityValues = permissionEntity.map((item) => item.value as string);
      } else {
        if (permissionEntity.eq) entityValues.push(permissionEntity.eq);
        if (permissionEntity.in) entityValues.push(...permissionEntity.in);
      }

      // Create managed entity values for this client token
      const managedEntityValues = entityValues.map(
        (value) =>
          `__fimidx_managed_permission_entity_${value}:${clientTokenId}`
      );

      const entityQuery = Array.isArray(permissionEntity)
        ? permissionEntity.map((item) => ({
            ...item,
            value: `__fimidx_managed_permission_entity_${item.value}:${clientTokenId}`,
          }))
        : ({ in: managedEntityValues } as any);

      const { permissions } = await getPermissions({
        args: {
          query: {
            projectId,
            entity: entityQuery,
            meta: [
              {
                op: "eq",
                field: "__fimidx_managed_clientTokenId",
                value: clientTokenId,
              },
            ],
          },
          limit: 1,
        },
        storage,
      });

      if (permissions.length === 0) {
        matches = false;
      }
    }

    if (permissionAction && matches) {
      // Extract values from the action query
      let actionValues: string[] = [];
      if (Array.isArray(permissionAction)) {
        actionValues = permissionAction.map((item) => item.value as string);
      } else {
        if (permissionAction.eq) actionValues.push(permissionAction.eq);
        if (permissionAction.in) actionValues.push(...permissionAction.in);
      }

      // Create managed action values for this client token
      const managedActionValues = actionValues.map(
        (value) =>
          `__fimidx_managed_permission_action_${value}:${clientTokenId}`
      );

      const actionQuery = Array.isArray(permissionAction)
        ? permissionAction.map((item) => ({
            ...item,
            value: `__fimidx_managed_permission_action_${item.value}:${clientTokenId}`,
          }))
        : ({ in: managedActionValues } as any);

      const { permissions } = await getPermissions({
        args: {
          query: {
            projectId,
            action: actionQuery,
            meta: [
              {
                op: "eq",
                field: "__fimidx_managed_clientTokenId",
                value: clientTokenId,
              },
            ],
          },
          limit: 1,
        },
        storage,
      });

      if (permissions.length === 0) {
        matches = false;
      }
    }

    if (permissionTarget && matches) {
      // Extract values from the target query
      let targetValues: string[] = [];
      if (Array.isArray(permissionTarget)) {
        targetValues = permissionTarget.map((item) => item.value as string);
      } else {
        if (permissionTarget.eq) targetValues.push(permissionTarget.eq);
        if (permissionTarget.in) targetValues.push(...permissionTarget.in);
      }

      // Create managed target values for this client token
      const managedTargetValues = targetValues.map(
        (value) =>
          `__fimidx_managed_permission_target_${value}:${clientTokenId}`
      );

      const targetQuery = Array.isArray(permissionTarget)
        ? permissionTarget.map((item) => ({
            ...item,
            value: `__fimidx_managed_permission_target_${item.value}:${clientTokenId}`,
          }))
        : ({ in: managedTargetValues } as any);

      const { permissions } = await getPermissions({
        args: {
          query: {
            projectId,
            target: targetQuery,
            meta: [
              {
                op: "eq",
                field: "__fimidx_managed_clientTokenId",
                value: clientTokenId,
              },
            ],
          },
          limit: 1,
        },
        storage,
      });

      if (permissions.length === 0) {
        matches = false;
      }
    }

    if (matches) {
      matchingClientTokenIds.add(clientTokenId);
    }
  }

  return Array.from(matchingClientTokenIds);
}

export async function getClientTokensPermissions(params: {
  projectId: string;
  clientTokenIds: string[];
  groupId: string;
  storage?: IObjStorage;
}) {
  const { projectId, clientTokenIds, groupId, storage } = params;
  const { permissions } = await getPermissions({
    args: {
      query: {
        projectId,
        meta: [
          {
            op: "in",
            field: "__fimidx_managed_clientTokenId",
            value: clientTokenIds,
          },
          {
            op: "eq",
            field: "__fimidx_managed_groupId",
            value: groupId,
          },
        ],
      },
    },
    storage,
  });

  return {
    permissions,
  };
}

export async function getClientTokens(params: {
  args: GetClientTokensEndpointArgs;
  storage?: IObjStorage;
}) {
  const { args, storage } = params;
  const {
    page: inputPage,
    limit: inputLimit,
    sort,
    includePermissions = false,
  } = args;

  // Convert 1-based pagination to 0-based for storage layer
  const pageNumber = inputPage ?? 1;
  const limitNumber = inputLimit ?? 100;
  const storagePage = pageNumber - 1; // Convert to 0-based

  // Transform sort fields to use objRecord prefix for name field
  const transformedSort = sort?.map((sortItem) => {
    if (sortItem.field === "name") {
      return { ...sortItem, field: "objRecord.name" };
    }
    return sortItem;
  });

  const objQuery = getClientTokensObjQuery({ args });

  // Get permission-filtered client token IDs if permission filters are specified
  const filteredClientTokenIds = await getClientTokensWithPermissionFilter({
    args,
    storage,
  });

  // If we have permission filters, we need to get all client tokens and filter them
  // since we can't easily paginate with permission filters
  if (filteredClientTokenIds) {
    const { objs } = await getManyObjs({
      objQuery,
      tag: kObjTags.clientToken,
      limit: 1000, // Get a large number to ensure we get all matching tokens
      page: 0,
      sort: transformedSort,
      storage,
    });

    // Filter by permission criteria
    const filteredObjs = objs.filter((obj) =>
      filteredClientTokenIds.includes(obj.id)
    );

    // Apply pagination manually
    const startIndex = storagePage * limitNumber;
    const endIndex = startIndex + limitNumber;
    const paginatedObjs = filteredObjs.slice(startIndex, endIndex);
    const hasMore = endIndex < filteredObjs.length;

    // Always include permissions when filtering by permissions
    const { permissions } = await getClientTokensPermissions({
      projectId: args.query.projectId,
      clientTokenIds: paginatedObjs.map((obj) => obj.id),
      groupId: args.query.groupId,
      storage,
    });

    const permissionsMap = permissions.reduce((acc, permission) => {
      assert.ok(permission.meta, "Permission meta is required");
      const meta = permission.meta as IClientTokenObjRecordMeta;
      const clientTokenId = meta.__fimidx_managed_clientTokenId;
      if (!acc[clientTokenId]) {
        acc[clientTokenId] = [];
      }
      // Transform the permission back to original format
      const originalPermission = getOriginalClientTokenPermission({
        permission,
        clientTokenId,
      });
      acc[clientTokenId].push(originalPermission);
      return acc;
    }, {} as Record<string, IPermissionAtom[]>);

    const clientTokens = paginatedObjs.map((obj) => {
      const clientTokenPermissions = permissionsMap[obj.id] || null;
      const clientToken = objToClientToken(obj, clientTokenPermissions);
      return clientToken;
    });

    return {
      clientTokens,
      hasMore,
      page: pageNumber, // Return 1-based page number
      limit: limitNumber,
    };
  }

  // No permission filters, use normal flow
  const { objs, hasMore, page, limit } = await getManyObjs({
    objQuery,
    tag: kObjTags.clientToken,
    limit: limitNumber,
    page: storagePage,
    sort: transformedSort,
    storage,
  });

  const { permissions } = includePermissions
    ? await getClientTokensPermissions({
        projectId: args.query.projectId,
        clientTokenIds: objs.map((obj) => obj.id),
        groupId: args.query.groupId,
        storage,
      })
    : {
        permissions: [],
      };

  const permissionsMap = permissions.reduce((acc, permission) => {
    assert.ok(permission.meta, "Permission meta is required");
    const meta = permission.meta as IClientTokenObjRecordMeta;
    const clientTokenId = meta.__fimidx_managed_clientTokenId;
    if (!acc[clientTokenId]) {
      acc[clientTokenId] = [];
    }
    // Transform the permission back to original format
    const originalPermission = getOriginalClientTokenPermission({
      permission,
      clientTokenId,
    });
    acc[clientTokenId].push(originalPermission);
    return acc;
  }, {} as Record<string, IPermissionAtom[]>);

  const clientTokens = objs.map((obj) => {
    const clientTokenPermissions = permissionsMap[obj.id] || null;
    const clientToken = objToClientToken(obj, clientTokenPermissions);
    return clientToken;
  });

  return {
    clientTokens,
    hasMore,
    page: pageNumber, // Return 1-based page number
    limit: limitNumber,
  };
}

/** Fetch a single client token by id (no projectId/groupId required). */
export async function getClientTokenById(params: {
  id: string;
  storage?: IObjStorage;
}): Promise<IClientToken> {
  const { id, storage } = params;
  const objQuery: IObjQuery = {
    metaQuery: {
      id: { eq: id },
    },
  };
  const { objs } = await getManyObjs({
    objQuery,
    tag: kObjTags.clientToken,
    limit: 1,
    storage,
  });
  const obj = first(objs);
  assert.ok(
    obj,
    new OwnServerError(
      "Client token not found",
      kOwnServerErrorCodes.NotFound
    )
  );
  return objToClientToken(obj, null);
}
