import { GetOrgsEndpointResponse, getOrgsSchema } from "@/src/definitions/org";
import { kMemberStatus } from "fimidx-core/definitions/member";
import { kId0 } from "fimidx-core/definitions/system";
import { getGroups, getMembers } from "fimidx-core/serverHelpers/index";
import { NextUserAuthenticatedEndpointFn } from "../../types";
import { groupToOrg } from "./groupToOrg";

export const getOrgsEndpoint: NextUserAuthenticatedEndpointFn<
  GetOrgsEndpointResponse
> = async (params) => {
  const {
    req,
    session: { userId },
  } = params;

  const input = getOrgsSchema.parse(await req.nextUrl.searchParams);
  const requests = await getMembers({
    args: {
      query: {
        projectId: kId0,
        groupId: kId0,
        memberId: {
          eq: userId,
        },
        status: {
          eq: kMemberStatus.accepted,
        },
      },
      page: input.page,
      limit: input.limit,
    },
  });

  const groupIds = requests.members.map((member) => member.groupId);
  const { groups } =
    groupIds.length > 0
      ? await getGroups({
          args: {
            query: { id: { in: groupIds }, projectId: kId0 },
          },
        })
      : { groups: [] };

  const response: GetOrgsEndpointResponse = {
    orgs: groups.map(groupToOrg),
    page: requests.page,
    limit: requests.limit,
    hasMore: requests.hasMore,
  };

  return response;
};
