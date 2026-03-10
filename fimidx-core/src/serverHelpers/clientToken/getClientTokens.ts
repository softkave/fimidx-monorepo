import assert from "assert";
import { first } from "lodash-es";
import type {
  GetClientTokensEndpointArgs,
  IClientToken,
} from "../../definitions/clientToken.js";
import {
  kObjTags,
  type IObjRecordQueryItem,
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
  } = query;

  const filterArr: Array<IObjRecordQueryItem> = [];

  // Handle name filtering - name is stored in objRecord.name
  if (name) {
    // Convert name query to recordQuery for the name field
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
      } as IObjRecordQueryItem)
  );

  if (metaPartQuery) {
    filterArr.push(...metaPartQuery);
  }

  const objQuery: IObjQuery = {
    recordQuery: filterArr.length > 0 ? { and: filterArr } : undefined,
    metaQuery: {
      ...(projectId ? { projectId: { eq: projectId } } : {}),
      id,
      createdAt,
      updatedAt,
      createdBy,
      updatedBy,
      ...(groupId ? { groupId: { eq: groupId } } : {}),
    },
  };

  return objQuery;
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
        entity: { in: clientTokenIds },
        groupId: groupId ? { eq: groupId } : undefined,
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
    const clientTokenId =
      typeof permission.entity === "string" ? permission.entity : undefined;
    if (clientTokenId == null) return acc;
    if (!acc[clientTokenId]) {
      acc[clientTokenId] = [];
    }
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

/** Fetch a single client token by id; projectId (and optionally groupId) required for scoped lookup. */
export async function getClientTokenById(params: {
  id: string;
  projectId: string;
  groupId?: string;
  storage?: IObjStorage;
}): Promise<IClientToken> {
  const { id, projectId, groupId, storage } = params;
  const objQuery: IObjQuery = {
    metaQuery: {
      id: { eq: id },
      projectId: { eq: projectId },
      ...(groupId ? { groupId: { eq: groupId } } : {}),
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
