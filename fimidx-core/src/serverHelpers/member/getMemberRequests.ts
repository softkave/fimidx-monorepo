import assert from "assert";
import { isArray, uniq } from "lodash-es";
import { indexArray } from "softkave-js-utils";
import { kOwnServerErrorCodes, OwnServerError } from "../../common/error.js";
import type { GetMemberRequestsEndpointArgs } from "../../definitions/member.js";
import {
  kObjTags,
  type IObjRecordQueryItem,
  type IObjQuery,
} from "../../definitions/obj.js";
import type { IPermission } from "../../definitions/permission.js";
import type { IObjStorage } from "../../storage/types.js";
import { getManyObjs } from "../obj/getObjs.js";
import { getMembersPermissions } from "./getMembers.js";
import { objToMember } from "./objToMember.js";
import { objToMemberRequest } from "./objToMemberRequest.js";

export function getMemberRequestsObjQuery(params: {
  args: GetMemberRequestsEndpointArgs;
}) {
  const { args } = params;
  const { query } = args;
  const { projectId, groupId, id, status } = query;

  const filterArr: Array<IObjRecordQueryItem> = [];

  if (!groupId && !id) {
    throw new OwnServerError(
      "Either groupId or id is required",
      kOwnServerErrorCodes.InvalidRequest
    );
  }

  if (status) {
    filterArr.push({
      op: "eq",
      field: "status",
      value: status,
    });
  }

  const objQuery: IObjQuery = {
    recordQuery: filterArr.length > 0 ? filterArr : undefined,
    metaQuery: {
      ...(projectId ? { projectId: { eq: projectId } } : {}),
      ...(id ? { id: { eq: id } } : {}),
      ...(groupId ? { groupId: { eq: groupId } } : {}),
    },
  };

  return objQuery;
}

export async function getMemberRequests(params: {
  args: GetMemberRequestsEndpointArgs;
  storage?: IObjStorage;
}) {
  const { args, storage } = params;
  const { page: inputPage, limit: inputLimit } = args;

  // Convert 1-based pagination to 0-based for storage layer
  const pageNumber = inputPage ?? 1;
  const limitNumber = inputLimit ?? 100;
  const storagePage = pageNumber - 1; // Convert to 0-based

  const objQuery = getMemberRequestsObjQuery({ args });
  const { objs, hasMore, page, limit } = await getManyObjs({
    objQuery,
    tag: kObjTags.member,
    limit: limitNumber,
    page: storagePage,
    sort: undefined,
    storage,
  });

  const memberIds = uniq(objs.map((obj) => obj.id));

  if (!memberIds.length) {
    return {
      requests: [],
      hasMore: false,
      page: pageNumber,
      limit: limitNumber,
    };
  }

  if (args.includePermissions) {
    assert.ok(
      args.query.projectId,
      new OwnServerError(
        "Project ID is required",
        kOwnServerErrorCodes.InvalidRequest
      )
    );
    assert.ok(
      args.query.groupId,
      new OwnServerError(
        "Group ID is required",
        kOwnServerErrorCodes.InvalidRequest
      )
    );
  }

  const { permissions: memberPermissions } = args.includePermissions
    ? await getMembersPermissions({
        projectId: args.query.projectId,
        memberIds,
        groupId: args.query.groupId!,
        storage,
      })
    : {
        permissions: [],
      };

  const memberPermissionsMap = indexArray<IPermission, IPermission[]>(
    memberPermissions,
    {
      indexer: (permission) => {
        assert.ok(permission.meta, "Permission meta is required");
        const meta = permission.meta as Record<string, string>;
        return meta.__fimidx_managed_memberId;
      },
      reducer: (permission, _index, _arr, acc) => {
        const arr: IPermission[] = isArray(acc) ? acc : [];
        arr.push(permission);
        return arr;
      },
    }
  );

  const members = objs.map((obj) => {
    const perms = memberPermissionsMap[obj.id] ?? null;
    return objToMember(obj, perms);
  });
  const requests = await objToMemberRequest({ objs });

  return {
    requests,
    hasMore,
    page: pageNumber, // Return 1-based page number
    limit: limitNumber,
  };
}
