import { AddOrgEndpointResponse, addOrgSchema } from "@/src/definitions/org";
import { kByTypes, kId0, kMemberStatus } from "fimidx-core/definitions/index";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import { addGroup, addMember } from "fimidx-core/serverHelpers/index";
import { NextUserAuthenticatedEndpointFn } from "../../types";
import { groupToOrg } from "./groupToOrg";

export const addOrgEndpoint: NextUserAuthenticatedEndpointFn<
  AddOrgEndpointResponse
> = async (params) => {
  const {
    req,
    session: { userId, email, user },
  } = params;

  const input = addOrgSchema.parse(await req.json());
  const group = await addGroup({
    args: {
      projectId: kId0,
      name: input.name,
      description: input.description,
    },
    by: userId,
    byType: kByTypes.user,
    groupId: kId0,
  });

  await addMember({
    args: {
      projectId: kId0,
      groupId: group.group.id,
      meta: {
        userId,
        status: kMemberStatus.accepted,
        statusUpdatedAt: new Date().toISOString(),
        email: user?.email ?? email ?? "",
        name: user?.name ?? email ?? "",
      },
      permissions: [
        {
          action: kFimidxPermissions.wildcard,
          target: group.group.id,
        },
      ],
    },
    by: userId,
    byType: kByTypes.user,
  });

  const response: AddOrgEndpointResponse = {
    org: groupToOrg(group.group),
  };

  return response;
};
