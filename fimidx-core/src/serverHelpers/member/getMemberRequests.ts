import type { GetMemberRequestsEndpointArgs } from "../../definitions/member.js";
import {
  kObjTags,
  type IObjQuery,
  type IObjRecordQueryItem,
} from "../../definitions/obj.js";
import type { IObjStorage } from "../../storage/types.js";
import { getManyObjs } from "../obj/getObjs.js";
import { objToMemberRequest } from "./objToMemberRequest.js";

export function getMemberRequestsObjQuery(params: {
  args: GetMemberRequestsEndpointArgs;
}) {
  const { args } = params;
  const { query } = args;
  const { projectId, groupId, id, status } = query;

  const filterArr: Array<IObjRecordQueryItem> = [];

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

  const requests = await objToMemberRequest({ objs });

  return {
    requests,
    hasMore,
    page: pageNumber, // Return 1-based page number
    limit: limitNumber,
  };
}
