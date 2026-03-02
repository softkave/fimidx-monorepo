import { deleteMembersSchema, kByTypes } from "fimidx-core/definitions/index";
import { deleteMembers } from "fimidx-core/serverHelpers/index";
import { NextClientTokenAuthenticatedEndpointFn } from "../../types";
import { sanitizeDeleteMembersInput } from "../../utils/sanitizeKId0.js";

export const deleteMemberEndpoint: NextClientTokenAuthenticatedEndpointFn<
  void
> = async (params) => {
  const {
    req,
    session: { clientToken },
  } = params;

  const input = deleteMembersSchema.parse(await req.json());
  sanitizeDeleteMembersInput(input);
  await deleteMembers({
    by: clientToken.id,
    byType: kByTypes.clientToken,
    query: input.query,
    deleteMany: input.deleteMany,
  });
};
