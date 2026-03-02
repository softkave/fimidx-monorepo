import {
  IUpdateMembersEndpointResponse,
  updateMembersSchema,
} from "fimidx-core/definitions/member";
import { kByTypes } from "fimidx-core/definitions/other";
import { updateMembers } from "fimidx-core/serverHelpers/index";
import { NextClientTokenAuthenticatedEndpointFn } from "../../types";
import { sanitizeUpdateMembersInput } from "../../utils/sanitizeKId0.js";

export const updateMembersEndpoint: NextClientTokenAuthenticatedEndpointFn<
  IUpdateMembersEndpointResponse
> = async (params) => {
  const {
    req,
    session: { clientToken },
  } = params;

  const input = updateMembersSchema.parse(await req.json());
  sanitizeUpdateMembersInput(input);
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
