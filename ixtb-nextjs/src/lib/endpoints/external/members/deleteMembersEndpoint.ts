import {
  deleteMembersSchema,
  kByTypes,
  kFimidxPermissions,
} from "fimidx-core/definitions/index";
import { deleteMembers } from "fimidx-core/serverHelpers/index";
import { checkPermissionForClientTokenOrUser } from "../../../serverHelpers/permissions";
import { NextClientTokenAuthenticatedEndpointFn } from "../../types";
import { sanitizeDeleteMembersInput } from "../../utils/sanitizeKId0";

export const deleteMemberEndpoint: NextClientTokenAuthenticatedEndpointFn<
  void
> = async (params) => {
  const {
    req,
    session: { clientToken },
  } = params;

  const input = deleteMembersSchema.parse(await req.json());
  sanitizeDeleteMembersInput(input);

  await checkPermissionForClientTokenOrUser({
    clientToken,
    groupId: input.query.groupId,
    projectId: input.query.projectId,
    action: kFimidxPermissions.member.remove,
  });

  await deleteMembers({
    by: clientToken.id,
    byType: kByTypes.clientToken,
    query: input.query,
    deleteMany: input.deleteMany,
  });
};
