import {
  IUpdateMembersEndpointResponse,
  updateMembersSchema,
} from "fimidx-core/definitions/member";
import { kByTypes } from "fimidx-core/definitions/other";
import { updateMembers } from "fimidx-core/serverHelpers/index";
import { checkPermissionGroupThenProjectThenOrg } from "../../../serverHelpers/permissions";
import { NextClientTokenAuthenticatedEndpointFn } from "../../types";
import { sanitizeUpdateMembersInput } from "../../utils/sanitizeKId0";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";

export const updateMembersEndpoint: NextClientTokenAuthenticatedEndpointFn<
  IUpdateMembersEndpointResponse
> = async (params) => {
  const {
    req,
    session: { clientToken },
  } = params;

  const input = updateMembersSchema.parse(await req.json());
  sanitizeUpdateMembersInput(input);

  await checkPermissionGroupThenProjectThenOrg({
    clientToken,
    groupId: input.query.groupId,
    projectId: input.query.projectId,
    action: kFimidxPermissions.member.mutate,
  });

  await updateMembers({
    args: input,
    by: clientToken.id,
    byType: kByTypes.clientToken,
  });

  const response: IUpdateMembersEndpointResponse = {
    success: true,
  };

  return response;
};
