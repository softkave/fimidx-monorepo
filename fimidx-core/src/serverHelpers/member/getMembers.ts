import assert from "assert";
import type {
  GetMembersEndpointArgs,
  IMemberObjRecordMeta,
} from "../../definitions/member.js";
import {
  kObjTags,
  type IObjPartQueryItem,
  type IObjQuery,
} from "../../definitions/obj.js";
import type { IPermissionAtom } from "../../definitions/permission.js";
import type { IObjStorage } from "../../storage/types.js";
import { getManyObjs } from "../obj/getObjs.js";
import { getPermissions } from "../permission/getPermissions.js";
import { getOriginalMemberPermission } from "./addMemberPermissions.js";
import { objToMember } from "./objToMember.js";

export function getMembersObjQuery(params: { args: GetMembersEndpointArgs }) {
  const { args } = params;
  const { query } = args;
  const {
    name,
    createdAt,
    updatedAt,
    createdBy,
    updatedBy,
    meta,
    appId,
    id,
    groupId,
    email,
    memberId,
    status,
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

  // Handle email filtering
  if (email) {
    Object.entries(email).forEach(([op, value]) => {
      if (value !== undefined) {
        filterArr.push({
          op: op as any,
          field: "email",
          value,
        });
      }
    });
  }

  // Handle memberId filtering
  if (memberId) {
    Object.entries(memberId).forEach(([op, value]) => {
      if (value !== undefined) {
        filterArr.push({
          op: op as any,
          field: "memberId",
          value,
        });
      }
    });
  }

  // Handle status filtering
  if (status) {
    Object.entries(status).forEach(([op, value]) => {
      if (value !== undefined) {
        filterArr.push({
          op: op as any,
          field: "status",
          value,
        });
      }
    });
  }

  const objQuery: IObjQuery = {
    appId,
    partQuery: filterArr.length > 0 ? { and: filterArr } : undefined,
    metaQuery: { id, createdAt, updatedAt, createdBy, updatedBy },
    topLevelFields: groupId ? { groupId: { eq: groupId } } : undefined,
  };

  return objQuery;
}

export async function getMembersPermissions(params: {
  appId: string;
  memberIds: string[];
  groupId: string;
  storage?: IObjStorage;
}) {
  const { appId, memberIds, groupId, storage } = params;

  // If memberIds is empty, return empty permissions to avoid SQL syntax error
  if (memberIds.length === 0) {
    return {
      permissions: [],
    };
  }

  // Build meta query conditions
  const metaConditions: IObjPartQueryItem[] = [
    {
      op: "in",
      field: "__fimidx_managed_memberId",
      value: memberIds,
    },
  ];

  // Only add groupId condition if it's a valid non-empty string
  if (groupId && typeof groupId === "string" && groupId.trim() !== "") {
    metaConditions.push({
      op: "eq",
      field: "__fimidx_managed_groupId",
      value: groupId,
    });
  }

  const { permissions } = await getPermissions({
    args: {
      query: {
        appId,
        meta: metaConditions,
      },
    },
    storage,
  });

  return {
    permissions,
  };
}

export async function getMembers(params: {
  args: GetMembersEndpointArgs;
  storage?: IObjStorage;
}) {
  const { args, storage } = params;
  const { page: inputPage, limit: inputLimit, sort, includePermissions } = args;

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

  const objQuery = getMembersObjQuery({ args });
  const { objs, hasMore, page, limit } = await getManyObjs({
    objQuery,
    tag: kObjTags.member,
    limit: limitNumber,
    page: storagePage,
    sort: transformedSort,
    storage,
  });

  const { permissions } = includePermissions
    ? await getMembersPermissions({
        appId: args.query.appId,
        memberIds: objs.map((obj) => obj.objRecord.memberId),
        groupId: args.query.groupId,
        storage,
      })
    : {
        permissions: [],
      };

  const permissionsMap = permissions.reduce((acc, permission) => {
    assert.ok(permission.meta, "Permission meta is required");
    const meta = permission.meta as IMemberObjRecordMeta;
    const memberId = meta.__fimidx_managed_memberId;
    if (!acc[memberId]) {
      acc[memberId] = [];
    }
    // Transform the permission back to original format
    const originalPermission = getOriginalMemberPermission({
      permission,
      memberId,
    });
    acc[memberId].push(originalPermission);
    return acc;
  }, {} as Record<string, IPermissionAtom[]>);

  const members = objs.map((obj) => {
    const memberPermissions = permissionsMap[obj.objRecord.memberId] || null;
    const member = objToMember(obj, memberPermissions);
    return member;
  });

  return {
    members,
    hasMore,
    page: pageNumber, // Return 1-based page number
    limit: limitNumber,
  };
}
