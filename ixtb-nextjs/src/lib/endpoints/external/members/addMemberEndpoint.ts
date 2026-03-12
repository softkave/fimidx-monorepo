import {
  addMemberSchema,
  IAddMemberEndpointResponse,
  kByTypes,
  kFimidxPermissions,
} from "fimidx-core/definitions/index";
import { addMember } from "fimidx-core/serverHelpers/index";
import { checkPermissionGroupThenProjectThenOrg } from "../../../serverHelpers/permissions";
import { NextClientTokenAuthenticatedEndpointFn } from "../../types";
import { sanitizeAddMemberInput } from "../../utils/sanitizeKId0";

export const addMemberEndpoint: NextClientTokenAuthenticatedEndpointFn<
  IAddMemberEndpointResponse
> = async (params) => {
  const {
    req,
    session: { clientToken },
  } = params;

  const input = addMemberSchema.parse(await req.json());
  sanitizeAddMemberInput(input);

  await checkPermissionGroupThenProjectThenOrg({
    clientToken,
    groupId: input.groupId,
    projectId: input.projectId,
    action: kFimidxPermissions.member.mutate,
  });

  const { member } = await addMember({
    args: input,
    by: clientToken.id,
    byType: kByTypes.clientToken,
  });

  const response: IAddMemberEndpointResponse = {
    member,
  };

  return response;
};
