import {
  IGetMembersEndpointResponse,
  getMembersSchema,
} from "fimidx-core/definitions/member";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import { getMembers } from "fimidx-core/serverHelpers/index";
import { checkPermissionForClientTokenOrUser } from "../../../serverHelpers/permissions";
import { NextClientTokenAuthenticatedEndpointFn } from "../../types";
import { sanitizeGetMembersInput } from "../../utils/sanitizeKId0";

export const getMembersEndpoint: NextClientTokenAuthenticatedEndpointFn<
  IGetMembersEndpointResponse
> = async (params) => {
  const {
    req,
    session: { clientToken },
  } = params;

  const input = getMembersSchema.parse(await req.json());
  sanitizeGetMembersInput(input);

  await checkPermissionForClientTokenOrUser({
    clientToken,
    groupId: input.query.groupId,
    projectId: input.query.projectId,
    action: kFimidxPermissions.member.read,
  });

  if (input.includePermissions) {
    await checkPermissionForClientTokenOrUser({
      clientToken,
      groupId: input.query.groupId,
      projectId: input.query.projectId,
      action: kFimidxPermissions.member.readPermissions,
    });
  }

  const { members, hasMore, page, limit } = await getMembers({
    args: input,
  });

  const response: IGetMembersEndpointResponse = {
    members,
    hasMore,
    page,
    limit,
  };

  return response;
};
