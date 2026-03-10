import type { GetMembersEndpointArgs } from "../../definitions/member.js";
import {
  kObjTags,
  type IObjRecordQueryItem,
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
    createdAt,
    updatedAt,
    createdBy,
    updatedBy,
    meta,
    projectId,
    id,
    groupId,
  } = query;

  const filterArr: Array<IObjRecordQueryItem> = [];

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

export async function getMembersPermissions(params: {
  projectId: string;
  memberIds: string[];
  groupId: string;
  storage?: IObjStorage;
}) {
  const { projectId, memberIds, groupId, storage } = params;

  // If memberIds is empty, return empty permissions to avoid SQL syntax error
  if (memberIds.length === 0) {
    return {
      permissions: [],
    };
  }

  // Query permissions by entity (member id) and groupId present on the
  // permission obj
  const { permissions } = await getPermissions({
    args: {
      query: {
        projectId,
        entity: { in: memberIds },
        ...(groupId && typeof groupId === "string" && groupId.trim() !== ""
          ? { groupId: { eq: groupId } }
          : {}),
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

  const transformedSort = sort;

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
        projectId: args.query.projectId,
        memberIds: objs.map((o) => o.id),
        groupId: args.query.groupId,
        storage,
      })
    : {
        permissions: [],
      };

  const permissionsMap = permissions.reduce((acc, permission) => {
    // Entity is the member id (string) for member permissions
    const memberId =
      typeof permission.entity === "string" ? permission.entity : undefined;
    if (memberId == null) return acc;
    if (!acc[memberId]) {
      acc[memberId] = [];
    }
    const originalPermission = getOriginalMemberPermission({
      permission,
      memberId,
    });
    acc[memberId].push(originalPermission);
    return acc;
  }, {} as Record<string, IPermissionAtom[]>);

  const members = objs.map((obj) => {
    const memberPermissions = permissionsMap[obj.id] ?? null;
    return objToMember(obj, memberPermissions);
  });

  return {
    members,
    hasMore,
    page: pageNumber, // Return 1-based page number
    limit: limitNumber,
  };
}
