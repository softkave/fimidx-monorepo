import {
  type IMember,
  type IMemberRequest,
  type MemberStatus,
} from "../../definitions/member.js";
import { getGroups } from "../group/getGroups.js";

export async function objToMemberRequest(params: { requests: IMember[] }) {
  const { requests } = params;

  if (requests.length === 0) {
    return [];
  }

  // Get all groups for the project (since we need to filter by groupId)
  const { groups } = await getGroups({
    args: {
      query: {
        projectId: requests[0]?.projectId || "",
        id: { in: requests.map((request) => request.groupId) },
      },
    },
  });

  // Create a map of groupId to group
  const groupMap = new Map();
  groups.forEach((group) => {
    groupMap.set(group.id, group);
  });

  const requestsWithGroup = requests
    .map((request): IMemberRequest => {
      const group = groupMap.get(request.groupId);
      return {
        requestId: request.id,
        groupName: group?.name ?? "",
        status: request.status as MemberStatus,
        updatedAt: request.updatedAt,
        groupId: request.groupId,
      };
    })
    .filter((request) => request.groupName !== "");

  return requestsWithGroup;
}
