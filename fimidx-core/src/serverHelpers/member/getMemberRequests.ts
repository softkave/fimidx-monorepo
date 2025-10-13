import assert from "assert";
import { isArray, uniq } from "lodash-es";
import { indexArray } from "softkave-js-utils";
import { kOwnServerErrorCodes, OwnServerError } from "../../common/error.js";
import type {
  GetMemberRequestsEndpointArgs,
  IMemberObjRecordMeta,
} from "../../definitions/member.js";
import {
  kObjTags,
  type IObjPartQueryItem,
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
  const { appId, groupId, memberId, status } = query;

  const filterArr: Array<IObjPartQueryItem> = [];

  // Handle memberId filtering
  if (memberId) {
    filterArr.push({
      op: "eq",
      field: "memberId",
      value: memberId,
    });
  }

  if (status) {
    filterArr.push({
      op: "eq",
      field: "status",
      value: status,
    });
  }

  const objQuery: IObjQuery = {
    appId,
    partQuery: filterArr.length > 0 ? { and: filterArr } : undefined,
    topLevelFields: groupId ? { groupId: { eq: groupId } } : undefined,
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

  const memberIds = uniq(objs.map((obj) => obj.objRecord.memberId));

  // Return early if no memberIds found (schema requires at least one member)
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
      args.query.appId,
      new OwnServerError(
        "App ID is required",
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
        appId: args.query.appId,
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
        const meta = permission.meta as IMemberObjRecordMeta;
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
    const memberId = obj.objRecord.memberId;
    const memberPermissions = memberPermissionsMap[memberId] ?? null;
    return objToMember(obj, memberPermissions);
  });
  const requests = await objToMemberRequest({ requests: members });

  return {
    requests,
    hasMore,
    page: pageNumber, // Return 1-based page number
    limit: limitNumber,
  };
}
